# Troubleshooting

## VP Token Submission: 400 Bad Request

### Symptom

Both example scripts (`examples/bash/verify-sd-jwt.sh` and `examples/python/verify_sd_jwt.py`) fail when POSTing the VP token to the verifier's response endpoint:

```json
{
  "exception": true,
  "id": "BadRequestException",
  "status": "Bad Request",
  "code": "400",
  "message": "Failed to convert request body to class io.ktor.http.Parameters",
  "cause1_exception": "SerializationException"
}
```

### Root Cause

The examples send the VP token with `Content-Type: application/json`, but the verifier's OID4VP direct_post response endpoint expects `Content-Type: application/x-www-form-urlencoded` (form-encoded parameters).

The verifier is built with Ktor, and its `receive<Parameters>()` call deserializes form-encoded data. When JSON arrives instead, Ktor throws a `SerializationException` because it cannot parse JSON as `Parameters`.

This is a standard OID4VP `direct_post` convention — the wallet posts the VP token as an HTML form submission, not as a JSON API call.

### Where the Error Occurs

**Bash** (`examples/bash/verify-sd-jwt.sh`, line ~244):
```bash
VP_RESPONSE=$(curl -s -X POST "$RESPONSE_URI" \
  -H 'Content-Type: application/json' \
  -d "{\"vp_token\": \"$VP_TOKEN\", \"state\": \"$AUTH_STATE\"}")
```

**Python** (`examples/python/verify_sd_jwt.py`, line ~332):
```python
vp_body = json.dumps({"vp_token": vp_token, "state": state}).encode()
req = urllib.request.Request(
    response_uri,
    data=vp_body,
    headers={"Content-Type": "application/json"},
    method="POST",
)
```

### Fix

Send the VP token as form-encoded data instead of JSON.

**Bash fix** — remove the `Content-Type: application/json` header and use `--data-urlencode`:
```bash
VP_RESPONSE=$(curl -s -X POST "$RESPONSE_URI" \
  --data-urlencode "vp_token=$VP_TOKEN" \
  --data-urlencode "state=$AUTH_STATE")
```

**Python fix** — use `urllib.parse.urlencode` and set the correct content type:
```python
import urllib.parse

form_data = urllib.parse.urlencode({
    "vp_token": vp_token,
    "state": state,
}).encode()

req = urllib.request.Request(
    response_uri,
    data=form_data,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST",
)
```

### Verifying the Fix

After applying the fix, re-run the example:

```bash
# Start the verifier
bash scripts/start-verifier.sh

# Run the example
bash examples/bash/verify-sd-jwt.sh
```

If successful, you will see `Verification SUCCESS` at the end of the output.
