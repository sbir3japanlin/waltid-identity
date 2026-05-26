# Selective Disclosure: SD-JWT VC vs ISO mDoc

The two flows use fundamentally different mechanisms to achieve the same goal — letting the holder reveal only specific fields to a verifier, without exposing the full credential.

---

## SD-JWT VC (IETF)

### How it works

Selective disclosure in SD-JWT is built on **hash commitments**. At issuance time, the issuer:
1. Takes each "hideable" field value and wraps it with a random salt into a **disclosure** — a small JSON array
2. Computes `SHA-256(base64url(disclosure))` to get a **hash**
3. Puts the hashes in `_sd` inside the JWT body; the raw values are **not** in the JWT
4. Appends all disclosures after the JWT, separated by `~`

The wallet stores both the JWT and its disclosures. At presentation time, it sends only the disclosures the verifier asked for.

### Issuance config (Step 7 in the script)

```json
"selectiveDisclosure": {
  "fields": {
    "birthdate":   { "sd": true  },
    "family_name": { "sd": true  },
    "given_name":  { "sd": false }
  }
}
```

`sd: true` — value is hashed and hidden in the JWT. `sd: false` — value is always in the JWT plaintext.

### What gets stored in the wallet (Step 10 — actual log data)

The `parsedDocument` from the actual run shows the JWT payload:

```json
{
  "given_name": "John",
  "email": "johndoe@example.com",
  "phone_number": "+1-202-555-0101",
  "address": { "...": "..." },
  "is_over_18": true,
  "_sd_alg": "sha-256",
  "_sd": [
    "YKWcu0W1PH0lPLNIF_tS7kKXr6XzzGfQoJjLj1ng4IQ",
    "059IN__55C3bI6X3IzHMJLFManjVP3OGXz-Mk7nUJUs"
  ]
}
```

- `given_name` is **plaintext** — always visible, `sd: false`
- `family_name` and `birthdate` are **not present** — replaced by their SHA-256 hashes in `_sd`

The `disclosures` appendix (stored with the credential, `~`-separated):

```
WyJ1cGJWcU1SeXlGSk4yLWQ2eTlkWDZBIiwiZmFtaWx5X25hbWUiLCJEb2UiXQ
~
WyI3a2FzcmRzRkgzcWwzYkJvTFAzZHdRIiwiYmlydGhkYXRlIiwiMTk0MC0wMS0wMSJd
```

Each part is a **base64url-encoded JSON array** `[salt, claim_name, claim_value]`:

| Disclosure (base64url decoded) | Field | Value |
|---|---|---|
| `["upbVqMRyyFJN2-d6y9dX6A", "family_name", "Doe"]` | `family_name` | `Doe` |
| `["7kasrdsRH3ql3bBoLP3dwQ", "birthdate", "1940-01-01"]` | `birthdate` | `1940-01-01` |

The SHA-256 of the base64url-encoded form of each array is what appears in `_sd`.

### What the verifier requests (Step 11)

```json
"constraints": {
  "fields": [
    { "path": ["$.birthdate"] },
    { "path": ["$.given_name"] }
  ],
  "limit_disclosure": "required"
}
```

`limit_disclosure: "required"` instructs the wallet to include **only** the requested fields — it must not send any extra disclosures.

### What gets sent in the presentation (Step 14)

The wallet sends the JWT unchanged plus **only** the `birthdate` disclosure — the `family_name` disclosure is dropped entirely:

```
<JWT>.<sig>~WyI3a2FzcmRzRkgzcWwzYkJvTFAzZHdRIiwiYmlydGhkYXRlIiwiMTk0MC0wMS0wMSJd~<KB-JWT>
```

The verifier proves `birthdate = "1940-01-01"` by:
1. Decoding the disclosure → `["7kasrdsRH3ql3bBoLP3dwQ","birthdate","1940-01-01"]`
2. Computing SHA-256 of the base64url of that array
3. Checking the result matches one of the `_sd` hashes in the JWT
4. Verifying the issuer's ES256 signature on the JWT

`family_name = "Doe"` is never revealed — its hash stays in `_sd` with no matching disclosure sent.

---

## ISO mDoc (ISO/IEC 18013-5)

### How it works

mDoc uses **digest map + random salt per element**, all packaged in CBOR. At issuance time, the issuer:
1. For each data element, generates a **16-byte random salt**
2. Computes `SHA-256(CBOR(digestID, random, element_identifier, element_value))` → a **digestID-to-hash mapping** stored in the **MSO (Mobile Security Object)**
3. The MSO is signed by the Document Signer certificate (X.509 chain)
4. The actual element data (identifier + value + salt + digestID) is stored in `issuerSigned.nameSpaces`, each as a CBOR-tagged struct

### What gets stored in the wallet (Step 8 — actual log data)

From `parsedDocument.issuerSigned.nameSpaces["org.iso.18013.5.1"]`:

```json
[
  {
    "digestID": 0,
    "random": [-32, -101, 99, -34, -64, 90, 57, 29, 9, 73, 117, 66, 37, -59, 64, 103],
    "elementIdentifier": "family_name",
    "elementValue": "Doe"
  },
  {
    "digestID": 1,
    "random": [122, -111, -36, -8, 45, -41, 102, -32, 24, 65, 54, 101, 92, 80, 10, 43],
    "elementIdentifier": "given_name",
    "elementValue": "John"
  },
  {
    "digestID": 2,
    "random": [40, -123, 120, -27, -58, -114, -22, 41, -10, -49, -24, -104, 45, -46, -87, -71],
    "elementIdentifier": "birth_date",
    "elementValue": "1986-03-22"
  },
  {
    "digestID": 3,
    "random": [-11, 0, -25, 60, -8, 88, 123, 55, 102, 66, 27, 17, 28, 23, 78, 18],
    "elementIdentifier": "issue_date",
    "elementValue": "2019-10-20"
  },
  {
    "digestID": 4,
    "random": [15, -17, -95, -25, -115, 119, 13, 1, 101, 6, 75, 19, 99, 163, -9, 11],
    "elementIdentifier": "expiry_date",
    "elementValue": "2030-10-20"
  },
  {
    "digestID": 5,
    "elementIdentifier": "issuing_country",
    "elementValue": "US"
  },
  {
    "digestID": 6,
    "elementIdentifier": "issuing_authority",
    "elementValue": "US DMV"
  },
  {
    "digestID": 7,
    "elementIdentifier": "document_number",
    "elementValue": "123456789"
  }
]
```

The MSO `valueDigests` section maps each `digestID` → SHA-256 hash (from the actual log):

```json
"valueDigests": {
  "org.iso.18013.5.1": {
    "0": "04ce048cf575851e5efeab0cbcbad1a91cad0e412b98eabb2bb8b0c8fcb7dbb8",
    "1": "a6045efc8baebc8dabb45ace45d412075db530537188717ccda9eae4230fb3f4",
    "2": "8b4529f2bfbcf3dc705b22dc9da4e7c107f62fe7bbbfda50248e13ee1e7e2525",
    "3": "9b95272cd371d1956a61e8097df59b3ca954425a012f14cefb2fb99945b4c7ee",
    "4": "171cec89f1080c0a8480c9bbe0cda3380251f6af0f2b6c917a42da340c71417",
    "5": "b50539c2debb3559113770dc982e5821486ac2476fd1cf433788d73e721ff64d",
    "6": "eb40f55d33eb33c9742e79beb4c700f5d8c58aa5dad1c0978660ddd73eba8c08",
    "7": "6dcc2d586eb5d1f5cea09be65cb63a669bf2eaa60ead0002cc9fa2a373be1ef3"
  }
}
```

### What the verifier requests (Step 9)

The verifier uses namespace-qualified JSONPath inside the `presentation_definition`:

```json
"fields": [
  { "path": ["$['org.iso.18013.5.1']['family_name']"] },
  { "path": ["$['org.iso.18013.5.1']['given_name']"] },
  { "path": ["$['org.iso.18013.5.1']['birth_date']"] },
  { "path": ["$['org.iso.18013.5.1']['document_number']"] }
]
```

The namespace prefix `org.iso.18013.5.1` is mandatory — all mDL fields live under it.

### What gets sent in the presentation (Step 12)

The wallet sends a **DeviceResponse** in CBOR containing only the requested elements from `issuerSigned.nameSpaces`. Elements not requested are simply omitted from the CBOR structure — their plaintext values are never sent; only their hashes exist in the MSO.

The verifier proves each revealed field by:
1. Taking the element's CBOR-encoded struct (digestID + random + identifier + value)
2. Computing SHA-256 of it
3. Checking it matches the corresponding digest in `MSO.valueDigests[namespace][digestID]`
4. Verifying the Document Signer's ES256 signature on the MSO, and the X.509 chain up to the IACA root

---

## Side-by-side comparison

| | SD-JWT VC | ISO mDoc |
|---|---|---|
| **Hiding mechanism** | Hash of `[salt, field_name, field_value]` → put hash in `_sd` | Hash of `(digestID, random, identifier, value)` CBOR → put in MSO digestMap |
| **Reveal mechanism** | Append raw disclosure arrays after `~` in the token | Include full element struct in CBOR DeviceResponse namespace |
| **What verifier checks** | `SHA-256(base64url(disclosure))` ∈ `_sd` array | `SHA-256(CBOR(element))` == `MSO.valueDigests[ns][digestID]` |
| **Where hashes are signed** | Issuer's ES256 signature over the JWT `header.payload` | Document Signer's ES256 signature over the MSO (CBOR) |
| **Per-field configuration** | `selectiveDisclosure.fields.X.sd: true/false` at issuance | Every field gets random + digestID automatically; disclosure decided at presentation |
| **Field identity in request** | JSONPath `$.birthdate` | JSONPath `$['org.iso.18013.5.1']['birth_date']` (namespace-qualified) |
| **Token format** | `<JWT>.<sig>~<disclosure1>~<disclosure2>~<KB-JWT>` | CBOR-encoded DeviceResponse |
| **Holder binding proof** | KB-JWT signed by holder key (`cnf.jwk`) | DeviceAuth CBOR signed by device key (`deviceKey` in MSO) |
| **Encoding** | JSON / Base64url | CBOR (binary, CBOR tag 24 for embedded structs) |
