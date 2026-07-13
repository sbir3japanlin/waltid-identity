# Verifier API Integration Package

This package helps you integrate the walt.id **verifier-api** into your own
wallet/issuer ecosystem. It provides a standalone Docker deployment, a complete
API reference, and runnable example scripts that demonstrate SD-JWT VC
verification end-to-end.

## What's Included

| File | Purpose |
|------|---------|
| `docker-compose.yaml` | Standalone verifier-api deployment (single container, no dependencies) |
| `config/` | Verifier configuration files |
| `api-reference.md` | Complete API reference with request/response schemas |
| `examples/python/verify_sd_jwt.py` | Python script: full OID4VP verification flow with mock wallet |
| `examples/python/verifier_client.py` | Reusable Python client library for the verifier API |
| `examples/readme.md` | Detailed walkthrough, parameter reference, and integration guide |
| `scripts/start-verifier.sh` | One-command startup with health check |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Python 3.9+ with `cryptography`

```bash
pip install cryptography
```

## Quick Start

```bash
# 1. Start the verifier
bash scripts/start-verifier.sh

# 2. Run the example
python3 examples/python/verify_sd_jwt.py
```

If everything works, you'll see `Verification SUCCESS` at the end.

## How It Works

The example scripts simulate a complete OID4VP verification flow:

1. **Your app** creates a verification request via `POST /openid4vc/verify`
2. The verifier returns an `openid4vp://` URI with session state
3. **Your wallet** (mock wallet in the examples) parses the URI, fetches the
   Presentation Definition, matches credentials, creates a VP token with
   selective disclosures, and posts it to the verifier's `response_uri`
4. **Your app** polls `GET /openid4vc/session/{state}` for the result

The mock wallet generates a valid SD-JWT VC on the fly, so no external
wallet or issuer is needed.

## Integrating Into Your Own Ecosystem

### You Have

- A wallet that holds SD-JWT VCs issued by your issuer
- An issuer that creates SD-JWT VCs with selective disclosure
- The need to verify those credentials

### What You Add

The verifier-api as a standalone service. It is stateless — no database,
no persistence. Just the Docker container.

### Integration Steps

**1. Point the verifier at your wallet/issuer:**
Edit `config/verifier-service.conf` — set `baseUrl` to the verifier's
externally reachable URL if your wallet runs inside Docker.

**2. Create verification requests using the API:**
Use `POST /openid4vc/verify` as shown in the examples. Customize the
`request_credentials`, `vp_policies`, and `vc_policies` to match your
credential types and requirements.

**3. In your wallet, handle the OID4VP flow:**
Replace the `MockWallet` class with calls to your actual wallet. Your wallet must:
- Parse the `openid4vp://` URI
- Fetch the Presentation Definition
- Match credentials against the input descriptors
- Create the VP token with selective disclosures
- Post the VP token to the `response_uri`

**4. Poll for results:**
After submitting the VP token, call `GET /openid4vc/session/{state}` to
retrieve the verification result.

### Key Integration Points in the Code

**Python (`verifier_client.py`):**
```python
from verifier_client import VerifierClient

client = VerifierClient("http://localhost:7003")

# Create request
auth = client.create_verification_request(
    credentials=[...],
    vp_policies=["signature_sd-jwt-vc"],
    vc_policies=["not-before", "expired"]
)

# Your wallet processes auth.state, auth.nonce, auth.presentation_definition_uri
# Your wallet posts VP token to auth.response_uri

# Check result
result = client.get_session(auth.state)
print(result.verification_result)  # True or False
```

## Configuration

The verifier has minimal configuration. All files live in `config/`:

| File | Purpose |
|------|---------|
| `verifier-service.conf` | Sets `baseUrl` — the externally reachable URL of the verifier |
| `web.conf` | Sets `webHost` and `webPort` — always `0.0.0.0:7003` |
| `_features.conf` | Enables `dev-mode` for DID:JWK resolution without HTTPS |
| `dev-mode.conf` | Disables HTTPS requirement for DID:web resolution |

## Stopping the Verifier

```bash
docker compose down
```

## Troubleshooting

**Port 7003 already in use:**
```bash
# Find what's using the port
lsof -i :7003
# Edit docker-compose.yaml and config/web.conf to use a different port
```

**Verification fails:**
- Check the verifier logs: `docker compose logs verifier-api`
- Ensure your SD-JWT VC uses ES256 (P-256) — other algorithms are not supported by default
- The `vct` (Verifiable Credential Type) must match the issuer's metadata

**"Module not found: cryptography":**
```bash
pip install cryptography
```

**Docker image not found:**
```bash
docker pull waltid/verifier-api:stable
```
