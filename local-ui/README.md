# Walt.id Identity — Local Demo UI

Three-page browser UI for walking through the full verifiable-credential lifecycle:
**Register → Issue → Claim → Present → Verify**

Supports both **SD-JWT VC** (W3C) and **ISO mDoc / mDL** credential formats.

---

## Setup

```bash
# 1. Start the backend stack
cd docker-compose
docker compose up -d

# 2. Start the UI proxy server
cd ../local-ui
./start.sh
```

| Page | URL | Backend |
|------|-----|---------|
| Wallet | http://localhost:8001 | Wallet API :7001 |
| Issuer | http://localhost:8002 | Issuer API :7002 |
| Verifier | http://localhost:8003 | Verifier API :7003 |

Stop the proxy: `./stop.sh`

---

## Flow A — SD-JWT VC

### Step 1 · Register a wallet account

1. Open **http://localhost:8001** (Wallet page).
2. Click the **Register** tab.
3. Fill in **Full Name**, **Email**, and **Password** (min 8 characters).
4. Click **Create Account** — you are automatically logged in.

> **Already have an account?** Use the **Login** tab instead.

---

### Step 2 · Issue an SD-JWT VC credential

1. Open **http://localhost:8002** (Issuer page) in a new tab.
2. The **SD-JWT VC** tab is selected by default.
3. *(Optional)* Edit the credential data fields (Given Name, Family Name, etc.).
4. *(Optional)* Toggle fields between **SD** (selective disclosure) and **Plain** in the *Selective Disclosure Configuration* card.
5. Click **Issue Only (get offer URI)**.
   - An `openid-credential-offer://…` URI appears.
6. Click **Copy URI**.

---

### Step 3 · Claim the credential in the wallet

1. Switch back to **http://localhost:8001** (Wallet page).
2. In **Accept Credential Offer**, click **📋 Paste**, then **Accept Offer**.
   - A green `✅ Credential claimed!` log line confirms success.
   - The credential appears in **My Credentials**.

---

### Step 4 · Create a verification request

1. Open **http://localhost:8003** (Verifier page) in a new tab.
2. The **SD-JWT VC** tab is selected by default.
3. *(Optional)* Check/uncheck the fields you want the verifier to request.
4. Click **📤 Create Verification Request**.
   - An `openid4vp://authorize?…` URI and a **state ID** appear.
5. Click **📋 Copy URI**.

---

### Step 5 · Present the credential

1. Switch back to **http://localhost:8001** (Wallet page).
2. In **Present Credential**, click **📋 Paste**, then **Present**.
   - The wallet resolves the request, auto-selects the SD-JWT VC, and presents it.
   - A green `✅ Credential presented successfully!` line appears.

---

### Step 6 · Check the verification result

1. Switch back to **http://localhost:8003** (Verifier page).
2. The *Session state ID* field is already filled in.
3. Click **Check** or **Auto-poll**.
   - The result panel shows `verificationResult: true` and the disclosed fields.

---

## Flow B — ISO mDoc / mDL

### Step 1 · Register a wallet account

Same as [SD-JWT Flow Step 1](#step-1--register-a-wallet-account). Skip if already logged in.

---

### Step 2 · Issue an mDoc credential

1. Open **http://localhost:8002** (Issuer page).
2. Click the **mDoc / mDL (ISO 18013-5)** tab.
3. *(Optional)* Edit the mDL data fields (Family Name, Given Name, Birth Date, etc.).
4. Click **Issue Only (get offer URI)**.
   - An `openid-credential-offer://…` URI appears — click **Copy URI**.
   - An **IACA Certificate PEM** block appears below. Click **Copy IACA PEM** and keep it — you need it in Step 4.

> **Why IACA?** ISO 18013-5 requires the verifier to validate the mDoc certificate chain up to a trusted IACA root. The PEM you copy is that root certificate.

---

### Step 3 · Claim the mDoc in the wallet

1. Switch to **http://localhost:8001** (Wallet page).
2. In **Accept Credential Offer**, click **📋 Paste**, then **Accept Offer**.
   - A green `✅ Credential claimed!` message appears.
   - The credential appears in **My Credentials** with an `mso_mdoc` badge.

---

### Step 4 · Create an mDoc verification request

1. Open **http://localhost:8003** (Verifier page).
2. Click the **mDoc / mDL (ISO 18013-5)** tab.
3. *(Optional)* Check/uncheck the ISO namespace fields to request.
4. Paste the **IACA Certificate PEM** (from Step 2) into the *IACA Certificate PEM* textarea.
5. Click **📤 Create Verification Request**.
   - An `openid4vp://…?request_uri=…` URI and session ID appear.
6. Click **📋 Copy URI**.

---

### Step 5 · Present the mDoc

1. Switch to **http://localhost:8001** (Wallet page).
2. In **Present Credential**, click **📋 Paste**, then **Present**.
   - The wallet detects `request_uri=` in the URI and auto-selects the mDoc credential.
   - A green `✅ Credential presented successfully!` line appears.

---

### Step 6 · Check the verification result

1. Switch to **http://localhost:8003** (Verifier page).
2. The *Session state ID* field is already filled in.
3. Click **Check** or **Auto-poll**.
   - The result shows `verificationResult: true` with the disclosed ISO namespace fields.

---

## Optional inspection steps

These can be done at any point to inspect the protocol state.

| What | Where | How |
|------|-------|-----|
| Wallet keys & DIDs | Wallet page | Click **🔍 Wallet Info** → **Show** |
| Issuer metadata (`.well-known`) | Issuer page | Click **📋 Inspect Issuer Well-Known Config** |
| Raw credential offer JSON | Issuer page, after Issue Only | Click **🔍 Inspect Offer Content** |

---

## Notes

| Topic | Detail |
|-------|--------|
| Session persistence | Login token is in `sessionStorage` — survives page refresh but not closing the tab. |
| Multiple credentials | If your wallet has both SD-JWT and mDoc credentials, the **Present** step auto-selects the right one based on the auth request format (`request_uri=` → mDoc, `state=` → SD-JWT). |
| Selective disclosure | Fields marked **SD** on the Issuer page are hashed in the JWT. The verifier only receives fields it explicitly requests — other SD fields stay hidden. |
| mDoc digest IDs | Each mDoc field has a `digestID`. Only fields whose digest IDs are listed in the verifier's Presentation Definition are revealed. |
| Offer URI rewriting | `localhost` in offer/auth-request URIs is automatically rewritten to `host.docker.internal` so the wallet-api container can reach the issuer/verifier. |
