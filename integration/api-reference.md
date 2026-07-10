# Verifier API Reference

**Base URL:** `http://localhost:7003`

The verifier-api implements the OID4VP (OpenID for Verifiable Presentations) specification.
It creates authorization requests, publishes Presentation Definitions, accepts VP tokens
via direct_post, and evaluates verification policies.

All endpoints are public — no authentication required.

---

## Endpoints

### `POST /openid4vc/verify`

Create an OID4VP authorization request.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/json` |
| `authorizeBaseUrl` | yes | Base URI for the authorization request. Typically `openid4vp://authorize`. |
| `responseMode` | yes | How the wallet returns the VP token. Use `direct_post` for server-to-server flows. |

**Request Body:**

```json
{
  "request_credentials": [
    {
      "format": "vc+sd-jwt",
      "input_descriptor": {
        "id": "unique-request-id",
        "format": { "vc+sd-jwt": {} },
        "constraints": {
          "fields": [
            {
              "path": ["$.claim_name"],
              "filter": { "type": "string", "pattern": ".*" }
            }
          ],
          "limit_disclosure": "required"
        }
      }
    }
  ],
  "vp_policies": ["signature_sd-jwt-vc"],
  "vc_policies": ["not-before", "expired"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `request_credentials` | array | One or more credential request objects, each with `format` and `input_descriptor`. |
| `request_credentials[].format` | string | Credential format. Use `"vc+sd-jwt"` for SD-JWT VCs, `"jwt_vc_json"` for W3C JWT VCs, `"mso_mdoc"` for ISO 18013-5 mDL. |
| `request_credentials[].input_descriptor` | object | PE 2.0 Input Descriptor specifying which claims are requested. |
| `input_descriptor.id` | string | Unique identifier for this input descriptor. |
| `input_descriptor.constraints.fields` | array | Array of field constraints using JSONPath selectors. |
| `input_descriptor.constraints.fields[].path` | array | JSONPath expressions pointing to claims in the credential (e.g. `["$.birthdate"]`). |
| `input_descriptor.constraints.fields[].filter` | object | Optional filter. `{"type": "string", "pattern": ".*"}` matches any string value. |
| `input_descriptor.constraints.limit_disclosure` | string | `"required"` tells the wallet to only disclose requested fields (privacy-preserving). |
| `vp_policies` | array | Policies evaluated against the Verifiable Presentation. |
| `vc_policies` | array | Policies evaluated against each Verifiable Credential. |

**Response:**

An `openid4vp://` URI with query parameters:

```
openid4vp://authorize?response_type=vp_token
  &client_id=http%3A%2F%2Flocalhost%3A7003%2Fopenid4vc%2Fverify
  &response_uri=http%3A%2F%2Flocalhost%3A7003%2Fopenid4vc%2Fverify%2Fresponse
  &presentation_definition_uri=http%3A%2F%2Flocalhost%3A7003%2Fopenid4vc%2Fpd%2F<pd-id>
  &state=<session-state>
  &nonce=<nonce>
  &response_mode=direct_post
```

| Parameter | Description |
|-----------|-------------|
| `state` | Session identifier. Use this to poll for the verification result. |
| `nonce` | Replay protection nonce. Must be included in the KB-JWT. |
| `presentation_definition_uri` | URI to fetch the Presentation Definition. |
| `response_uri` | URI where the wallet POSTs the VP token. |
| `client_id` | The verifier's identifier. Used as `aud` in the KB-JWT. |

---

### `GET /openid4vc/pd/{id}`

Fetch a Presentation Definition.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| `id` | The presentation definition ID from the auth request URI (path segment after `/openid4vc/pd/`). |

**Response:**

```json
{
  "id": "abc123",
  "input_descriptors": [
    {
      "id": "identity-credential-request",
      "format": { "vc+sd-jwt": {} },
      "constraints": {
        "fields": [
          { "path": ["$.birthdate"], "filter": { "type": "string", "pattern": ".*" } },
          { "path": ["$.given_name"], "filter": { "type": "string", "pattern": ".*" } }
        ],
        "limit_disclosure": "required"
      }
    }
  ]
}
```

This is a Presentation Exchange 2.0 Presentation Definition. Your wallet must:
1. Match stored credentials against each `input_descriptor`
2. Select the disclosures for requested fields
3. Assemble a VP token with only the required claims

---

### `POST /openid4vc/verify/response`

Submit a VP token to the verifier (the `direct_post` response endpoint).

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/json` |

**Request Body:**

```json
{
  "vp_token": "<sd-jwt-vc>~<disclosure1>~<disclosure2>~<kb-jwt>~",
  "state": "<session-state>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vp_token` | string | The SD-JWT VP token. For SD-JWT VCs: `<JWT>~<disclosures>~...~<KB-JWT>~` |
| `state` | string | The state parameter from the auth request URI. |

**Response:**

- `200 OK` with optional `{"redirect_uri": "..."}` or empty body.

The verifier associates the VP token with the session and evaluates the configured policies.
No result is returned from this endpoint — poll `GET /openid4vc/session/{state}` for the result.

---

### `GET /openid4vc/session/{state}`

Retrieve the verification session result.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| `state` | The session state token from the auth request URI. |

**Response:**

```json
{
  "id": "<state>",
  "verificationResult": "true",
  "policyResults": {
    "signature_sd-jwt-vc": true,
    "not-before": true,
    "expired": true
  },
  "presentationSubmission": { },
  "vp_token": "<the submitted vp_token>",
  "state": "<state>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `verificationResult` | string | `"true"` if all policies passed. |
| `policyResults` | object | Per-policy results. `true` = passed, `false` = failed. |

**Typical HTTP status codes:**

| Status | Meaning |
|--------|---------|
| `200` | Session found, result available. |
| `404` | Session not found (expired or wrong state). |

---

## Policy Reference

### VP Policies

Evaluated against the Verifiable Presentation as a whole.

| Policy | Description |
|--------|-------------|
| `signature_sd-jwt-vc` | Validates the issuer's ES256 signature on the SD-JWT VC, the SD hash binding (hashes of disclosure arrays match `_sd` in the JWT), and the holder's KB-JWT signature against `cnf.jwk`. |
| `signature_jwt-vc` | Validates the issuer's signature on a JWT VC (plain W3C VC, no selective disclosure). |
| `presentation-definition` | Validates that the Presentation Submission matches the Presentation Definition's input descriptors. |

### VC Policies

Evaluated against each Verifiable Credential individually.

| Policy | Description |
|--------|-------------|
| `not-before` | Asserts `nbf` (not-before) timestamp is in the past. |
| `expired` | Asserts `exp` (expiration) timestamp is in the future. |
| `schema` | Validates the credential against a JSON Schema. Requires a `schema_uri` or inline `schema` in the credential's input descriptor. |

---

## Complete Flow Summary

```
┌──────────┐     ┌───────────────┐     ┌──────────┐
│  Your    │     │  Verifier     │     │  Your    │
│  App     │     │  API          │     │  Wallet  │
└────┬─────┘     └──────┬────────┘     └────┬─────┘
     │                  │                   │
     │ POST /verify     │                   │
     │─────────────────>│                   │
     │                  │                   │
     │ openid4vp:// URI │                   │
     │<─────────────────│                   │
     │                  │                   │
     │ Parse URI, extract state + PD URI    │
     │─────────────────────────────────────>│
     │                  │                   │
     │                  │  GET /pd/{id}     │
     │                  │<──────────────────│
     │                  │                   │
     │                  │  Presentation Def │
     │                  │──────────────────>│
     │                  │                   │
     │                  │  Match creds,     │
     │                  │  create VP token  │
     │                  │                   │
     │                  │  POST /verify/response
     │                  │<──────────────────│
     │                  │                   │
     │ GET /session/{state}                 │
     │─────────────────>│                   │
     │                  │                   │
     │ verificationResult: true             │
     │<─────────────────│                   │
     │                  │                   │
```

---

## Error Handling

The verifier returns standard HTTP error codes:

| Status | Typical Cause |
|--------|---------------|
| `400` | Malformed request body or missing required headers (`authorizeBaseUrl`, `responseMode`). |
| `404` | Session not found or expired. Sessions are in-memory; they are lost on container restart. |
| `500` | Internal policy evaluation error (e.g., invalid VP token structure). |

Error responses include a plain-text or JSON body with details where available.
