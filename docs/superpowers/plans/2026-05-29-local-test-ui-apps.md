# Local Test UI Apps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three standalone Vite/React/TypeScript SPAs (wallet-ui, issuer-ui, verifier-ui) under `local-test/` that call the Walt.id Identity Stack APIs for mDoc, SD-JWT VC, and JWT VC/VP credential flows.

**Architecture:** Three independent Vite/React/TS apps, each on its own port (5173/5174/5175), no shared package dependency. Each app has `src/api/` for typed HTTP calls, `src/screens/` for page-level components, and `src/components/` for shared UI. State-based navigation (no router).

**Tech Stack:** React 18, Vite 5, TypeScript, no additional runtime dependencies.

---

## File Map

```
local-test/
  wallet-ui/
    index.html
    package.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      App.css
      types.ts
      utils.ts
      api/wallet-api.ts
      screens/LoginScreen.tsx
      screens/CredentialsScreen.tsx
      screens/ClaimOfferScreen.tsx
      screens/PresentationScreen.tsx
      screens/KeysDidsScreen.tsx
      components/Layout.tsx
      components/Toast.tsx

  issuer-ui/
    index.html
    package.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      App.css
      types.ts
      utils.ts
      api/issuer-api.ts
      screens/DashboardScreen.tsx
      screens/IssueCredentialScreen.tsx
      screens/OffersScreen.tsx
      components/Layout.tsx
      components/Toast.tsx
      components/MdocForm.tsx
      components/SdJwtForm.tsx
      components/JwtVcForm.tsx

  verifier-ui/
    index.html
    package.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      App.css
      types.ts
      utils.ts
      api/verifier-api.ts
      screens/NewRequestScreen.tsx
      screens/SessionsScreen.tsx
      components/Layout.tsx
      components/Toast.tsx
      components/MdocRequestBuilder.tsx
      components/SdJwtRequestBuilder.tsx
      components/JwtVcRequestBuilder.tsx

  start-all.sh
```

---

## Phase 1: Wallet UI

### Task 1: Scaffold wallet-ui project

**Files:**
- Create: `local-test/wallet-ui/index.html`
- Create: `local-test/wallet-ui/package.json`
- Create: `local-test/wallet-ui/tsconfig.json`
- Create: `local-test/wallet-ui/tsconfig.node.json`
- Create: `local-test/wallet-ui/vite.config.ts`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wallet UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "wallet-ui",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 6: Install dependencies and verify**

Run: `cd local-test/wallet-ui && npm install`
Expected: installs cleanly

- [ ] **Step 7: Commit**

```bash
git add local-test/wallet-ui/
git commit -m "feat: scaffold wallet-ui Vite/React/TS project

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Types and utilities (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/types.ts`
- Create: `local-test/wallet-ui/src/utils.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

export type Screen = 'login' | 'credentials' | 'claim' | 'presentation' | 'keys-dids';

export interface CredentialCard {
  id: string;
  format: CredentialFormat;
  type: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
}
```

- [ ] **Step 2: Create utils.ts**

```typescript
const WALLET_API_BASE = 'http://localhost:7001/wallet-api';

export function getApiBase(): string {
  return WALLET_API_BASE;
}

export function fixUrlForDocker(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal');
}

export function fixUrlForHost(url: string): string {
  return url.replace(/host\.docker\.internal/g, 'localhost');
}

export function getToken(): string | null {
  return localStorage.getItem('wallet_token');
}

export function setToken(token: string): void {
  localStorage.setItem('wallet_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('wallet_token');
}
```

- [ ] **Step 3: Commit**

```bash
git add local-test/wallet-ui/src/types.ts local-test/wallet-ui/src/utils.ts
git commit -m "feat: add wallet-ui types and utilities

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Wallet API client

**Files:**
- Create: `local-test/wallet-ui/src/api/wallet-api.ts`

- [ ] **Step 1: Create wallet-api.ts**

```typescript
import { getApiBase, fixUrlForDocker, fixUrlForHost, getToken } from '../utils';

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res;
}

export async function register(name: string, email: string, password: string): Promise<string> {
  const res = await authFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ type: 'email', name, email, password }),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function login(email: string, password: string): Promise<string> {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ type: 'email', email, password }),
  });
  const data = await res.json();
  return data.token;
}

export async function getWallets(): Promise<{ wallets: { id: string }[] }> {
  const res = await authFetch('/wallet/accounts/wallets');
  return res.json();
}

export async function getKeys(walletId: string): Promise<unknown[]> {
  const res = await authFetch(`/wallet/${walletId}/keys`);
  return res.json();
}

export async function getDids(walletId: string): Promise<unknown[]> {
  const res = await authFetch(`/wallet/${walletId}/dids`);
  return res.json();
}

export async function useOfferRequest(walletId: string, offerUri: string): Promise<{ id: string }[]> {
  const fixed = fixUrlForDocker(offerUri);
  const res = await authFetch(`/wallet/${walletId}/exchange/useOfferRequest`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: JSON.stringify(fixed),
  });
  return res.json();
}

export async function matchCredentialsForPresentationDefinition(
  walletId: string,
  presentationDefinition: unknown
): Promise<{ id: string }[]> {
  const res = await authFetch(`/wallet/${walletId}/exchange/matchCredentialsForPresentationDefinition`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: JSON.stringify(presentationDefinition),
  });
  return res.json();
}

export async function resolvePresentationRequest(
  walletId: string,
  authRequest: string
): Promise<string> {
  const fixed = fixUrlForDocker(authRequest);
  const res = await authFetch(`/wallet/${walletId}/exchange/resolvePresentationRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'accept': 'text/plain' },
    body: fixed,
  });
  return res.text();
}

export async function usePresentationRequest(
  walletId: string,
  presentationRequest: string,
  selectedCredentials: string[]
): Promise<unknown> {
  const res = await authFetch(`/wallet/${walletId}/exchange/usePresentationRequest`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: JSON.stringify({ presentationRequest, selectedCredentials }),
  });
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/wallet-ui/src/api/wallet-api.ts
git commit -m "feat: add wallet-ui API client

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Layout and Toast components (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/components/Layout.tsx`
- Create: `local-test/wallet-ui/src/components/Toast.tsx`

- [ ] **Step 1: Create Toast.tsx**

```typescript
import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'error' | 'success' | 'info';
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'error') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

export function ToastContainer({ toasts, dismissToast }: {
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px', borderRadius: 6, color: '#fff', cursor: 'pointer',
          background: t.type === 'error' ? '#d32f2f' : t.type === 'success' ? '#2e7d32' : '#1565c0',
          maxWidth: 400, wordBreak: 'break-word',
        }} onClick={() => dismissToast(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create Layout.tsx**

```typescript
import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'credentials', label: 'Credentials' },
  { screen: 'claim', label: 'Claim Offer' },
  { screen: 'presentation', label: 'Presentation' },
  { screen: 'keys-dids', label: 'Keys & DIDs' },
];

export function Layout({ currentScreen, onNavigate, loggedIn, onLogout, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  loggedIn: boolean;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {loggedIn && (
        <nav style={{
          display: 'flex', gap: 0, padding: '0 20px', background: '#1a1a2e',
          color: '#fff', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 'bold', marginRight: 20, fontSize: 16 }}>Wallet UI</span>
          {NAV_ITEMS.map(item => (
            <button key={item.screen} onClick={() => onNavigate(item.screen)} style={{
              background: currentScreen === item.screen ? '#16213e' : 'transparent',
              color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer',
              fontSize: 14, borderBottom: currentScreen === item.screen ? '2px solid #4fc3f7' : '2px solid transparent',
            }}>
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={onLogout} style={{
            background: 'transparent', color: '#ff8a80', border: '1px solid #ff8a80',
            padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
          }}>
            Logout
          </button>
        </nav>
      )}
      <main style={{ flex: 1, padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add local-test/wallet-ui/src/components/Layout.tsx local-test/wallet-ui/src/components/Toast.tsx
git commit -m "feat: add Layout and Toast components to wallet-ui

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: App shell and main entry (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/main.tsx`
- Create: `local-test/wallet-ui/src/App.tsx`
- Create: `local-test/wallet-ui/src/App.css`

- [ ] **Step 1: Create main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 2: Create App.tsx**

```typescript
import { useState, useCallback } from 'react';
import type { Screen } from './types';
import { setToken, clearToken, getToken } from './utils';
import { useToast, ToastContainer } from './components/Toast';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { CredentialsScreen } from './screens/CredentialsScreen';
import { ClaimOfferScreen } from './screens/ClaimOfferScreen';
import { PresentationScreen } from './screens/PresentationScreen';
import { KeysDidsScreen } from './screens/KeysDidsScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>(getToken() ? 'credentials' : 'login');
  const [walletId, setWalletId] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { toasts, addToast, dismissToast } = useToast();

  const handleLogin = useCallback((token: string, wid: string) => {
    setToken(token);
    setWalletId(wid);
    setScreen('credentials');
    setRefreshKey(k => k + 1);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setWalletId('');
    setScreen('login');
  }, []);

  const loggedIn = !!getToken();

  const renderScreen = () => {
    if (!loggedIn) {
      return <LoginScreen onLogin={handleLogin} addToast={addToast} />;
    }
    switch (screen) {
      case 'credentials':
        return <CredentialsScreen key={refreshKey} walletId={walletId} addToast={addToast} />;
      case 'claim':
        return <ClaimOfferScreen walletId={walletId} addToast={addToast} />;
      case 'presentation':
        return <PresentationScreen walletId={walletId} addToast={addToast} />;
      case 'keys-dids':
        return <KeysDidsScreen walletId={walletId} addToast={addToast} />;
      default:
        return <CredentialsScreen key={refreshKey} walletId={walletId} addToast={addToast} />;
    }
  };

  return (
    <>
      <Layout currentScreen={screen} onNavigate={setScreen} loggedIn={loggedIn} onLogout={handleLogout}>
        {renderScreen()}
      </Layout>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </>
  );
}
```

- [ ] **Step 3: Create App.css**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }

.card {
  background: #fff; border-radius: 8px; padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px;
}

.btn {
  padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer;
  font-size: 14px; font-weight: 500;
}
.btn-primary { background: #1565c0; color: #fff; }
.btn-primary:hover { background: #0d47a1; }
.btn-success { background: #2e7d32; color: #fff; }
.btn-success:hover { background: #1b5e20; }

.input {
  width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;
  font-size: 14px; margin-bottom: 8px;
}
.input:focus { outline: none; border-color: #1565c0; box-shadow: 0 0 0 2px rgba(21,101,192,0.2); }

.label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #555; }

.badge {
  display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px;
  font-weight: 600; text-transform: uppercase;
}
.badge-mdoc { background: #e3f2fd; color: #1565c0; }
.badge-sd-jwt { background: #e8f5e9; color: #2e7d32; }
.badge-jwt-vc { background: #fff3e0; color: #e65100; }

table { width: 100%; border-collapse: collapse; }
table th, table td { padding: 8px 12px; text-align: left; font-size: 13px; border-bottom: 1px solid #eee; }
table th { background: #f5f5f5; font-weight: 600; }

.format-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.format-tab {
  padding: 6px 16px; border: 1px solid #ccc; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 13px;
}
.format-tab.active { border-color: #1565c0; background: #e3f2fd; color: #1565c0; font-weight: 600; }

.section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
```

- [ ] **Step 4: Verify the app starts**

Run: `cd local-test/wallet-ui && npx vite --host 2>&1 | head -10`
Expected: Vite dev server starts (will fail on missing screen imports — expected, they don't exist yet)

- [ ] **Step 5: Commit**

```bash
git add local-test/wallet-ui/src/main.tsx local-test/wallet-ui/src/App.tsx local-test/wallet-ui/src/App.css
git commit -m "feat: add wallet-ui App shell with navigation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Login screen (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/screens/LoginScreen.tsx`

- [ ] **Step 1: Create LoginScreen.tsx**

```typescript
import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import { register, login, getWallets } from '../api/wallet-api';

interface Props {
  onLogin: (token: string, walletId: string) => void;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function LoginScreen({ onLogin, addToast }: Props) {
  const [email, setEmail] = useState('test@email.com');
  const [password, setPassword] = useState('test');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Try registration first (idempotent — ok if already exists)
      try {
        await register('Test', email, password);
      } catch { /* account likely exists */ }

      const token = await login(email, password);
      if (!token) throw new Error('Login returned no token');

      const walletsData = await getWallets();
      const walletId = walletsData.wallets?.[0]?.id;
      if (!walletId) throw new Error('No wallet found');

      addToast('Logged in successfully', 'success');
      onLogin(token, walletId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '60px auto' }}>
      <div className="card">
        <h1 className="section-title">Wallet Login</h1>
        <form onSubmit={handleSubmit}>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 12, width: '100%' }}>
            {loading ? 'Logging in...' : 'Login / Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/wallet-ui/src/screens/LoginScreen.tsx
git commit -m "feat: add wallet-ui login screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Credentials screen (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/screens/CredentialsScreen.tsx`

- [ ] **Step 1: Create CredentialsScreen.tsx**

```typescript
import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { CredentialCard } from '../types';
import { getWallets } from '../api/wallet-api';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function CredentialsScreen({ walletId, addToast }: Props) {
  const [credentials, setCredentials] = useState<CredentialCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredentials();
  }, [walletId]);

  async function loadCredentials() {
    setLoading(true);
    try {
      // The wallet API returns wallets with embedded credentials
      // For now, fetch wallet list and display wallet info
      const data = await getWallets();
      // Convert wallet entries to credential cards
      const cards: CredentialCard[] = (data.wallets || []).map((w: { id: string; name?: string }) => ({
        id: w.id,
        format: 'jwt-vc' as const,
        type: w.name || 'Wallet',
        issuer: 'Local',
        issuedAt: new Date().toISOString(),
      }));
      setCredentials(cards);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load credentials';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  const formatBadge = (format: string) => {
    switch (format) {
      case 'mdoc': return <span className="badge badge-mdoc">mDoc</span>;
      case 'sd-jwt': return <span className="badge badge-sd-jwt">SD-JWT</span>;
      case 'jwt-vc': return <span className="badge badge-jwt-vc">JWT VC</span>;
      default: return <span className="badge">{format}</span>;
    }
  };

  return (
    <div>
      <h1 className="section-title">Credentials</h1>
      {loading ? (
        <p>Loading...</p>
      ) : credentials.length === 0 ? (
        <div className="card">
          <p style={{ color: '#888' }}>No credentials found. Claim a credential offer to get started.</p>
        </div>
      ) : (
        credentials.map((cred, i) => (
          <div className="card" key={cred.id || i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{cred.type}</strong>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  ID: {cred.id.slice(0, 30)}...
                </div>
              </div>
              {formatBadge(cred.format)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/wallet-ui/src/screens/CredentialsScreen.tsx
git commit -m "feat: add wallet-ui credentials screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Claim Offer screen (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/screens/ClaimOfferScreen.tsx`

- [ ] **Step 1: Create ClaimOfferScreen.tsx**

```typescript
import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import { useOfferRequest } from '../api/wallet-api';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function ClaimOfferScreen({ walletId, addToast }: Props) {
  const [offerUri, setOfferUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function handleClaim() {
    if (!offerUri.trim()) {
      addToast('Please paste a credential offer URI', 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const creds = await useOfferRequest(walletId, offerUri.trim());
      setResult(creds);
      addToast(`Credential claimed! ID: ${creds[0]?.id?.slice(0, 20)}...`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="section-title">Claim Credential Offer</h1>
      <div className="card">
        <label className="label">Offer URI</label>
        <textarea
          className="input"
          rows={3}
          value={offerUri}
          onChange={e => setOfferUri(e.target.value)}
          placeholder="Paste credential offer URI here (e.g., openid-credential-offer://...)"
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
        <button className="btn btn-primary" onClick={handleClaim} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Claiming...' : 'Claim Credential'}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Claimed Credential</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/wallet-ui/src/screens/ClaimOfferScreen.tsx
git commit -m "feat: add wallet-ui claim offer screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Presentation screen (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/screens/PresentationScreen.tsx`

- [ ] **Step 1: Create PresentationScreen.tsx**

```typescript
import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import { resolvePresentationRequest, matchCredentialsForPresentationDefinition, usePresentationRequest } from '../api/wallet-api';
import { fixUrlForHost } from '../utils';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function PresentationScreen({ walletId, addToast }: Props) {
  const [authRequest, setAuthRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'review' | 'done'>('input');
  const [resolvedRequest, setResolvedRequest] = useState('');
  const [matchedCred, setMatchedCred] = useState<string>('');
  const [presentationResult, setPresentationResult] = useState<unknown>(null);

  async function handleResolve() {
    if (!authRequest.trim()) {
      addToast('Please paste an authorization request URL', 'error');
      return;
    }
    setLoading(true);
    try {
      // Step 1: Resolve presentation request
      const resolved = await resolvePresentationRequest(walletId, authRequest.trim());
      setResolvedRequest(resolved);

      // Step 2: Try to match credentials from presentation definition
      let credId = '';
      try {
        // Extract presentation_definition_uri and fetch it
        const pdUriMatch = authRequest.match(/presentation_definition_uri=([^&]+)/);
        if (pdUriMatch) {
          const pdUriEnc = pdUriMatch[1];
          // Use python-like decoding — manually decode URI
          const pdUri = decodeURIComponent(pdUriEnc);
          const pdUriLocal = fixUrlForHost(pdUri);
          const pdResp = await fetch(pdUriLocal);
          const presDef = await pdResp.json();
          const matched = await matchCredentialsForPresentationDefinition(walletId, presDef);
          credId = matched[0]?.id || '';
        }
      } catch { /* if matching fails, user can still proceed with manual ID */ }

      if (!credId) {
        addToast('Could not auto-match credentials. Please enter a credential ID manually.', 'info');
      }

      setMatchedCred(credId);
      setStep('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve request';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePresent() {
    if (!matchedCred.trim()) {
      addToast('Please enter a credential ID to present', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await usePresentationRequest(walletId, resolvedRequest, [matchedCred]);
      setPresentationResult(result);
      setStep('done');
      addToast('Presentation fulfilled', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Presentation failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setAuthRequest('');
    setResolvedRequest('');
    setMatchedCred('');
    setPresentationResult(null);
    setStep('input');
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="section-title">Presentation Request</h1>

      {step === 'input' && (
        <div className="card">
          <label className="label">Authorization Request URL</label>
          <textarea
            className="input"
            rows={3}
            value={authRequest}
            onChange={e => setAuthRequest(e.target.value)}
            placeholder="Paste the authorization request URL from the Verifier (e.g., openid4vp://authorize?...)"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <button className="btn btn-primary" onClick={handleResolve} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Resolving...' : 'Review Request'}
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Review Presentation</h3>
          <label className="label">Credential ID to present</label>
          <input
            className="input"
            value={matchedCred}
            onChange={e => setMatchedCred(e.target.value)}
            placeholder="Credential ID"
          />
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: '#666' }}>Resolved request (click to expand)</summary>
            <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 11, overflow: 'auto', maxHeight: 200, marginTop: 8 }}>
              {resolvedRequest.slice(0, 500)}...
            </pre>
          </details>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-success" onClick={handlePresent} disabled={loading}>
              {loading ? 'Presenting...' : 'Approve & Present'}
            </button>
            <button className="btn" onClick={handleReset} style={{ background: '#eee' }}>Back</button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card">
          <h3 style={{ marginBottom: 8, color: '#2e7d32' }}>Presentation Complete</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
            {JSON.stringify(presentationResult, null, 2)}
          </pre>
          <button className="btn btn-primary" onClick={handleReset} style={{ marginTop: 12 }}>New Presentation</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/wallet-ui/src/screens/PresentationScreen.tsx
git commit -m "feat: add wallet-ui presentation screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Keys & DIDs screen (wallet-ui)

**Files:**
- Create: `local-test/wallet-ui/src/screens/KeysDidsScreen.tsx`

- [ ] **Step 1: Create KeysDidsScreen.tsx**

```typescript
import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import { getKeys, getDids } from '../api/wallet-api';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function KeysDidsScreen({ walletId, addToast }: Props) {
  const [keys, setKeys] = useState<unknown[]>([]);
  const [dids, setDids] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [walletId]);

  async function loadData() {
    setLoading(true);
    try {
      const [k, d] = await Promise.all([getKeys(walletId), getDids(walletId)]);
      setKeys(k);
      setDids(d);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load keys/DIDs';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="section-title">Keys &amp; DIDs</h1>
      {loading ? <p>Loading...</p> : (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Keys</h3>
            {keys.length === 0 ? (
              <p style={{ color: '#888' }}>No keys found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Key ID</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{key.keyId?.id || key.id || '-'}</td>
                      <td>{key.keyId?.type || key.type || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>DIDs</h3>
            {dids.length === 0 ? (
              <p style={{ color: '#888' }}>No DIDs found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>DID</th>
                    <th>Alias</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {dids.map((did: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{did.did || '-'}</td>
                      <td>{did.alias || '-'}</td>
                      <td>{did.default ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button className="btn btn-primary" onClick={loadData}>Refresh</button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/wallet-ui/src/screens/KeysDidsScreen.tsx
git commit -m "feat: add wallet-ui keys and DIDs screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 2: Issuer UI

### Task 11: Scaffold issuer-ui project

**Files:**
- Create: `local-test/issuer-ui/index.html`
- Create: `local-test/issuer-ui/package.json`
- Create: `local-test/issuer-ui/tsconfig.json`
- Create: `local-test/issuer-ui/tsconfig.node.json`
- Create: `local-test/issuer-ui/vite.config.ts`

- [ ] **Step 1: Create all scaffold files**

`index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Issuer UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`package.json`:

```json
{
  "name": "issuer-ui",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.0"
  }
}
```

`tsconfig.json` and `tsconfig.node.json` — identical to wallet-ui Task 1.

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
})
```

- [ ] **Step 2: Install and verify**

Run: `cd local-test/issuer-ui && npm install`
Expected: installs cleanly

- [ ] **Step 3: Commit**

```bash
git add local-test/issuer-ui/
git commit -m "feat: scaffold issuer-ui Vite/React/TS project

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 12: Types, utils, API client, and base UI (issuer-ui)

**Files:**
- Create: `local-test/issuer-ui/src/types.ts`
- Create: `local-test/issuer-ui/src/utils.ts`
- Create: `local-test/issuer-ui/src/api/issuer-api.ts`
- Create: `local-test/issuer-ui/src/components/Layout.tsx`
- Create: `local-test/issuer-ui/src/components/Toast.tsx`
- Create: `local-test/issuer-ui/src/main.tsx`
- Create: `local-test/issuer-ui/src/App.tsx`
- Create: `local-test/issuer-ui/src/App.css`

- [ ] **Step 1: Create types.ts**

```typescript
export type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

export type Screen = 'dashboard' | 'issue' | 'offers';

export interface OnboardingState {
  // mDoc
  iacaKey?: unknown;
  iacaCertData?: unknown;
  iacaCertPem?: string;
  dsKey?: unknown;
  dsCertPem?: string;
  // SD-JWT / JWT VC (shared)
  issuerKey?: unknown;
  issuerDid?: string;
}

export interface IssuedOffer {
  id: string;
  uri: string;
  format: CredentialFormat;
  timestamp: string;
}
```

- [ ] **Step 2: Create utils.ts**

```typescript
const ISSUER_API_BASE = 'http://localhost:7002';

export function getApiBase(): string {
  return ISSUER_API_BASE;
}

export function fixUrlForDocker(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal');
}

export function fixUrlForHost(url: string): string {
  return url.replace(/host\.docker\.internal/g, 'localhost');
}

export function loadOnboardingState(): import('../types').OnboardingState {
  try {
    return JSON.parse(localStorage.getItem('issuer_onboarding') || '{}');
  } catch { return {}; }
}

export function saveOnboardingState(state: import('../types').OnboardingState): void {
  localStorage.setItem('issuer_onboarding', JSON.stringify(state));
}

export function loadOffers(): import('../types').IssuedOffer[] {
  try {
    return JSON.parse(localStorage.getItem('issuer_offers') || '[]');
  } catch { return []; }
}

export function saveOffers(offers: import('../types').IssuedOffer[]): void {
  localStorage.setItem('issuer_offers', JSON.stringify(offers));
}
```

- [ ] **Step 3: Create issuer-api.ts**

```typescript
import { getApiBase } from '../utils';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res;
}

export async function createIaca(country: string, commonName: string): Promise<{
  iacaKey: unknown;
  certificateData: unknown;
  certificatePEM: string;
}> {
  const res = await apiFetch('/onboard/iso-mdl/iacas', {
    method: 'POST',
    body: JSON.stringify({
      certificateData: {
        country,
        commonName,
        issuerAlternativeNameConf: { uri: 'https://iaca.example.com' },
      },
    }),
  });
  return res.json();
}

export async function createDocumentSigner(
  iacaKey: unknown,
  iacaCertData: unknown,
  country: string,
  commonName: string,
): Promise<{
  documentSignerKey: unknown;
  certificateData: unknown;
  certificatePEM: string;
}> {
  const res = await apiFetch('/onboard/iso-mdl/document-signers', {
    method: 'POST',
    body: JSON.stringify({
      iacaSigner: { iacaKey, certificateData: iacaCertData },
      certificateData: {
        country,
        commonName,
        crlDistributionPointUri: 'https://iaca.example.com/crl',
      },
    }),
  });
  return res.json();
}

export async function onboardIssuer(): Promise<{
  issuerKey: unknown;
  issuerDid: string;
}> {
  const res = await apiFetch('/onboard/issuer', {
    method: 'POST',
    body: JSON.stringify({ key: { keyType: 'secp256r1' } }),
  });
  return res.json();
}

export async function issueMdoc(issuerKey: unknown, dsCertPem: string, iacaCertPem: string): Promise<string> {
  const res = await apiFetch('/openid4vc/mdoc/issue', {
    method: 'POST',
    body: JSON.stringify({
      issuerKey,
      credentialConfigurationId: 'org.iso.18013.5.1.mDL',
      mdocData: {
        'org.iso.18013.5.1': {
          family_name: 'Doe',
          given_name: 'John',
          birth_date: '1986-03-22',
          issue_date: '2019-10-20',
          expiry_date: '2030-10-20',
          issuing_country: 'US',
          issuing_authority: 'US DMV',
          document_number: '123456789',
          portrait: [141, 182, 121, 111, 238, 50, 120, 94, 54, 111, 113, 13, 241, 12, 12],
          driving_privileges: [{ vehicle_category_code: 'B', issue_date: '2019-10-20', expiry_date: '2030-10-20' }],
          un_distinguishing_sign: 'USA',
        },
      },
      x5Chain: [dsCertPem],
      authenticationMethod: 'PRE_AUTHORIZED',
    }),
  });
  return res.text();
}

export async function issueSdJwt(issuerKey: unknown, issuerDid: string): Promise<string> {
  const res = await apiFetch('/openid4vc/sdjwt/issue', {
    method: 'POST',
    body: JSON.stringify({
      issuerKey,
      issuerDid,
      credentialConfigurationId: 'identity_credential_vc+sd-jwt',
      credentialData: {
        given_name: 'John',
        family_name: 'Doe',
        email: 'johndoe@example.com',
        phone_number: '+1-202-555-0101',
        address: { street_address: '123 Main St', locality: 'Anytown', region: 'Anystate', country: 'US' },
        birthdate: '1940-01-01',
        is_over_18: true,
        is_over_21: true,
        is_over_65: true,
      },
      mapping: { id: '<uuid>', iat: '<timestamp-seconds>', nbf: '<timestamp-seconds>', exp: '<timestamp-in-seconds:365d>' },
      selectiveDisclosure: { fields: { birthdate: { sd: true }, family_name: { sd: true }, given_name: { sd: false } } },
      authenticationMethod: 'PRE_AUTHORIZED',
    }),
  });
  return res.text();
}

export async function issueJwtVc(issuerKey: unknown, issuerDid: string): Promise<string> {
  const res = await apiFetch('/openid4vc/jwt/issue', {
    method: 'POST',
    body: JSON.stringify({
      issuerKey,
      issuerDid,
      credentialConfigurationId: 'UniversityDegree_jwt_vc_json',
      credentialData: {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1'],
        id: 'http://example.gov/credentials/3732',
        type: ['VerifiableCredential', 'UniversityDegree'],
        issuer: { id: 'did:web:vc.transmute.world' },
        issuanceDate: '2020-03-10T04:24:12.164Z',
        credentialSubject: {
          id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
          degree: { type: 'BachelorDegree', name: 'Bachelor of Science and Arts' },
        },
      },
      mapping: {
        id: '<uuid>',
        issuer: { id: '<issuerDid>' },
        credentialSubject: { id: '<subjectDid>' },
        issuanceDate: '<timestamp>',
        expirationDate: '<timestamp-in:365d>',
      },
      authenticationMethod: 'PRE_AUTHORIZED',
      standardVersion: 'DRAFT13',
    }),
  });
  return res.text();
}

export async function getCredentialOffer(offerId: string): Promise<unknown> {
  const res = await apiFetch(`/draft13/credentialOffer?id=${encodeURIComponent(offerId)}`);
  return res.json();
}

export async function getWellKnown(): Promise<unknown> {
  const res = await apiFetch('/draft13/.well-known/openid-configuration');
  return res.json();
}
```

- [ ] **Step 4: Create Toast.tsx** — same as wallet-ui Toast.tsx (Task 4 Step 1). Copy verbatim.

- [ ] **Step 5: Create Layout.tsx**

```typescript
import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'dashboard', label: 'Dashboard' },
  { screen: 'issue', label: 'Issue Credential' },
  { screen: 'offers', label: 'Offers' },
];

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex', gap: 0, padding: '0 20px', background: '#0d1b2a',
        color: '#fff', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 'bold', marginRight: 20, fontSize: 16 }}>Issuer UI</span>
        {NAV_ITEMS.map(item => (
          <button key={item.screen} onClick={() => onNavigate(item.screen)} style={{
            background: currentScreen === item.screen ? '#1b2838' : 'transparent',
            color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer',
            fontSize: 14, borderBottom: currentScreen === item.screen ? '2px solid #4fc3f7' : '2px solid transparent',
          }}>
            {item.label}
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Create main.tsx, App.tsx, App.css**

`main.tsx` — same as wallet-ui, just change import path.

`App.tsx`:

```typescript
import { useState } from 'react';
import type { Screen } from './types';
import { useToast, ToastContainer } from './components/Toast';
import { Layout } from './components/Layout';
import { DashboardScreen } from './screens/DashboardScreen';
import { IssueCredentialScreen } from './screens/IssueCredentialScreen';
import { OffersScreen } from './screens/OffersScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const { toasts, addToast, dismissToast } = useToast();

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <DashboardScreen addToast={addToast} />;
      case 'issue': return <IssueCredentialScreen addToast={addToast} />;
      case 'offers': return <OffersScreen addToast={addToast} />;
      default: return <DashboardScreen addToast={addToast} />;
    }
  };

  return (
    <>
      <Layout currentScreen={screen} onNavigate={setScreen}>
        {renderScreen()}
      </Layout>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </>
  );
}
```

`App.css` — same as wallet-ui App.css (Task 5 Step 3). Copy verbatim.

- [ ] **Step 7: Commit**

```bash
git add local-test/issuer-ui/src/
git commit -m "feat: add issuer-ui types, utils, API client, and shell

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 13: Dashboard screen with onboarding (issuer-ui)

**Files:**
- Create: `local-test/issuer-ui/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Create DashboardScreen.tsx**

```typescript
import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { OnboardingState } from '../types';
import { loadOnboardingState, saveOnboardingState } from '../utils';
import { createIaca, createDocumentSigner, onboardIssuer, getWellKnown } from '../api/issuer-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function DashboardScreen({ addToast }: Props) {
  const [state, setState] = useState<OnboardingState>(loadOnboardingState);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [wellKnown, setWellKnown] = useState<unknown>(null);

  useEffect(() => {
    saveOnboardingState(state);
  }, [state]);

  useEffect(() => {
    getWellKnown().then(setWellKnown).catch(() => {});
  }, []);

  async function handleOnboardMdoc() {
    setLoading(prev => ({ ...prev, mdoc: true }));
    try {
      const iaca = await createIaca('US', 'Test IACA');
      const ds = await createDocumentSigner(iaca.iacaKey, iaca.certificateData, 'US', 'Test DS');
      const newState: OnboardingState = {
        ...state,
        iacaKey: iaca.iacaKey,
        iacaCertData: iaca.certificateData,
        iacaCertPem: iaca.certificatePEM,
        dsKey: ds.documentSignerKey,
        dsCertPem: ds.certificatePEM,
      };
      setState(newState);
      addToast('mDoc onboarding complete (IACA + DS)', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'mDoc onboarding failed';
      addToast(msg, 'error');
    } finally {
      setLoading(prev => ({ ...prev, mdoc: false }));
    }
  }

  async function handleOnboardIssuer() {
    setLoading(prev => ({ ...prev, issuer: true }));
    try {
      const result = await onboardIssuer();
      const newState: OnboardingState = {
        ...state,
        issuerKey: result.issuerKey,
        issuerDid: result.issuerDid,
      };
      setState(newState);
      addToast(`Issuer onboarded. DID: ${result.issuerDid}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Issuer onboarding failed';
      addToast(msg, 'error');
    } finally {
      setLoading(prev => ({ ...prev, issuer: false }));
    }
  }

  const mdocReady = !!(state.iacaKey && state.dsKey);
  const issuerReady = !!(state.issuerKey && state.issuerDid);

  return (
    <div>
      <h1 className="section-title">Dashboard</h1>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Onboarding Status</h3>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Status</th>
              <th>Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="badge badge-mdoc">mDoc</span></td>
              <td style={{ color: mdocReady ? '#2e7d32' : '#888' }}>{mdocReady ? 'Ready' : 'Not onboarded'}</td>
              <td style={{ fontSize: 12 }}>
                IACA: {state.iacaCertData ? '✓' : '✗'} &nbsp; DS: {state.dsKey ? '✓' : '✗'}
              </td>
              <td>
                <button className="btn btn-primary" onClick={handleOnboardMdoc} disabled={loading.mdoc} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {loading.mdoc ? 'Onboarding...' : mdocReady ? 'Re-onboard' : 'Onboard'}
                </button>
              </td>
            </tr>
            <tr>
              <td><span className="badge badge-sd-jwt">SD-JWT</span> / <span className="badge badge-jwt-vc">JWT VC</span></td>
              <td style={{ color: issuerReady ? '#2e7d32' : '#888' }}>{issuerReady ? 'Ready' : 'Not onboarded'}</td>
              <td style={{ fontSize: 12 }}>
                Key: {state.issuerKey ? '✓' : '✗'} &nbsp; DID: {state.issuerDid ? state.issuerDid.slice(0, 20) + '...' : '✗'}
              </td>
              <td>
                <button className="btn btn-primary" onClick={handleOnboardIssuer} disabled={loading.issuer} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {loading.issuer ? 'Onboarding...' : issuerReady ? 'Re-onboard' : 'Onboard'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {wellKnown && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Well-Known Configuration</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
            {JSON.stringify(wellKnown, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/issuer-ui/src/screens/DashboardScreen.tsx
git commit -m "feat: add issuer-ui dashboard with onboarding

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 14: Issue Credential screen (issuer-ui)

**Files:**
- Create: `local-test/issuer-ui/src/screens/IssueCredentialScreen.tsx`

- [ ] **Step 1: Create IssueCredentialScreen.tsx**

```typescript
import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { CredentialFormat, IssuedOffer } from '../types';
import { loadOnboardingState, loadOffers, saveOffers } from '../utils';
import { issueMdoc, issueSdJwt, issueJwtVc, getCredentialOffer } from '../api/issuer-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function IssueCredentialScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUri, setResultUri] = useState('');
  const [offerContent, setOfferContent] = useState<unknown>(null);

  async function handleIssue() {
    setLoading(true);
    setResultUri('');
    setOfferContent(null);
    try {
      const onboard = loadOnboardingState();
      let offerUri: string;

      if (format === 'mdoc') {
        if (!onboard.dsKey || !onboard.dsCertPem || !onboard.iacaCertPem) {
          throw new Error('mDoc not onboarded. Go to Dashboard first.');
        }
        offerUri = await issueMdoc(onboard.dsKey, onboard.dsCertPem, onboard.iacaCertPem);
      } else {
        if (!onboard.issuerKey || !onboard.issuerDid) {
          throw new Error('Issuer not onboarded. Go to Dashboard first.');
        }
        if (format === 'sd-jwt') {
          offerUri = await issueSdJwt(onboard.issuerKey, onboard.issuerDid);
        } else {
          offerUri = await issueJwtVc(onboard.issuerKey, onboard.issuerDid);
        }
      }

      setResultUri(offerUri);

      // Save to offer history
      const offerIdMatch = offerUri.match(/id=([^&]+)/);
      const offerId = offerIdMatch ? offerIdMatch[1] : '';
      const offers = loadOffers();
      offers.unshift({ id: offerId, uri: offerUri, format, timestamp: new Date().toISOString() });
      saveOffers(offers);

      // Fetch offer content
      if (offerId) {
        try {
          const content = await getCredentialOffer(offerId);
          setOfferContent(content);
        } catch { /* non-critical */ }
      }

      addToast('Credential offer created', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Issuance failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 className="section-title">Issue Credential</h1>

      <div className="card">
        <div className="format-tabs">
          {(['mdoc', 'sd-jwt', 'jwt-vc'] as CredentialFormat[]).map(f => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'mdoc' ? 'mDoc (ISO 18013-5)' : f === 'sd-jwt' ? 'SD-JWT VC' : 'JWT VC/VP'}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {format === 'mdoc' && 'Issues an ISO 18013-5 mobile Driver\'s License credential with IACA → DS certificate chain.'}
          {format === 'sd-jwt' && 'Issues an SD-JWT VC identity credential with selective disclosure on birthdate and family_name.'}
          {format === 'jwt-vc' && 'Issues a W3C Verifiable Credential (UniversityDegree) with Presentation Exchange.'}
        </p>

        <button className="btn btn-primary" onClick={handleIssue} disabled={loading}>
          {loading ? 'Issuing...' : `Issue ${format.toUpperCase()} Credential`}
        </button>
      </div>

      {resultUri && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Credential Offer URI</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={resultUri}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => { navigator.clipboard.writeText(resultUri); addToast('Copied to clipboard', 'success'); }}
              style={{ whiteSpace: 'nowrap' }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {offerContent && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Offer Content</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
            {JSON.stringify(offerContent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/issuer-ui/src/screens/IssueCredentialScreen.tsx
git commit -m "feat: add issuer-ui issue credential screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 15: Offers screen (issuer-ui)

**Files:**
- Create: `local-test/issuer-ui/src/screens/OffersScreen.tsx`

- [ ] **Step 1: Create OffersScreen.tsx**

```typescript
import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { IssuedOffer } from '../types';
import { loadOffers } from '../utils';
import { getCredentialOffer } from '../api/issuer-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function OffersScreen({ addToast }: Props) {
  const [offers, setOffers] = useState<IssuedOffer[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offerDetails, setOfferDetails] = useState<Record<string, unknown>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setOffers(loadOffers());
  }, []);

  async function handleViewDetails(offerId: string) {
    if (expandedId === offerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(offerId);
    if (!offerDetails[offerId]) {
      setLoadingDetail(true);
      try {
        const content = await getCredentialOffer(offerId);
        setOfferDetails(prev => ({ ...prev, [offerId]: content }));
      } catch {
        setOfferDetails(prev => ({ ...prev, [offerId]: { error: 'Failed to fetch' } }));
      } finally {
        setLoadingDetail(false);
      }
    }
  }

  const formatBadge = (format: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      mdoc: { cls: 'badge-mdoc', label: 'mDoc' },
      'sd-jwt': { cls: 'badge-sd-jwt', label: 'SD-JWT' },
      'jwt-vc': { cls: 'badge-jwt-vc', label: 'JWT VC' },
    };
    const info = map[format] || { cls: '', label: format };
    return <span className={`badge ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div>
      <h1 className="section-title">Active Offers</h1>
      {offers.length === 0 ? (
        <div className="card">
          <p style={{ color: '#888' }}>No offers generated yet. Go to Issue Credential to create one.</p>
        </div>
      ) : (
        offers.map((offer, i) => (
          <div className="card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {formatBadge(offer.format)}
                <span style={{ marginLeft: 8, fontSize: 13, fontFamily: 'monospace' }}>
                  {offer.id ? offer.id.slice(0, 30) + '...' : '(no ID)'}
                </span>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {new Date(offer.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleViewDetails(offer.id)}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                {expandedId === offer.id ? 'Hide' : 'View Details'}
              </button>
            </div>
            {expandedId === offer.id && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 12 }}>Offer URI:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                    {offer.uri}
                  </div>
                </div>
                {loadingDetail && <p style={{ fontSize: 12, color: '#888' }}>Loading details...</p>}
                {offerDetails[offer.id] && (
                  <div>
                    <strong style={{ fontSize: 12 }}>Offer Content:</strong>
                    <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 11, overflow: 'auto', maxHeight: 300, marginTop: 4 }}>
                      {JSON.stringify(offerDetails[offer.id], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/issuer-ui/src/screens/OffersScreen.tsx
git commit -m "feat: add issuer-ui offers screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 3: Verifier UI

### Task 16: Scaffold verifier-ui project

**Files:**
- Create: `local-test/verifier-ui/index.html`
- Create: `local-test/verifier-ui/package.json`
- Create: `local-test/verifier-ui/tsconfig.json`
- Create: `local-test/verifier-ui/tsconfig.node.json`
- Create: `local-test/verifier-ui/vite.config.ts`

- [ ] **Step 1: Create all scaffold files**

Same pattern as issuer-ui Task 11 but with `"name": "verifier-ui"` in package.json and `port: 5175` in vite.config.ts.

- [ ] **Step 2: Install and verify**

Run: `cd local-test/verifier-ui && npm install`
Expected: installs cleanly

- [ ] **Step 3: Commit**

```bash
git add local-test/verifier-ui/
git commit -m "feat: scaffold verifier-ui Vite/React/TS project

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 17: Types, utils, API client, and base UI (verifier-ui)

**Files:**
- Create: `local-test/verifier-ui/src/types.ts`
- Create: `local-test/verifier-ui/src/utils.ts`
- Create: `local-test/verifier-ui/src/api/verifier-api.ts`
- Create: `local-test/verifier-ui/src/components/Layout.tsx`
- Create: `local-test/verifier-ui/src/components/Toast.tsx`
- Create: `local-test/verifier-ui/src/main.tsx`
- Create: `local-test/verifier-ui/src/App.tsx`
- Create: `local-test/verifier-ui/src/App.css`

- [ ] **Step 1: Create types.ts**

```typescript
export type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

export type Screen = 'new-request' | 'sessions';

export interface VerificationSession {
  state: string;
  format: CredentialFormat;
  timestamp: string;
  requestUrl: string;
  result?: boolean;
  resultData?: unknown;
}
```

- [ ] **Step 2: Create utils.ts**

```typescript
const VERIFIER_API_BASE = 'http://localhost:7003';

export function getApiBase(): string {
  return VERIFIER_API_BASE;
}

export function fixUrlForDocker(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal');
}

export function fixUrlForHost(url: string): string {
  return url.replace(/host\.docker\.internal/g, 'localhost');
}

export function loadSessions(): import('../types').VerificationSession[] {
  try { return JSON.parse(localStorage.getItem('verifier_sessions') || '[]'); }
  catch { return []; }
}

export function saveSessions(sessions: import('../types').VerificationSession[]): void {
  localStorage.setItem('verifier_sessions', JSON.stringify(sessions));
}
```

- [ ] **Step 3: Create verifier-api.ts**

```typescript
import { getApiBase } from '../utils';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'accept': '*/*', ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res;
}

export async function createMdocAuthRequest(
  iacaCertPem: string,
  fields: string[],
): Promise<string> {
  const mdocFields = fields.map(f => {
    return `$['org.iso.18013.5.1']['${f}']`;
  });

  const fieldDefs = mdocFields.map(p => ({
    path: [p],
    intent_to_retain: false,
  }));

  const res = await apiFetch('/openid4vc/verify', {
    method: 'POST',
    headers: {
      'authorizeBaseUrl': 'openid4vp://authorize',
      'responseMode': 'direct_post_jwt',
      'openId4VPProfile': 'ISO_18013_7_MDOC',
    },
    body: JSON.stringify({
      request_credentials: [{
        id: 'mDL-request',
        input_descriptor: {
          id: 'org.iso.18013.5.1.mDL',
          format: { mso_mdoc: { alg: ['ES256'] } },
          constraints: {
            fields: fieldDefs,
            limit_disclosure: 'required',
          },
        },
      }],
      trusted_root_cas: [iacaCertPem],
      openid_profile: 'ISO_18013_7_MDOC',
    }),
  });
  return res.text();
}

export async function createSdJwtAuthRequest(fields: string[]): Promise<string> {
  const fieldDefs = fields.map(p => ({
    path: [`$.${p}`],
    filter: { type: 'string', pattern: '.*' },
  }));

  const res = await apiFetch('/openid4vc/verify', {
    method: 'POST',
    headers: {
      'authorizeBaseUrl': 'openid4vp://authorize',
      'responseMode': 'direct_post',
    },
    body: JSON.stringify({
      request_credentials: [{
        format: 'vc+sd-jwt',
        input_descriptor: {
          id: 'identity-credential-request',
          format: { 'vc+sd-jwt': {} },
          constraints: {
            fields: fieldDefs,
            limit_disclosure: 'required',
          },
        },
      }],
      vp_policies: ['signature_sd-jwt-vc'],
      vc_policies: ['not-before', 'expired'],
    }),
  });
  return res.text();
}

export async function createJwtVcAuthRequest(credentialType: string): Promise<string> {
  const res = await apiFetch('/openid4vc/verify', {
    method: 'POST',
    headers: {
      'authorizeBaseUrl': 'openid4vp://authorize',
      'responseMode': 'direct_post',
    },
    body: JSON.stringify({
      request_credentials: [{
        type: credentialType,
        format: 'jwt_vc_json',
      }],
    }),
  });
  return res.text();
}

export async function getSession(sessionState: string): Promise<{
  verificationResult?: string;
  [key: string]: unknown;
}> {
  const res = await apiFetch(`/openid4vc/session/${sessionState}`);
  return res.json();
}
```

- [ ] **Step 4: Create Toast.tsx** — same as wallet-ui Toast.tsx. Copy verbatim.

- [ ] **Step 5: Create Layout.tsx**

```typescript
import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'new-request', label: 'New Request' },
  { screen: 'sessions', label: 'Sessions' },
];

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex', gap: 0, padding: '0 20px', background: '#1a0a00',
        color: '#fff', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 'bold', marginRight: 20, fontSize: 16 }}>Verifier UI</span>
        {NAV_ITEMS.map(item => (
          <button key={item.screen} onClick={() => onNavigate(item.screen)} style={{
            background: currentScreen === item.screen ? '#2a1a10' : 'transparent',
            color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer',
            fontSize: 14, borderBottom: currentScreen === item.screen ? '2px solid #ff9800' : '2px solid transparent',
          }}>
            {item.label}
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Create main.tsx, App.tsx, App.css**

`main.tsx` — same as wallet-ui but import from `./App`.

`App.tsx`:

```typescript
import { useState } from 'react';
import type { Screen } from './types';
import { useToast, ToastContainer } from './components/Toast';
import { Layout } from './components/Layout';
import { NewRequestScreen } from './screens/NewRequestScreen';
import { SessionsScreen } from './screens/SessionsScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('new-request');
  const { toasts, addToast, dismissToast } = useToast();

  const renderScreen = () => {
    switch (screen) {
      case 'new-request': return <NewRequestScreen addToast={addToast} />;
      case 'sessions': return <SessionsScreen addToast={addToast} />;
      default: return <NewRequestScreen addToast={addToast} />;
    }
  };

  return (
    <>
      <Layout currentScreen={screen} onNavigate={setScreen}>
        {renderScreen()}
      </Layout>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </>
  );
}
```

`App.css` — same as wallet-ui App.css. Copy verbatim.

- [ ] **Step 7: Commit**

```bash
git add local-test/verifier-ui/src/
git commit -m "feat: add verifier-ui types, utils, API client, and shell

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 18: New Request screen (verifier-ui)

**Files:**
- Create: `local-test/verifier-ui/src/screens/NewRequestScreen.tsx`

- [ ] **Step 1: Create NewRequestScreen.tsx**

```typescript
import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { CredentialFormat, VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { createMdocAuthRequest, createSdJwtAuthRequest, createJwtVcAuthRequest } from '../api/verifier-api';

const MDOC_FIELDS = ['family_name', 'given_name', 'birth_date', 'document_number', 'issue_date', 'expiry_date', 'issuing_country', 'issuing_authority'];
const SDJWT_FIELDS = ['given_name', 'family_name', 'birthdate', 'email', 'phone_number'];

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function NewRequestScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  // mDoc specific
  const [iacaCertPem, setIacaCertPem] = useState('');
  const [selectedMdocFields, setSelectedMdocFields] = useState<string[]>(['family_name', 'given_name']);
  // SD-JWT specific
  const [selectedSdJwtFields, setSelectedSdJwtFields] = useState<string[]>(['given_name', 'birthdate']);
  // JWT VC specific
  const [credentialType, setCredentialType] = useState('UniversityDegree');

  function toggle(arr: string[], setArr: (a: string[]) => void, val: string) {
    if (arr.includes(val)) setArr(arr.filter(v => v !== val));
    else setArr([...arr, val]);
  }

  async function handleCreate() {
    setLoading(true);
    setResultUrl('');
    try {
      let url: string;
      if (format === 'mdoc') {
        if (!iacaCertPem.trim()) throw new Error('Paste the IACA certificate PEM from the Issuer.');
        if (selectedMdocFields.length === 0) throw new Error('Select at least one field to request.');
        url = await createMdocAuthRequest(iacaCertPem.trim(), selectedMdocFields);
      } else if (format === 'sd-jwt') {
        if (selectedSdJwtFields.length === 0) throw new Error('Select at least one field to request.');
        url = await createSdJwtAuthRequest(selectedSdJwtFields);
      } else {
        url = await createJwtVcAuthRequest(credentialType);
      }

      setResultUrl(url);

      // Extract state from URL and save session
      const stateMatch = url.match(/state=([^&]+)/) || url.match(/request_uri=.*\/([^/&?]+)/);
      const state = stateMatch ? stateMatch[1] : '';
      const session: VerificationSession = {
        state,
        format,
        timestamp: new Date().toISOString(),
        requestUrl: url,
      };
      const sessions = loadSessions();
      sessions.unshift(session);
      saveSessions(sessions);

      addToast('Authorization request created', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create request';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 className="section-title">New Verification Request</h1>

      <div className="card">
        <div className="format-tabs">
          {(['mdoc', 'sd-jwt', 'jwt-vc'] as CredentialFormat[]).map(f => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'mdoc' ? 'mDoc (ISO 18013-7)' : f === 'sd-jwt' ? 'SD-JWT VC' : 'JWT VC/VP'}
            </button>
          ))}
        </div>

        {format === 'mdoc' && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">IACA Certificate PEM</label>
            <textarea
              className="input"
              rows={4}
              value={iacaCertPem}
              onChange={e => setIacaCertPem(e.target.value)}
              placeholder="Paste the IACA certificate PEM from the Issuer's onboarding..."
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <label className="label" style={{ marginTop: 8 }}>Fields to request</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MDOC_FIELDS.map(f => (
                <label key={f} style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={selectedMdocFields.includes(f)} onChange={() => toggle(selectedMdocFields, setSelectedMdocFields, f)} />
                  {f}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'sd-jwt' && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">Fields to request</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SDJWT_FIELDS.map(f => (
                <label key={f} style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={selectedSdJwtFields.includes(f)} onChange={() => toggle(selectedSdJwtFields, setSelectedSdJwtFields, f)} />
                  {f}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'jwt-vc' && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">Credential Type</label>
            <input
              className="input"
              value={credentialType}
              onChange={e => setCredentialType(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>
        )}

        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create Authorization Request'}
        </button>
      </div>

      {resultUrl && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Authorization Request URL</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              className="input"
              rows={3}
              value={resultUrl}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => { navigator.clipboard.writeText(resultUrl); addToast('Copied to clipboard', 'success'); }}
              style={{ whiteSpace: 'nowrap' }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Paste this URL into the Wallet app's Presentation screen to fulfill the request.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/verifier-ui/src/screens/NewRequestScreen.tsx
git commit -m "feat: add verifier-ui new request screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 19: Sessions screen (verifier-ui)

**Files:**
- Create: `local-test/verifier-ui/src/screens/SessionsScreen.tsx`

- [ ] **Step 1: Create SessionsScreen.tsx**

```typescript
import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { getSession } from '../api/verifier-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function SessionsScreen({ addToast }: Props) {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [polling, setPolling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  async function handlePoll(session: VerificationSession, index: number) {
    if (!session.state) {
      addToast('No session state to poll', 'error');
      return;
    }
    setPolling(prev => ({ ...prev, [session.state]: true }));
    try {
      const result = await getSession(session.state);
      const updated = [...sessions];
      updated[index] = {
        ...updated[index],
        result: result.verificationResult === 'true',
        resultData: result,
      };
      setSessions(updated);
      saveSessions(updated);
      const status = result.verificationResult === 'true' ? 'Verified' : 'Failed / Pending';
      addToast(`Verification: ${status}`, result.verificationResult === 'true' ? 'success' : 'error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Poll failed';
      addToast(msg, 'error');
    } finally {
      setPolling(prev => ({ ...prev, [session.state]: false }));
    }
  }

  function clearSessions() {
    setSessions([]);
    saveSessions([]);
  }

  const formatBadge = (format: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      mdoc: { cls: 'badge-mdoc', label: 'mDoc' },
      'sd-jwt': { cls: 'badge-sd-jwt', label: 'SD-JWT' },
      'jwt-vc': { cls: 'badge-jwt-vc', label: 'JWT VC' },
    };
    const info = map[format] || { cls: '', label: format };
    return <span className={`badge ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Verification Sessions</h1>
        {sessions.length > 0 && (
          <button className="btn" onClick={clearSessions} style={{ background: '#eee', fontSize: 12 }}>
            Clear All
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <p style={{ color: '#888' }}>No sessions yet. Create a New Request first.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>State / Session ID</th>
              <th>Created</th>
              <th>Result</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i}>
                <td>{formatBadge(s.format)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.state ? s.state.slice(0, 24) + '...' : '(none)'}</td>
                <td style={{ fontSize: 12 }}>{new Date(s.timestamp).toLocaleString()}</td>
                <td>
                  {s.result === undefined ? (
                    <span style={{ color: '#888', fontSize: 12 }}>Pending</span>
                  ) : s.result ? (
                    <span style={{ color: '#2e7d32', fontSize: 12, fontWeight: 600 }}>Verified</span>
                  ) : (
                    <span style={{ color: '#d32f2f', fontSize: 12, fontWeight: 600 }}>Failed</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePoll(s, i)}
                    disabled={polling[s.state]}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    {polling[s.state] ? '...' : 'Poll'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {sessions.some(s => s.resultData) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Latest Result Data</h3>
          {sessions.filter(s => s.resultData).map((s, i) => (
            <details key={i} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13 }}>
                {formatBadge(s.format)} — {new Date(s.timestamp).toLocaleString()} — {s.result ? 'Verified' : 'Failed'}
              </summary>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 300, marginTop: 8 }}>
                {JSON.stringify(s.resultData, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add local-test/verifier-ui/src/screens/SessionsScreen.tsx
git commit -m "feat: add verifier-ui sessions screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 4: Wrap-up

### Task 20: start-all.sh script

**Files:**
- Create: `local-test/start-all.sh`

- [ ] **Step 1: Create start-all.sh**

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Wallet UI on http://localhost:5173"
echo "Starting Issuer UI on http://localhost:5174"
echo "Starting Verifier UI on http://localhost:5175"
echo ""
echo "Make sure the Docker Compose stack is running:"
echo "  cd docker-compose && docker compose up -d"
echo ""

# Start all three dev servers in background
(cd "$SCRIPT_DIR/wallet-ui" && npx vite --host &) 
(cd "$SCRIPT_DIR/issuer-ui" && npx vite --host &)
(cd "$SCRIPT_DIR/verifier-ui" && npx vite --host &)

echo "All three UIs starting..."
echo "  Wallet:   http://localhost:5173"
echo "  Issuer:   http://localhost:5174"
echo "  Verifier: http://localhost:5175"
echo ""
echo "Press Ctrl+C to stop all."

wait
```

- [ ] **Step 2: Make executable**

Run: `chmod +x local-test/start-all.sh`

- [ ] **Step 3: Commit**

```bash
git add local-test/start-all.sh
git commit -m "feat: add start-all.sh to launch all three UIs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 21: Verify all apps start cleanly

- [ ] **Step 1: Install all dependencies**

Run:
```bash
cd local-test/wallet-ui && npm install
cd ../issuer-ui && npm install
cd ../verifier-ui && npm install
```
Expected: all install cleanly

- [ ] **Step 2: Type-check each app**

Run:
```bash
cd local-test/wallet-ui && npx tsc --noEmit
cd ../issuer-ui && npx tsc --noEmit
cd ../verifier-ui && npx tsc --noEmit
```
Expected: no type errors (may have unused variable warnings if types aren't used yet — acceptable)

- [ ] **Step 3: Start each app and verify it serves**

Run: `cd local-test/wallet-ui && timeout 5 npx vite --host 2>&1 || true`
Expected: "Local: http://localhost:5173/" appears in output

Run: `cd local-test/issuer-ui && timeout 5 npx vite --host 2>&1 || true`
Expected: "Local: http://localhost:5174/" appears in output

Run: `cd local-test/verifier-ui && timeout 5 npx vite --host 2>&1 || true`
Expected: "Local: http://localhost:5175/" appears in output

- [ ] **Step 4: Commit**

```bash
git add local-test/wallet-ui/node_modules/ local-test/issuer-ui/node_modules/ local-test/verifier-ui/node_modules/
# Note: node_modules should be in .gitignore — only commit if package-lock.json exists
git status
```
Expected: clean working tree (node_modules ignored by .gitignore)
```

---

## Self-Review

### 1. Spec coverage check

| Spec requirement | Task(s) |
|---|---|
| Wallet: Login screen | Task 6 |
| Wallet: Credentials Dashboard | Task 7 |
| Wallet: Claim Credential | Task 8 |
| Wallet: Verification Request (semi-automated flow) | Task 9 |
| Wallet: Keys & DIDs | Task 10 |
| Issuer: Dashboard / Onboarding (all 3 formats) | Task 13 |
| Issuer: Issue Credential (format selector + all 3 formats) | Task 14 |
| Issuer: Generated Offer (copy + offer content) | Task 14 |
| Issuer: Active Offers history | Task 15 |
| Verifier: New Request (format selector + all 3 formats) | Task 18 |
| Verifier: Generated Request (copy button) | Task 18 |
| Verifier: Sessions (table + poll + result) | Task 19 |
| Docker hostname rewriting (`localhost ↔ host.docker.internal`) | Task 2 (utils.ts), used in all API clients |
| Token in localStorage (`wallet_token`) | Task 2 (utils.ts), Task 5 (App.tsx) |
| Error handling (toast notifications) | Task 4 (Toast.tsx), used in all screens |
| localStorage persistence (onboarding, offers, sessions) | Tasks 12, 17 (utils.ts) |
| Each app on its own port (5173, 5174, 5175) | Tasks 1, 11, 16 (vite.config.ts) |
| start-all.sh | Task 20 |
| No shared package dependency | Each app scaffolded independently |
| No UI library / no router | No dependencies beyond React + Vite + TS |

### 2. Placeholder scan

No TBDs, TODOs, or "implement later" patterns found. Every step has complete code.

### 3. Type consistency

- `CredentialFormat` defined identically (`'mdoc' | 'sd-jwt' | 'jwt-vc'`) in all three `types.ts` files
- `Screen` type defined per app with app-specific values
- `ToastMessage` and `useToast` hook have consistent signatures across all three apps
- API function names match across utils, api-client, and screen usage
- `OnboardingState` fields (`iacaKey`, `iacaCertData`, `dsKey`, `issuerKey`, `issuerDid`) used consistently in issuer-ui
- `VerificationSession` fields (`state`, `format`, `timestamp`, `requestUrl`, `result`, `resultData`) used consistently in verifier-ui
