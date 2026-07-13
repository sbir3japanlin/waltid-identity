#!/usr/bin/env python3
"""
Verifier API Integration -- SD-JWT VC Verification Example (Python)

Demonstrates the OID4VP verification flow using the walt.id verifier-api2
with DCQL (Digital Credentials Query Language). The mock wallet generates
a valid SD-JWT VC dynamically and presents it to the verifier -- no
external wallet or issuer needed.

Prerequisites:
    pip install cryptography
    bash scripts/start-verifier.sh

Usage:
    python3 verify_sd_jwt.py [--verbose]
"""

import sys
import json
import time
import hashlib
import base64
import secrets
import urllib.request
import urllib.parse
from typing import Any, Dict, List, Union

# -- Crypto imports --
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes


def b64url(data: Union[bytes, str]) -> str:
    """Base64url-encode data (no padding)."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def der_to_raw_ecdsa(der_sig: bytes, key_size_bytes: int = 32) -> bytes:
    """Convert DER-encoded ECDSA signature to raw r||s format."""
    # DER: 0x30 <len> 0x02 <r_len> <r> 0x02 <s_len> <s>
    # Skip 0x30, total_len
    r_len = der_sig[3]
    r = der_sig[4:4 + r_len]
    s_len = der_sig[4 + r_len + 1]  # +1 to skip 0x02
    s = der_sig[4 + r_len + 2:4 + r_len + 2 + s_len]
    # Ensure r and s are exactly key_size_bytes (pad with leading zeros)
    r = r.rjust(key_size_bytes, b'\x00') if len(r) < key_size_bytes else r[-key_size_bytes:]
    s = s.rjust(key_size_bytes, b'\x00') if len(s) < key_size_bytes else s[-key_size_bytes:]
    return r + s


def sign_jwt(
    payload: Dict[str, Any], key: ec.EllipticCurvePrivateKey, kid: str = None,
    typ: str = "vc+sd-jwt"
) -> str:
    """Create a compact JWS with ES256 signature."""
    header_dict: Dict[str, str] = {"alg": "ES256", "typ": typ}
    if kid:
        header_dict["kid"] = kid
    header = json.dumps(header_dict, separators=(",", ":"))
    payload_str = json.dumps(payload, separators=(",", ":"))
    signing_input = f"{b64url(header)}.{b64url(payload_str)}"
    der_sig = key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    raw_sig = der_to_raw_ecdsa(der_sig)
    return f"{signing_input}.{b64url(raw_sig)}"


def to_jwk(public_key: ec.EllipticCurvePublicKey) -> Dict[str, str]:
    """Convert an EC public key to JWK format."""
    nums = public_key.public_numbers()
    return {
        "kty": "EC",
        "crv": "P-256",
        "x": b64url(nums.x.to_bytes(32, "big")),
        "y": b64url(nums.y.to_bytes(32, "big")),
    }


# ===========================================================================
# Mock Wallet -- SD-JWT VC Generation
# ===========================================================================
#
# INTEGRATION POINT:
# In your application, replace this class with calls to your wallet.
# Your wallet already holds the user's credentials (SD-JWT VCs) and keys.
# The mock wallet generates everything from scratch so the example runs
# with zero external dependencies.


class MockWallet:
    """Simulates a wallet for demonstration purposes."""

    def __init__(self):
        # Issuer key
        self.issuer_key = ec.generate_private_key(ec.SECP256R1())
        issuer_jwk = to_jwk(self.issuer_key.public_key())
        self.issuer_kid = b64url(hashlib.sha256(
            json.dumps(issuer_jwk).encode()
        ).digest())
        self.issuer_did = f"did:jwk:{b64url(json.dumps(issuer_jwk))}"

        # Holder key
        self.holder_key = ec.generate_private_key(ec.SECP256R1())
        holder_jwk = to_jwk(self.holder_key.public_key())
        self.holder_kid = b64url(hashlib.sha256(
            json.dumps(holder_jwk).encode()
        ).digest())

        self._build_credential(holder_jwk)

    def _build_credential(self, holder_jwk: Dict[str, str]):
        """Build an SD-JWT VC with selective disclosure claims."""
        iat = int(time.time())
        exp = iat + 365 * 86400

        sd_claims = {
            "birthdate": "1940-01-01",
            "family_name": "Doe",
        }

        self.disclosures: List[str] = []
        sd_hashes: List[str] = []
        for name, value in sd_claims.items():
            salt = secrets.token_hex(16)
            disc = json.dumps([salt, name, value])
            disc_b64 = b64url(disc)
            self.disclosures.append(disc)
            sd_hashes.append(b64url(hashlib.sha256(disc_b64.encode()).digest()))

        self.disclosures.sort()

        jwt_payload = {
            "given_name": "John",
            "email": "johndoe@example.com",
            "phone_number": "+1-202-555-0101",
            "address": {
                "street_address": "123 Main St",
                "locality": "Anytown",
                "region": "Anystate",
                "country": "US",
            },
            "is_over_18": True,
            "is_over_21": True,
            "is_over_65": True,
            "id": f"urn:uuid:{secrets.token_hex(16)}",
            "iat": iat,
            "nbf": iat,
            "exp": exp,
            "_sd_alg": "sha-256",
            "iss": self.issuer_did,
            "cnf": {"jwk": holder_jwk},
            "vct": "http://localhost:7002/identity_credential",
            "_sd": sd_hashes,
        }

        self.sd_jwt_vc = sign_jwt(
            jwt_payload, self.issuer_key, f"{self.issuer_did}#{self.issuer_kid}"
        )
        # Append disclosures: SD-JWT = <JWT>~<disc1>~<disc2>
        for d in self.disclosures:
            self.sd_jwt_vc += f"~{b64url(d)}"

    def create_vp_token(self, nonce: str, aud: str, query_id: str = "pid") -> Dict[str, List[str]]:
        """Create a VP token as a DCQL vp_token map.

        Returns: {query_id: ["<SD-JWT>~<KB-JWT>"]}
        """
        # sd_hash: SHA-256 of the SD-JWT part (without KB-JWT) ending with ~
        # Format: <JWT>~<b64url(disc1)>~<b64url(disc2)>~
        disclosed = self.sd_jwt_vc + "~"
        sd_hash = b64url(hashlib.sha256(disclosed.encode()).digest())

        kb_payload = {
            "aud": aud,
            "nonce": nonce,
            "iat": int(time.time()),
            "sd_hash": sd_hash,
        }
        kb_jwt = sign_jwt(kb_payload, self.holder_key, typ="kb+jwt")

        # VP token = <SD-JWT-VC>~<KB-JWT>
        # Elements separated by ~: JWT~disc1~disc2~KB-JWT
        vp_token_credential = self.sd_jwt_vc + "~" + kb_jwt

        return {query_id: [vp_token_credential]}


# ===========================================================================
# Main Flow
# ===========================================================================

VERIFIER_API = "http://localhost:7003"
VERBOSE = "--verbose" in sys.argv


def log(msg: str):
    print(f"  -> {msg}")


def ok(msg: str):
    print(f"  OK {msg}")


def fail(msg: str):
    print(f"  FAIL {msg}")
    sys.exit(1)


def section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def http_post_json(url: str, body: dict, headers: dict = None) -> dict:
    """POST JSON and return parsed JSON response."""
    all_headers = {"Content-Type": "application/json"}
    if headers:
        all_headers.update(headers)
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=all_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def http_get_json(url: str) -> dict:
    """GET and return parsed JSON response."""
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())


def main():
    print("SD-JWT VC Verification Example (verifier-api2 / DCQL)")
    print(f"Verifier API: {VERIFIER_API}")

    # -- Phase A: Create Verification Session --
    section("Phase A: Create Verification Session")

    create_body = {
        "flow_type": "cross_device",
        "core_flow": {
            "dcql_query": {
                "credentials": [
                    {
                        "id": "pid",
                        "format": "dc+sd-jwt",
                        "meta": {
                            "vct_values": ["http://localhost:7002/identity_credential"]
                        },
                        "claims": [
                            {"path": ["given_name"]},
                            {"path": ["birthdate"]},
                        ],
                    }
                ]
            },
        },
        "url_config": {},
        "redirects": {},
    }

    create_resp = http_post_json(f"{VERIFIER_API}/verification-session/create", create_body)
    session_id = create_resp["sessionId"]
    auth_url = create_resp["fullAuthorizationRequestUrl"]
    log(f"Session ID: {session_id}")
    log(f"Auth URL: {auth_url[:100]}...")

    # Parse auth URL
    parsed = urllib.parse.urlparse(auth_url)
    params = urllib.parse.parse_qs(parsed.query)

    def first(key):
        return params.get(key, [""])[0]

    state = first("state")
    nonce = first("nonce")
    response_uri = first("response_uri")
    client_id = first("client_id")

    if not state:
        fail("Could not extract state from auth request")

    # Rewrite response_uri to match VERIFIER_API host/port (container uses its
    # internal port; the host may access it on a different port)
    api_parsed = urllib.parse.urlparse(VERIFIER_API)
    resp_parsed = urllib.parse.urlparse(response_uri)
    response_uri = urllib.parse.urlunparse(
        (resp_parsed.scheme, api_parsed.netloc, resp_parsed.path, "", "", "")
    )

    ok(f"State: {state}")

    if VERBOSE:
        log(f"Nonce: {nonce}")
        log(f"Response URI: {response_uri}")
        log(f"Client ID: {client_id}")

    # -- Phase B: Mock Wallet --
    section("Phase B: Mock Wallet -- Create and Submit VP Token")

    log("Generating mock SD-JWT VC and creating VP token...")
    wallet = MockWallet()
    vp_token_map = wallet.create_vp_token(nonce, client_id, query_id="pid")
    vp_token_json = json.dumps(vp_token_map)
    ok(f"VP token created ({len(vp_token_json)} chars)")

    if VERBOSE:
        log(f"VP token keys: {list(vp_token_map.keys())}")
        log(f"VP token credential count: {len(vp_token_map['pid'])}")

    # Submit VP token (form-encoded per OID4VP direct_post)
    log(f"Posting VP token to: {response_uri}")
    form_data = urllib.parse.urlencode({
        "vp_token": vp_token_json,
        "state": state,
    }).encode()

    req = urllib.request.Request(
        response_uri,
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            submit_result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        try:
            error_json = json.loads(error_body)
            fail(f"VP token submission failed: {error_json.get('error_description', error_body)}")
        except json.JSONDecodeError:
            fail(f"VP token submission failed (HTTP {e.code}): {error_body[:500]}")

    if VERBOSE:
        log(f"Submit response: {json.dumps(submit_result)}")
    ok("VP token submitted")

    # -- Phase C: Poll Verification Result --
    section("Phase C: Poll Verification Result")

    info_url = f"{VERIFIER_API}/verification-session/{session_id}/info"
    log(f"Checking session: {info_url}")

    result = http_get_json(info_url)
    print(json.dumps(result, indent=2))

    status = result.get("status", "")
    if status == "SUCCESSFUL":
        ok("Verification SUCCESS")
    else:
        failure = result.get("failure", {})
        reason = failure.get("reason", status) if failure else status
        fail(f"Verification failed: {reason}")

    # -- Integration Notes --
    print(f"\n{'--' * 30}")
    print("Integration Notes:")
    print(f"  Issuer DID: {wallet.issuer_did}")
    print(f"  VCT: http://localhost:7002/identity_credential")
    print(f"  Holder key type: EC P-256 (secp256r1)")
    print(f"  Credential format: dc+sd-jwt (SD-JWT VC)")
    print(f"  Query format: DCQL")
    print(f"{'--' * 30}")


if __name__ == "__main__":
    main()
