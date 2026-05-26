#!/usr/bin/env python3
"""Walt.id Identity Stack — Local Demo UI Server

Starts HTTP servers on ports 8001 (wallet), 8002 (issuer), 8003 (verifier).
Proxies /proxy/<wallet|issuer|verifier>/<path> to the Docker services on 7001-7003.

Usage: python3 server.py
"""
import json
import os
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PAGES = {8001: "wallet.html", 8002: "issuer.html", 8003: "verifier.html"}

BACKENDS = {
    "wallet":   "http://localhost:7001/wallet-api",
    "issuer":   "http://localhost:7002",
    "verifier": "http://localhost:7003",
}

_PASSTHROUGH = frozenset([
    "content-type", "authorization", "accept",
    "authorizebaseurl", "responsemode", "openid4vpprofile",
])


class DemoHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        port = self.server.server_address[1]
        print(f"[:{port}] {fmt % args}", flush=True)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, authorization, accept, "
            "authorizeBaseUrl, responseMode, openId4VPProfile",
        )

    def _dispatch(self, method):
        port = self.server.server_address[1]
        if self.path.startswith("/proxy/"):
            self._proxy(method)
            return
        path = self.path.split("?")[0]
        if path in ("/", ""):
            filepath = os.path.join(BASE_DIR, PAGES[port])
        else:
            filepath = os.path.join(BASE_DIR, path.lstrip("/"))
        if os.path.isfile(filepath):
            ext = os.path.splitext(filepath)[1].lower()
            ct = {
                ".html": "text/html; charset=utf-8",
                ".js":   "application/javascript",
                ".css":  "text/css",
                ".json": "application/json",
            }.get(ext, "application/octet-stream")
            with open(filepath, "rb") as fh:
                data = fh.read()
            self.send_response(200)
            self.send_header("Content-Type", ct)
            self.send_header("Content-Length", str(len(data)))
            self._cors()
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def _proxy(self, method):
        # /proxy/<service>[/<sub_path>][?query]
        tail = self.path[len("/proxy/"):]
        parts = tail.split("/", 1)
        service = parts[0]
        sub = parts[1] if len(parts) > 1 else ""

        backend = BACKENDS.get(service)
        if not backend:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"unknown service"}')
            return

        target = f"{backend}/{sub}" if sub else backend
        print(f"  \u2192 {method} {target}", flush=True)

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else None

        fwd = {k: v for k, v in self.headers.items() if k.lower() in _PASSTHROUGH}

        try:
            req = urllib.request.Request(target, data=body, headers=fwd, method=method)
            with urllib.request.urlopen(req, timeout=30) as resp:
                rb = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "connection", "content-encoding"):
                        self.send_header(k, v)
                self._cors()
                self.end_headers()
                self.wfile.write(rb)
        except urllib.error.HTTPError as exc:
            rb = exc.read()
            self.send_response(exc.code)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(rb)
        except Exception as exc:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode())


def _serve(port: int):
    server = HTTPServer(("", port), DemoHandler)
    print(f"  Serving http://localhost:{port}  [{PAGES[port]}]", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    print("Walt.id Demo UI Servers", flush=True)
    for p in (8001, 8002, 8003):
        threading.Thread(target=_serve, args=(p,), daemon=True).start()
    print("\n  Wallet:   http://localhost:8001")
    print("  Issuer:   http://localhost:8002")
    print("  Verifier: http://localhost:8003")
    print("\n  Backend APIs: Wallet=:7001  Issuer=:7002  Verifier=:7003")
    print("  Press Ctrl+C to stop.\n")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("Stopped.")
