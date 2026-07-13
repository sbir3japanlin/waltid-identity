#!/usr/bin/env python3
"""
Verifier API Integration — SD-JWT VC Verification Example (Python)

Demonstrates the OID4VP verification flow using the walt.id verifier-api.
The mock wallet generates a valid SD-JWT VC dynamically and presents it
to the verifier — no external wallet or issuer needed.

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
from typing import Any, Dict, List, Union

# ── Crypto imports ──────────────────────────────────────────────────────────
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes


def b64url(data: Union[bytes, str]) -> str:
    """Base64url-encode data (no padding)."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(s: str) -> bytes:
    """Base64url-decode a string (adds padding if needed)."""
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def to_jwk(public_key: ec.EllipticCurvePublicKey) -> Dict[str, str]:
    """Convert an EC public key to JWK format."""
    nums = public_key.public_numbers()
    return {
        "kty": "EC",
        "crv": "P-256",
        "x": b64url(nums.x.to_bytes(32, "big")),
        "y": b64url(nums.y.to_bytes(32, "big")),
    }


def to_jwk_private(key: ec.EllipticCurvePrivateKey) -> Dict[str, str]:
    """Convert an EC private key to JWK format (includes 'd')."""
    pub = to_jwk(key.public_key())
    nums = key.private_numbers()
    pub["d"] = b64url(nums.private_value.to_bytes(32, "big"))
    return pub


def sign_jwt(
    payload: Dict[str, Any], key: ec.EllipticCurvePrivateKey, kid: str
) -> str:
    """Create a compact JWS with ES256 signature."""
    header = json.dumps({"alg": "ES256", "kid": kid, "typ": "vc+sd-jwt"})
    signing_input = f"{b64url(header)}.{b64url(json.dumps(payload))}"
    sig = key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    return f"{signing_input}.{b64url(sig)}"


# ═══════════════════════════════════════════════════════════════════════════════
# Mock Wallet — SD-JWT VC Generation
# ═══════════════════════════════════════════════════════════════════════════════
#
# INTEGRATION POINT:
# In your application, you would replace this class with calls to your wallet.
# Your wallet already holds the user's credentials (SD-JWT VCs issued by your
# issuer) and cryptographic keys. The mock wallet below generates everything
# from scratch so the example runs with zero external dependencies.
#
# The key operations your wallet must perform:
#   1. Parse the OID4VP authorization request URI
#   2. Fetch the Presentation Definition
#   3. Match credentials against the definition's input descriptors
#   4. Create a VP token: select disclosures, build KB-JWT, sign with holder key
#   5. POST the VP token to the verifier's response_uri


class MockWallet:
    """Simulates a wallet for demonstration purposes.

    Generates fresh keys and a valid SD-JWT VC on initialization.
    In a real application, these would come from your wallet's storage.
    """

    def __init__(self):
        # Generate issuer key (in reality, your issuer signs the credential)
        self.issuer_key = ec.generate_private_key(ec.SECP256R1())
        issuer_jwk = to_jwk(self.issuer_key.public_key())
        self.issuer_kid = b64url(hashlib.sha256(
            json.dumps(issuer_jwk).encode()
        ).digest())
        self.issuer_did = f"did:jwk:{b64url(json.dumps(issuer_jwk))}"

        # Generate holder key (your wallet's actual key)
        self.holder_key = ec.generate_private_key(ec.SECP256R1())
        holder_jwk = to_jwk(self.holder_key.public_key())
        self.holder_kid = b64url(hashlib.sha256(
            json.dumps(holder_jwk).encode()
        ).digest())

        # Build the SD-JWT VC
        self._build_credential(holder_jwk)

    def _build_credential(self, holder_jwk: Dict[str, str]):
        """Build an SD-JWT VC with selective disclosure claims."""
        iat = int(time.time())
        exp = iat + 365 * 86400  # 1 year

        # Claims with selective disclosure (sd: true)
        sd_claims = {
            "birthdate": "1940-01-01",
            "family_name": "Doe",
        }

        # Generate disclosures and their hashes
        self.disclosures: List[str] = []
        sd_hashes: List[str] = []
        for name, value in sd_claims.items():
            salt = secrets.token_hex(16)
            disc = json.dumps([salt, name, value])
            self.disclosures.append(disc)
            sd_hashes.append(b64url(hashlib.sha256(disc.encode()).digest()))

        # Sort disclosures (SD-JWT convention for deterministic order)
        self.disclosures.sort()

        # Always-visible claims
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

        # Sign the SD-JWT
        self.sd_jwt_vc = sign_jwt(
            jwt_payload, self.issuer_key, f"{self.issuer_did}#{self.issuer_kid}"
        )
        # Append disclosures
        for d in self.disclosures:
            self.sd_jwt_vc += f"~{b64url(d)}"

    def create_vp_token(self, nonce: str, aud: str) -> str:
        """Create a Verifiable Presentation token.

        Assembles: <SD-JWT>~<disclosure1>~<disclosure2>~...~<KB-JWT>~

        Args:
            nonce: The nonce from the verifier's auth request (replay protection).
            aud: The audience (verifier's client_id).

        Returns:
            A compact SD-JWT VP token string.
        """
        # Compute sd_hash over all disclosed claims
        sd_hash_input = "".join(self.disclosures)
        sd_hash = b64url(hashlib.sha256(sd_hash_input.encode()).digest())

        # Build and sign KB-JWT
        kb_payload = {
            "aud": aud,
            "nonce": nonce,
            "iat": int(time.time()),
            "sd_hash": sd_hash,
        }
        kb_jwt = sign_jwt(kb_payload, self.holder_key, self.holder_kid)

        # Assemble: SD-JWT VC + all disclosures + KB-JWT
        vp_token = self.sd_jwt_vc + kb_jwt + "~"
        return vp_token


# ═══════════════════════════════════════════════════════════════════════════════
# Main Flow
# ═══════════════════════════════════════════════════════════════════════════════

VERIFIER_API = "http://localhost:7003"
VERBOSE = "--verbose" in sys.argv


def log(msg: str):
    """Print a log message."""
    print(f"  → {msg}")


def ok(msg: str):
    """Print a success message."""
    print(f"  ✓ {msg}")


def fail(msg: str):
    """Print a failure message and exit."""
    print(f"  ✗ {msg}")
    sys.exit(1)


def section(title: str):
    """Print a section header."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def main():
    print("SD-JWT VC Verification Example")
    print(f"Verifier API: {VERIFIER_API}")

    # ── Phase A: Create Verification Request ──────────────────────────────────
    section("Phase A: Create Verification Request")

    request_body = {
        "request_credentials": [
            {
                "format": "vc+sd-jwt",
                "input_descriptor": {
                    "id": "identity-credential-request",
                    "format": {"vc+sd-jwt": {}},
                    "constraints": {
                        "fields": [
                            {
                                "path": ["$.birthdate"],
                                "filter": {"type": "string", "pattern": ".*"},
                            },
                            {
                                "path": ["$.given_name"],
                                "filter": {"type": "string", "pattern": ".*"},
                            },
                        ],
                        "limit_disclosure": "required",
                    },
                },
            }
        ],
        "vp_policies": ["signature_sd-jwt-vc"],
        "vc_policies": ["not-before", "expired"],
    }

    req = urllib.request.Request(
        f"{VERIFIER_API}/openid4vc/verify",
        data=json.dumps(request_body).encode(),
        headers={
            "Content-Type": "application/json",
            "authorizeBaseUrl": "openid4vp://authorize",
            "responseMode": "direct_post",
        },
        method="POST",
    )

    with urllib.request.urlopen(req) as resp:
        auth_uri = resp.read().decode()

    log(f"Auth request: {auth_uri[:100]}...")

    # Parse the auth URI
    from urllib.parse import urlparse, parse_qs

    parsed = urlparse(auth_uri)
    params = parse_qs(parsed.query)

    def first(key):
        return params.get(key, [""])[0]

    state = first("state")
    nonce = first("nonce")
    pd_uri = first("presentation_definition_uri")
    response_uri = first("response_uri")
    client_id = first("client_id")

    if not state:
        fail("Could not extract state from auth request")
    ok(f"State: {state}")

    if VERBOSE:
        log(f"Nonce: {nonce}")
        log(f"PD URI: {pd_uri}")
        log(f"Response URI: {response_uri}")
        log(f"Client ID: {client_id}")

    # ── Phase B: Mock Wallet ──────────────────────────────────────────────────
    section("Phase B: Mock Wallet — Fetch PD and Create VP Token")

    # Fetch Presentation Definition
    log(f"Fetching Presentation Definition: {pd_uri}")
    with urllib.request.urlopen(pd_uri) as resp:
        pd = json.loads(resp.read())

    if VERBOSE:
        print(json.dumps(pd, indent=2))

    # Initialize mock wallet and create VP token
    log("Generating mock SD-JWT VC and creating VP token...")
    wallet = MockWallet()
    vp_token = wallet.create_vp_token(nonce, client_id)
    ok(f"VP token created ({len(vp_token)} chars)")

    # POST VP token to verifier (form-encoded per OID4VP direct_post spec)
    log(f"Posting VP token to: {response_uri}")
    import urllib.parse as urlparse
    import secrets as rand
    pd_id = pd.get("id", "")
    input_desc_id = pd.get("input_descriptors", [{}])[0].get("id", "")
    presentation_submission = json.dumps({
        "id": f"ps-{rand.token_hex(8)}",
        "definition_id": pd_id,
        "descriptor_map": [{
            "id": input_desc_id,
            "format": "vc+sd-jwt",
            "path": "$",
        }],
    })
    vp_body = urlparse.urlencode({
        "vp_token": vp_token,
        "presentation_submission": presentation_submission,
        "state": state,
    }).encode()

    req = urllib.request.Request(
        response_uri,
        data=vp_body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        post_result = resp.read().decode()

    if VERBOSE:
        print(f"Response: {post_result}")
    ok("VP token submitted")

    # ── Phase C: Poll Verification Result ─────────────────────────────────────
    section("Phase C: Poll Verification Result")

    session_url = f"{VERIFIER_API}/openid4vc/session/{state}"
    log(f"Checking session: {session_url}")

    with urllib.request.urlopen(session_url) as resp:
        result = json.loads(resp.read())

    print(json.dumps(result, indent=2))

    verify_result = result.get("verificationResult")
    if verify_result == "true":
        ok("Verification SUCCESS")
    else:
        fail(f"Verification failed: {verify_result}")

    # ── Integration Notes ────────────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print("Integration Notes:")
    print(f"  Issuer DID: {wallet.issuer_did}")
    print(f"  VCT: http://localhost:7002/identity_credential")
    print(f"  Holder key type: EC P-256 (secp256r1)")
    print(f"  Credential format: vc+sd-jwt")
    print(f"{'─' * 60}")

    if VERBOSE:
        print("\nMock Wallet Details:")
        print(f"  Issuer key JWK: {json.dumps(to_jwk(wallet.issuer_key.public_key()))}")
        print(f"  Holder key JWK: {json.dumps(to_jwk(wallet.holder_key.public_key()))}")
        print(f"  SD-JWT VC token ({len(wallet.sd_jwt_vc)} chars)")
        print(f"  Disclosures: {len(wallet.disclosures)}")
        for disc in wallet.disclosures:
            print(f"    {disc}")


if __name__ == "__main__":
    main()
