# local-ui-cc Visual Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the three local-ui-cc apps (wallet-ui, issuer-ui, verifier-ui) from functional developer tools to polished demo-ready applications using Tailwind CSS, a shared component library, sidebar navigation, and refined visual design.

**Architecture:** A shared package (`local-ui-cc/shared/`) provides Tailwind base config, CSS design tokens, and reusable React components (Button, Card, Badge, Input, Textarea, Spinner, EmptyState, Toast, Tabs). Each app extends the base Tailwind config with its own accent color variable, adds a sidebar layout, and rewrites screens using shared components while preserving all existing logic and API calls unchanged.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, PostCSS, Autoprefixer, Lucide React (icons), Inter font (Google Fonts)

---

## File Structure

```
local-ui-cc/
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.base.ts
│   └── src/
│       ├── styles/
│       │   └── tokens.css
│       ├── components/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   ├── Badge.tsx
│       │   ├── Input.tsx
│       │   ├── Textarea.tsx
│       │   ├── Spinner.tsx
│       │   ├── EmptyState.tsx
│       │   ├── Toast.tsx
│       │   └── Tabs.tsx
│       └── index.ts
├── wallet-ui/
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── vite.config.ts              (modify: add alias)
│   ├── tsconfig.json               (modify: add path mapping)
│   ├── index.html                  (modify: Inter font link)
│   └── src/
│       ├── styles/
│       │   └── main.css            (new: Tailwind + tokens)
│       ├── components/
│       │   ├── Layout.tsx          (rewrite: sidebar)
│       │   └── CredentialCard.tsx  (new)
│       ├── screens/
│       │   ├── LoginScreen.tsx     (rewrite styles)
│       │   ├── CredentialsScreen.tsx
│       │   ├── ClaimOfferScreen.tsx
│       │   ├── PresentationScreen.tsx
│       │   └── KeysDidsScreen.tsx
│       ├── App.tsx                 (modify: remove App.css, add main.css)
│       ├── App.css                 (DELETE)
│       └── main.tsx                (modify: add main.css import)
├── issuer-ui/                      (same pattern)
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── ...screens converted...
│   └── App.css                     (DELETE)
├── verifier-ui/                    (same pattern)
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── ...screens converted...
│   └── App.css                     (DELETE)
└── start-all.sh / stop-all.sh
```

---

### Task 1: Shared package foundation

**Files:**
- Create: `local-ui-cc/shared/package.json`
- Create: `local-ui-cc/shared/tsconfig.json`
- Create: `local-ui-cc/shared/tailwind.config.base.ts`
- Create: `local-ui-cc/shared/src/styles/tokens.css`

- [ ] **Step 1: Create shared package.json**

```json
{
  "name": "@local-cc/shared",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "dependencies": {
    "lucide-react": "^0.400.0"
  }
}
```

- [ ] **Step 2: Create shared tsconfig.json**

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
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create shared Tailwind base config**

```typescript
// tailwind.config.base.ts
import type { Config } from 'tailwindcss';

export const baseConfig: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: '#1E293B',
        'primary-light': '#334155',
        surface: '#FFFFFF',
        'surface-alt': '#F8FAFC',
        border: '#E2E8F0',
        text: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        accent: 'var(--color-accent)',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        toast: '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create CSS tokens**

```css
/* tokens.css */
:root {
  --color-accent: #3B82F6;
  /* wallet: #3B82F6, issuer: #8B5CF6, verifier: #F59E0B */
  --color-accent-hover: #2563EB;
  --sidebar-bg: #1E293B;
  --sidebar-text: #E2E8F0;
  --sidebar-active-bg: #334155;
  --radius-card: 8px;
  --radius-btn: 6px;
  --radius-input: 4px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-toast: 0 4px 16px rgba(0,0,0,0.12);
}
```

- [ ] **Step 5: Install shared dependencies**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/shared && npm install`

Expected: installs lucide-react (no peer deps to resolve since they're already in the consumer apps)

- [ ] **Step 6: Commit**

```bash
git add local-ui-cc/shared/
git commit -m "feat: create shared-ui package foundation with Tailwind base config and CSS tokens"
```

---

### Task 2: Shared primitives — Button, Card, Badge

**Files:**
- Create: `local-ui-cc/shared/src/components/Button.tsx`
- Create: `local-ui-cc/shared/src/components/Card.tsx`
- Create: `local-ui-cc/shared/src/components/Badge.tsx`

- [ ] **Step 1: Build Button component**

```typescript
// Button.tsx
import { Spinner } from './Spinner';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/50',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-300',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent/50',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-btn',
  md: 'px-4 py-2 text-sm rounded-btn',
  lg: 'px-6 py-2.5 text-base rounded-btn',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Build Card component**

```typescript
// Card.tsx
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  children: ReactNode;
}

export function Card({ header, footer, hover = false, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-card shadow-card
        ${hover ? 'cursor-pointer transition-shadow hover:shadow-card-hover' : ''}
        ${className}`}
      {...props}
    >
      {header && (
        <div className="px-5 py-3 border-b border-slate-100 font-medium text-sm text-slate-700">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-card">
          {footer}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build Badge component**

```typescript
// Badge.tsx
type BadgeVariant = 'mdoc' | 'sd-jwt' | 'jwt-vc' | 'success' | 'error' | 'pending' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  mdoc: 'bg-blue-50 text-blue-600',
  'sd-jwt': 'bg-emerald-50 text-emerald-600',
  'jwt-vc': 'bg-amber-50 text-amber-600',
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-red-50 text-red-600',
  pending: 'bg-slate-100 text-slate-500',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add local-ui-cc/shared/src/components/Button.tsx local-ui-cc/shared/src/components/Card.tsx local-ui-cc/shared/src/components/Badge.tsx
git commit -m "feat: add shared Button, Card, and Badge primitives"
```

---

### Task 3: Shared primitives — Input, Textarea, Spinner, EmptyState

**Files:**
- Create: `local-ui-cc/shared/src/components/Input.tsx`
- Create: `local-ui-cc/shared/src/components/Textarea.tsx`
- Create: `local-ui-cc/shared/src/components/Spinner.tsx`
- Create: `local-ui-cc/shared/src/components/EmptyState.tsx`

- [ ] **Step 1: Build Input component**

```typescript
// Input.tsx
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({ label, helperText, error, className = '', ...props }: InputProps) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-sm border rounded-input transition-colors
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-accent/30'}
          outline-none ${className}`}
        {...props}
      />
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Build Textarea component**

```typescript
// Textarea.tsx
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 text-sm border rounded-input transition-colors resize-y
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-accent/30'}
          outline-none font-mono ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Build Spinner component**

```typescript
// Spinner.tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-9 h-9' };

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-current ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
```

- [ ] **Step 4: Build EmptyState component**

```typescript
// EmptyState.tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="w-12 h-12 text-slate-300 mb-4" />}
      <h3 className="text-lg font-semibold text-slate-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add local-ui-cc/shared/src/components/Input.tsx local-ui-cc/shared/src/components/Textarea.tsx local-ui-cc/shared/src/components/Spinner.tsx local-ui-cc/shared/src/components/EmptyState.tsx
git commit -m "feat: add shared Input, Textarea, Spinner, and EmptyState primitives"
```

---

### Task 4: Shared primitives — Toast, Tabs

**Files:**
- Create: `local-ui-cc/shared/src/components/Toast.tsx`
- Create: `local-ui-cc/shared/src/components/Tabs.tsx`

- [ ] **Step 1: Build Toast component (replace existing useToast/ToastContainer)**

```typescript
// Toast.tsx
import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

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

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const bgMap = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export function ToastContainer({ toasts, dismissToast }: {
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 animate-in">
      {toasts.map(t => {
        const Icon = iconMap[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-card shadow-toast text-white text-sm max-w-sm
              cursor-pointer animate-slide-in ${bgMap[t.type]}`}
            onClick={() => dismissToast(t.id)}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 break-words">{t.text}</span>
            <X className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70 hover:opacity-100" />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build Tabs component**

```typescript
// Tabs.tsx

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-slate-200 mb-5">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
            ${activeKey === tab.key
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create barrel export**

```typescript
// index.ts
export { Button } from './components/Button';
export { Card } from './components/Card';
export { Badge } from './components/Badge';
export { Input } from './components/Input';
export { Textarea } from './components/Textarea';
export { Spinner } from './components/Spinner';
export { EmptyState } from './components/EmptyState';
export { useToast, ToastContainer } from './components/Toast';
export type { ToastMessage } from './components/Toast';
export { Tabs } from './components/Tabs';
```

- [ ] **Step 4: Commit**

```bash
git add local-ui-cc/shared/src/components/Toast.tsx local-ui-cc/shared/src/components/Tabs.tsx local-ui-cc/shared/src/index.ts
git commit -m "feat: add shared Toast (with useToast hook) and Tabs primitives, barrel export"
```

---

### Task 5: Wallet UI — Tailwind setup and Vite config

**Files:**
- Create: `local-ui-cc/wallet-ui/tailwind.config.ts`
- Create: `local-ui-cc/wallet-ui/postcss.config.js`
- Create: `local-ui-cc/wallet-ui/src/styles/main.css`
- Modify: `local-ui-cc/wallet-ui/vite.config.ts`
- Modify: `local-ui-cc/wallet-ui/tsconfig.json`
- Modify: `local-ui-cc/wallet-ui/index.html`
- Modify: `local-ui-cc/wallet-ui/src/main.tsx`
- Modify: `local-ui-cc/wallet-ui/src/App.tsx`
- Delete: `local-ui-cc/wallet-ui/src/App.css`

- [ ] **Step 1: Add dependencies to wallet-ui**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui && npm install --save-dev tailwindcss@3 postcss autoprefixer @types/node`

Expected: installs tailwindcss, postcss, autoprefixer

- [ ] **Step 2: Create tailwind.config.ts**

```typescript
// wallet-ui/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../shared/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E293B',
        'primary-light': '#334155',
        surface: '#FFFFFF',
        'surface-alt': '#F8FAFC',
        border: '#E2E8F0',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        toast: '0 4px 16px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create postcss.config.js**

```javascript
// wallet-ui/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create main.css**

```css
/* wallet-ui/src/styles/main.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Wallet accent: blue */
  --color-accent: #3B82F6;
  --color-accent-hover: #2563EB;
}

body {
  @apply font-sans bg-surface-alt text-slate-800 antialiased;
}
```

- [ ] **Step 5: Update vite.config.ts to add shared alias**

```typescript
// wallet-ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
  },
});
```

Wait — `path` is a Node.js built-in but the project uses `"type": "module"`. Vite handles `__dirname` and `path` in vite.config.ts natively, but for safety, use `import.meta.url`:

```typescript
// wallet-ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 6: Update tsconfig.json to add path mapping**

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
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": ["src"]
}
```

Note: changed `noUnusedLocals` and `noUnusedParameters` to `false` to avoid errors during incremental migration.

- [ ] **Step 7: Update index.html to preload Inter font and update title**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <title>Identity Wallet</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Update main.tsx to import main.css instead of App.css**

```typescript
// wallet-ui/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: Update App.tsx — remove App.css import, import Toast from shared**

```typescript
// wallet-ui/src/App.tsx
import { useState, useCallback } from 'react';
import type { Screen } from './types';
import { setToken, clearToken, getToken } from './utils';
import { useToast, ToastContainer } from '@shared/components/Toast';
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

- [ ] **Step 10: Remove old App.css**

```bash
rm /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui/src/App.css
```

- [ ] **Step 11: Delete the old Toast.tsx (now using shared)**

```bash
rm /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui/src/components/Toast.tsx
```

- [ ] **Step 12: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 13: Commit**

```bash
git add local-ui-cc/wallet-ui/
git commit -m "feat: set up Tailwind CSS in wallet-ui with shared package alias and CSS tokens"
```

---

### Task 6: Wallet UI — Sidebar Layout

**Files:**
- Rewrite: `local-ui-cc/wallet-ui/src/components/Layout.tsx`

- [ ] **Step 1: Write the new sidebar Layout**

```typescript
// wallet-ui/src/components/Layout.tsx
import { useState } from 'react';
import type { Screen } from '../types';
import {
  Wallet, Gift, Presentation, Key, LogOut,
  Menu, X, ChevronLeft,
} from 'lucide-react';
import { Button } from '@shared/components/Button';

const NAV_ITEMS: { screen: Screen; label: string; icon: typeof Wallet }[] = [
  { screen: 'credentials', label: 'Credentials', icon: Wallet },
  { screen: 'claim', label: 'Claim Offer', icon: Gift },
  { screen: 'presentation', label: 'Presentation', icon: Presentation },
  { screen: 'keys-dids', label: 'Keys & DIDs', icon: Key },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 56;

export function Layout({ currentScreen, onNavigate, loggedIn, onLogout, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  loggedIn: boolean;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Login screen: no sidebar
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-primary text-slate-200 flex flex-col
          transition-all duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: sidebarWidth }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-700">
          {collapsed ? null : <span className="font-semibold text-sm tracking-wide">Identity Wallet</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => {
                  onNavigate(item.screen);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                  ${active
                    ? 'bg-primary-light text-white border-l-[3px] border-accent pl-[13px]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-l-[3px] border-transparent'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-red-400
              hover:bg-slate-800 rounded-btn transition-colors"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-primary text-white">
          <button onClick={() => setMobileOpen(true)} className="p-1">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Identity Wallet</span>
        </header>

        <main className="flex-1 p-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add local-ui-cc/wallet-ui/src/components/Layout.tsx
git commit -m "feat: rewrite wallet-ui Layout with sidebar navigation"
```

---

### Task 7: Wallet UI — LoginScreen and CredentialsScreen

**Files:**
- Rewrite: `local-ui-cc/wallet-ui/src/screens/LoginScreen.tsx`
- Create: `local-ui-cc/wallet-ui/src/components/CredentialCard.tsx`
- Rewrite: `local-ui-cc/wallet-ui/src/screens/CredentialsScreen.tsx`

- [ ] **Step 1: Rewrite LoginScreen with Tailwind**

```typescript
// wallet-ui/src/screens/LoginScreen.tsx
import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { register, login, getWallets } from '../api/wallet-api';
import { setToken } from '../utils';
import { Button, Input, Card } from '@shared';

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
      try { await register('Test', email, password); } catch { /* account likely exists */ }
      const token = await login(email, password);
      if (!token) throw new Error('Login returned no token');
      setToken(token);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Identity Wallet</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to manage your credentials</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In / Register'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
```

Note: `@shared` is aliased to `../shared/src` in vite.config.ts. Components are importable as `@shared/components/Button` etc., but `@shared` resolves to the barrel export from `../shared/src/index.ts`.

Actually, since the alias points directly to `../shared/src`, imports like `@shared/components/Button` work natively. And `@shared` alone imports from `index.ts` (barrel). Both work.

- [ ] **Step 2: Create CredentialCard component**

```typescript
// wallet-ui/src/components/CredentialCard.tsx
import type { CredentialCard as CredentialCardType } from '../types';
import { Card, Badge } from '@shared';
import { FileText, Calendar } from 'lucide-react';

interface Props {
  credential: CredentialCardType;
}

export function CredentialCard({ credential }: Props) {
  return (
    <Card hover className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="font-medium text-sm text-slate-800">{credential.type}</p>
          <p className="text-xs text-slate-400">{credential.issuer}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar className="w-3 h-3" />
          {new Date(credential.issuedAt).toLocaleDateString()}
        </div>
        <Badge variant={credential.format === 'mdoc' ? 'mdoc' : credential.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
          {credential.format === 'mdoc' ? 'mDoc' : credential.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
        </Badge>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Rewrite CredentialsScreen with Tailwind**

```typescript
// wallet-ui/src/screens/CredentialsScreen.tsx
import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { CredentialCard as CredentialCardType } from '../types';
import { getWallets } from '../api/wallet-api';
import { Card, Spinner, EmptyState } from '@shared';
import { ShieldOff } from 'lucide-react';
import { CredentialCard } from '../components/CredentialCard';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function CredentialsScreen({ walletId, addToast }: Props) {
  const [credentials, setCredentials] = useState<CredentialCardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCredentials(); }, [walletId]);

  async function loadCredentials() {
    setLoading(true);
    try {
      const data = await getWallets();
      const cards: CredentialCardType[] = (data.wallets || []).map((w: { id: string; name?: string }) => ({
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Credentials</h1>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : credentials.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldOff}
            title="No credentials yet"
            description="Claim a credential offer to get started."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {credentials.map((cred, i) => (
            <CredentialCard key={cred.id || i} credential={cred} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add local-ui-cc/wallet-ui/src/screens/LoginScreen.tsx local-ui-cc/wallet-ui/src/screens/CredentialsScreen.tsx local-ui-cc/wallet-ui/src/components/CredentialCard.tsx
git commit -m "feat: rewrite wallet-ui LoginScreen and CredentialsScreen with Tailwind and shared components"
```

---

### Task 8: Wallet UI — ClaimOfferScreen, PresentationScreen, KeysDidsScreen

**Files:**
- Rewrite: `local-ui-cc/wallet-ui/src/screens/ClaimOfferScreen.tsx`
- Rewrite: `local-ui-cc/wallet-ui/src/screens/PresentationScreen.tsx`
- Rewrite: `local-ui-cc/wallet-ui/src/screens/KeysDidsScreen.tsx`

- [ ] **Step 1: Rewrite ClaimOfferScreen**

```typescript
// wallet-ui/src/screens/ClaimOfferScreen.tsx
import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { useOfferRequest } from '../api/wallet-api';
import { Button, Textarea, Card } from '@shared';
import { CheckCircle } from 'lucide-react';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function ClaimOfferScreen({ walletId, addToast }: Props) {
  const [offerUri, setOfferUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  async function handleClaim() {
    if (!offerUri.trim()) {
      addToast('Please paste a credential offer URI', 'error');
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const creds = await useOfferRequest(walletId, offerUri.trim());
      setResult(JSON.stringify(creds, null, 2));
      addToast(`Credential claimed! ID: ${creds[0]?.id?.slice(0, 20)}...`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Claim Credential Offer</h1>

      {!result ? (
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-sm font-semibold text-accent">1</span>
          </div>
          <div className="flex-1">
            <Card>
              <Textarea
                label="Offer URI"
                rows={3}
                value={offerUri}
                onChange={e => setOfferUri(e.target.value)}
                placeholder="Paste credential offer URI here (e.g., openid-credential-offer://...)"
              />
              <Button onClick={handleClaim} loading={loading}>
                {loading ? 'Claiming...' : 'Claim Credential'}
              </Button>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
            <div>
              <h3 className="font-semibold text-slate-800">Credential Claimed</h3>
              <p className="text-sm text-slate-500">Credential has been added to your wallet</p>
            </div>
          </div>
          <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-80">
            {result}
          </pre>
          <Button variant="outline" onClick={() => { setResult(''); setOfferUri(''); }} className="mt-3">
            Claim Another
          </Button>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite PresentationScreen**

```typescript
// wallet-ui/src/screens/PresentationScreen.tsx
import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { resolvePresentationRequest, matchCredentialsForPresentationDefinition, usePresentationRequest } from '../api/wallet-api';
import { fixUrlForHost } from '../utils';
import { Button, Card, Textarea, Input, Badge } from '@shared';
import { CheckCircle, ChevronRight } from 'lucide-react';

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
      const resolved = await resolvePresentationRequest(walletId, authRequest.trim());
      setResolvedRequest(resolved);
      let credId = '';
      try {
        const pdUriMatch = authRequest.match(/presentation_definition_uri=([^&]+)/);
        if (pdUriMatch) {
          const pdUri = decodeURIComponent(pdUriMatch[1]);
          const pdResp = await fetch(fixUrlForHost(pdUri));
          const presDef = await pdResp.json();
          const matched = await matchCredentialsForPresentationDefinition(walletId, presDef);
          credId = matched[0]?.id || '';
        }
      } catch { /* non-critical */ }
      if (!credId) addToast('Could not auto-match credentials. Please enter a credential ID manually.', 'info');
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
    if (!matchedCred.trim()) { addToast('Please enter a credential ID', 'error'); return; }
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
    setAuthRequest(''); setResolvedRequest(''); setMatchedCred('');
    setPresentationResult(null); setStep('input');
  }

  const steps = [
    { num: 1, label: 'Paste Request', done: step !== 'input' },
    { num: 2, label: 'Review', done: step === 'done' },
    { num: 3, label: 'Complete', done: false },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Presentation Request</h1>

      {/* Step indicator */}
      <div className="flex gap-2 mb-5">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
              ${step === (s.num === 1 ? 'input' : s.num === 2 ? 'review' : 'done') || s.done
                ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500'}`}>
              {s.done ? '✓' : s.num}
            </div>
            <span className={`text-xs ${step === (s.num === 1 ? 'input' : s.num === 2 ? 'review' : 'done') ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      {step === 'input' && (
        <Card>
          <Textarea
            label="Authorization Request URL"
            rows={3}
            value={authRequest}
            onChange={e => setAuthRequest(e.target.value)}
            placeholder="Paste the authorization request URL from the Verifier..."
          />
          <Button onClick={handleResolve} loading={loading}>
            {loading ? 'Resolving...' : 'Review Request'}
          </Button>
        </Card>
      )}

      {step === 'review' && (
        <Card header={<span className="font-medium">Review Presentation</span>}>
          <Input
            label="Credential ID to present"
            value={matchedCred}
            onChange={e => setMatchedCred(e.target.value)}
            placeholder="Credential ID"
          />
          <details className="mt-3">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Resolved request details</summary>
            <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-48 mt-2">
              {resolvedRequest.slice(0, 500)}...
            </pre>
          </details>
          <div className="flex gap-2 mt-4">
            <Button onClick={handlePresent} loading={loading}>{loading ? 'Presenting...' : 'Approve & Present'}</Button>
            <Button variant="secondary" onClick={handleReset}>Back</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
            <div>
              <h3 className="font-semibold text-slate-800">Presentation Complete</h3>
              <p className="text-sm text-slate-500">Credential shared successfully</p>
            </div>
          </div>
          <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-80">
            {JSON.stringify(presentationResult, null, 2)}
          </pre>
          <Button variant="outline" onClick={handleReset} className="mt-3">New Presentation</Button>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite KeysDidsScreen**

```typescript
// wallet-ui/src/screens/KeysDidsScreen.tsx
import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { getKeys, getDids } from '../api/wallet-api';
import { Card, Button, Spinner } from '@shared';
import { Key, Globe } from 'lucide-react';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function KeysDidsScreen({ walletId, addToast }: Props) {
  const [keys, setKeys] = useState<unknown[]>([]);
  const [dids, setDids] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [walletId]);

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

  const keyRows = keys.map((key: any) => ({
    id: key.keyId?.id || key.id || '-',
    type: key.keyId?.type || key.type || '-',
  }));

  const didRows = dids.map((did: any) => ({
    did: did.did || '-',
    alias: did.alias || '-',
    isDefault: did.default ? 'Yes' : 'No',
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Keys & DIDs</h1>
        <Button size="sm" variant="secondary" onClick={loadData}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-5">
          <Card header={<div className="flex items-center gap-2"><Key className="w-4 h-4" /> Keys</div>}>
            {keyRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No keys found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-500">Key ID</th>
                    <th className="text-left py-2 font-medium text-slate-500">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {keyRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs">{row.id}</td>
                      <td className="py-2 text-xs">{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card header={<div className="flex items-center gap-2"><Globe className="w-4 h-4" /> DIDs</div>}>
            {didRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No DIDs found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-500">DID</th>
                    <th className="text-left py-2 font-medium text-slate-500">Alias</th>
                    <th className="text-left py-2 font-medium text-slate-500">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {didRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs max-w-[200px] truncate">{row.did}</td>
                      <td className="py-2 text-xs">{row.alias}</td>
                      <td className="py-2">
                        <span className={`text-xs font-medium ${row.isDefault === 'Yes' ? 'text-success' : 'text-slate-400'}`}>
                          {row.isDefault}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add local-ui-cc/wallet-ui/src/screens/
git commit -m "feat: rewrite wallet-ui ClaimOffer, Presentation, and KeysDids screens with Tailwind"
```

---

### Task 9: Issuer UI — Tailwind setup

**Files:**
- Create: `local-ui-cc/issuer-ui/tailwind.config.ts`
- Create: `local-ui-cc/issuer-ui/postcss.config.js`
- Create: `local-ui-cc/issuer-ui/src/styles/main.css`
- Modify: `local-ui-cc/issuer-ui/vite.config.ts`
- Modify: `local-ui-cc/issuer-ui/tsconfig.json`
- Modify: `local-ui-cc/issuer-ui/index.html`
- Modify: `local-ui-cc/issuer-ui/src/main.tsx`
- Modify: `local-ui-cc/issuer-ui/src/App.tsx`
- Delete: `local-ui-cc/issuer-ui/src/App.css`
- Delete: `local-ui-cc/issuer-ui/src/components/Toast.tsx`

- [ ] **Step 1: Install dependencies**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/issuer-ui && npm install --save-dev tailwindcss@3 postcss autoprefixer`

- [ ] **Step 2: Create tailwind.config.ts**

```typescript
// issuer-ui/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../shared/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E293B',
        'primary-light': '#334155',
        surface: '#FFFFFF',
        'surface-alt': '#F8FAFC',
        border: '#E2E8F0',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px',
      },
      borderRadius: {
        card: '8px', btn: '6px', input: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        toast: '0 4px 16px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create postcss.config.js**

```javascript
// issuer-ui/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create main.css**

```css
/* issuer-ui/src/styles/main.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Issuer accent: violet */
  --color-accent: #8B5CF6;
  --color-accent-hover: #7C3AED;
}

body {
  @apply font-sans bg-surface-alt text-slate-800 antialiased;
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
// issuer-ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5174,
  },
});
```

- [ ] **Step 6: Update tsconfig.json**

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
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Update index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <title>Issuer Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Update main.tsx to import main.css instead of App.css**

```typescript
// issuer-ui/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: Update App.tsx — remove App.css import, import Toast from shared**

```typescript
// issuer-ui/src/App.tsx
import { useState } from 'react';
import type { Screen } from './types';
import { useToast, ToastContainer } from '@shared/components/Toast';
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

- [ ] **Step 10: Remove old App.css and old Toast.tsx**

```bash
rm /home/lin/linwork/git/waltid-identity/local-ui-cc/issuer-ui/src/App.css
rm /home/lin/linwork/git/waltid-identity/local-ui-cc/issuer-ui/src/components/Toast.tsx
```

- [ ] **Step 11: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/issuer-ui && npx tsc --noEmit`

- [ ] **Step 12: Commit**

```bash
git add local-ui-cc/issuer-ui/
git commit -m "feat: set up Tailwind CSS in issuer-ui with violet accent"
```

---

### Task 10: Issuer UI — Layout and screens

**Files:**
- Rewrite: `local-ui-cc/issuer-ui/src/components/Layout.tsx`
- Rewrite: `local-ui-cc/issuer-ui/src/screens/DashboardScreen.tsx`
- Rewrite: `local-ui-cc/issuer-ui/src/screens/IssueCredentialScreen.tsx`
- Rewrite: `local-ui-cc/issuer-ui/src/screens/OffersScreen.tsx`

- [ ] **Step 1: Rewrite Layout**

```typescript
// issuer-ui/src/components/Layout.tsx
import { useState } from 'react';
import type { Screen } from '../types';
import { LayoutDashboard, BadgePlus, ListOrdered, Menu, X, ChevronLeft } from 'lucide-react';

const NAV_ITEMS: { screen: Screen; label: string; icon: typeof LayoutDashboard }[] = [
  { screen: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { screen: 'issue', label: 'Issue Credential', icon: BadgePlus },
  { screen: 'offers', label: 'Offers', icon: ListOrdered },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 56;

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-primary text-slate-200 flex flex-col
          transition-all duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-700">
          {collapsed ? null : <span className="font-semibold text-sm tracking-wide">Issuer Portal</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => {
                  onNavigate(item.screen);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                  ${active
                    ? 'bg-primary-light text-white border-l-[3px] border-accent pl-[13px]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-l-[3px] border-transparent'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-primary text-white">
          <button onClick={() => setMobileOpen(true)} className="p-1"><Menu className="w-5 h-5" /></button>
          <span className="font-semibold text-sm">Issuer Portal</span>
        </header>
        <main className="flex-1 p-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite DashboardScreen**

```typescript
// issuer-ui/src/screens/DashboardScreen.tsx
import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { OnboardingState } from '../types';
import { loadOnboardingState, saveOnboardingState } from '../utils';
import { createIaca, createDocumentSigner, onboardIssuer, getWellKnown } from '../api/issuer-api';
import { Card, Button, Badge, Spinner } from '@shared';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function DashboardScreen({ addToast }: Props) {
  const [state, setState] = useState<OnboardingState>(loadOnboardingState);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [wellKnown, setWellKnown] = useState('');

  useEffect(() => { saveOnboardingState(state); }, [state]);

  useEffect(() => {
    getWellKnown().then(data => setWellKnown(JSON.stringify(data, null, 2))).catch(() => {});
  }, []);

  async function handleOnboardMdoc() {
    setLoading(prev => ({ ...prev, mdoc: true }));
    try {
      const iaca = await createIaca('US', 'Test IACA');
      const ds = await createDocumentSigner(iaca.iacaKey, iaca.certificateData, 'US', 'Test DS');
      const newState: OnboardingState = {
        ...state, iacaKey: iaca.iacaKey, iacaCertData: iaca.certificateData,
        iacaCertPem: iaca.certificatePEM, dsKey: ds.documentSignerKey, dsCertPem: ds.certificatePEM,
      };
      setState(newState);
      addToast('mDoc onboarding complete (IACA + DS)', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'mDoc onboarding failed', 'error');
    } finally {
      setLoading(prev => ({ ...prev, mdoc: false }));
    }
  }

  async function handleOnboardIssuer() {
    setLoading(prev => ({ ...prev, issuer: true }));
    try {
      const result = await onboardIssuer();
      const newState: OnboardingState = { ...state, issuerKey: result.issuerKey, issuerDid: result.issuerDid };
      setState(newState);
      addToast(`Issuer onboarded. DID: ${result.issuerDid}`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Issuer onboarding failed', 'error');
    } finally {
      setLoading(prev => ({ ...prev, issuer: false }));
    }
  }

  const mdocReady = !!(state.iacaKey && state.dsKey);
  const issuerReady = !!(state.issuerKey && state.issuerDid);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Dashboard</h1>

      <Card header={<span className="font-medium">Onboarding Status</span>} className="mb-5">
        <div className="flex flex-col gap-4">
          {/* mDoc row */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-card">
            <div className="flex items-center gap-3">
              <Badge variant="mdoc">mDoc</Badge>
              <div>
                <div className="flex items-center gap-1.5">
                  {mdocReady
                    ? <CheckCircle2 className="w-4 h-4 text-success" />
                    : <XCircle className="w-4 h-4 text-slate-300" />
                  }
                  <span className={`text-sm font-medium ${mdocReady ? 'text-success' : 'text-slate-500'}`}>
                    {mdocReady ? 'Ready' : 'Not onboarded'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  IACA: {state.iacaCertData ? 'configured' : 'missing'} · DS: {state.dsKey ? 'configured' : 'missing'}
                </p>
              </div>
            </div>
            <Button size="sm" variant={mdocReady ? 'outline' : 'primary'} onClick={handleOnboardMdoc} loading={loading.mdoc}>
              {loading.mdoc ? 'Onboarding...' : mdocReady ? 'Re-onboard' : 'Onboard'}
            </Button>
          </div>

          {/* SD-JWT / JWT row */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-card">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Badge variant="sd-jwt">SD-JWT</Badge>
                <Badge variant="jwt-vc">JWT VC</Badge>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  {issuerReady
                    ? <CheckCircle2 className="w-4 h-4 text-success" />
                    : <XCircle className="w-4 h-4 text-slate-300" />
                  }
                  <span className={`text-sm font-medium ${issuerReady ? 'text-success' : 'text-slate-500'}`}>
                    {issuerReady ? 'Ready' : 'Not onboarded'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Key: {state.issuerKey ? 'configured' : 'missing'} · DID: {state.issuerDid ? state.issuerDid.slice(0, 20) + '...' : 'missing'}
                </p>
              </div>
            </div>
            <Button size="sm" variant={issuerReady ? 'outline' : 'primary'} onClick={handleOnboardIssuer} loading={loading.issuer}>
              {loading.issuer ? 'Onboarding...' : issuerReady ? 'Re-onboard' : 'Onboard'}
            </Button>
          </div>
        </div>
      </Card>

      {wellKnown && (
        <Card header={<span className="font-medium">Well-Known Configuration</span>}>
          <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-72">
            {wellKnown}
          </pre>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite IssueCredentialScreen**

```typescript
// issuer-ui/src/screens/IssueCredentialScreen.tsx
import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { CredentialFormat } from '../types';
import { loadOnboardingState, loadOffers, saveOffers } from '../utils';
import { issueMdoc, issueSdJwt, issueJwtVc, getCredentialOffer } from '../api/issuer-api';
import { Card, Button, Tabs, Input } from '@shared';
import { Copy, CheckCircle } from 'lucide-react';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

const FORMAT_TABS = [
  { key: 'mdoc', label: 'mDoc (ISO 18013-5)' },
  { key: 'sd-jwt', label: 'SD-JWT VC' },
  { key: 'jwt-vc', label: 'JWT VC/VP' },
];

export function IssueCredentialScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUri, setResultUri] = useState('');
  const [offerContent, setOfferContent] = useState('');

  async function handleIssue() {
    setLoading(true);
    setResultUri('');
    setOfferContent('');
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

      const offerIdMatch = offerUri.match(/id=([^&]+)/);
      const offerId = offerIdMatch ? offerIdMatch[1] : '';
      const offers = loadOffers();
      offers.unshift({ id: offerId, uri: offerUri, format, timestamp: new Date().toISOString() });
      saveOffers(offers);

      if (offerId) {
        try {
          const content = await getCredentialOffer(offerId);
          setOfferContent(JSON.stringify(content, null, 2));
        } catch { /* non-critical */ }
      }

      addToast('Credential offer created', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Issuance failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Issue Credential</h1>

      <Card>
        <Tabs tabs={FORMAT_TABS} activeKey={format} onChange={(k) => setFormat(k as CredentialFormat)} />

        <p className="text-sm text-slate-500 mb-4">
          {format === 'mdoc' && "Issues an ISO 18013-5 mobile Driver's License credential with IACA → DS certificate chain."}
          {format === 'sd-jwt' && 'Issues an SD-JWT VC identity credential with selective disclosure on birthdate and family_name.'}
          {format === 'jwt-vc' && 'Issues a W3C Verifiable Credential (UniversityDegree) with Presentation Exchange.'}
        </p>

        <Button onClick={handleIssue} loading={loading}>
          {loading ? 'Issuing...' : `Issue ${format.toUpperCase()} Credential`}
        </Button>
      </Card>

      {resultUri && (
        <Card header={<span className="font-medium">Credential Offer URI</span>} className="mt-5">
          <div className="flex gap-2">
            <Input
              value={resultUri}
              readOnly
              className="font-mono"
            />
            <Button
              size="md"
              variant="secondary"
              onClick={() => { navigator.clipboard.writeText(resultUri); addToast('Copied to clipboard', 'success'); }}
              className="shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
          </div>
        </Card>
      )}

      {offerContent && (
        <Card header={<span className="font-medium">Offer Content</span>} className="mt-5">
          <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-96">
            {offerContent}
          </pre>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite OffersScreen**

```typescript
// issuer-ui/src/screens/OffersScreen.tsx
import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { IssuedOffer } from '../types';
import { loadOffers } from '../utils';
import { getCredentialOffer } from '../api/issuer-api';
import { Card, Button, Badge, EmptyState } from '@shared';
import { ReceiptText } from 'lucide-react';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function OffersScreen(_props: Props) {
  const [offers, setOffers] = useState<IssuedOffer[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offerDetails, setOfferDetails] = useState<Record<string, unknown>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { setOffers(loadOffers()); }, []);

  async function handleViewDetails(offerId: string) {
    if (expandedId === offerId) { setExpandedId(null); return; }
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Active Offers</h1>

      {offers.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title="No offers yet"
            description="Go to Issue Credential to create your first offer."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((offer, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={offer.format === 'mdoc' ? 'mdoc' : offer.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
                    {offer.format === 'mdoc' ? 'mDoc' : offer.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
                  </Badge>
                  <div>
                    <p className="font-mono text-xs text-slate-600">
                      {offer.id ? offer.id.slice(0, 30) + '...' : '(no ID)'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(offer.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleViewDetails(offer.id)}>
                  {expandedId === offer.id ? 'Hide' : 'View Details'}
                </Button>
              </div>

              {expandedId === offer.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Offer URI</p>
                    <p className="font-mono text-xs text-slate-600 break-all bg-slate-50 p-2 rounded">
                      {offer.uri}
                    </p>
                  </div>
                  {loadingDetail && <p className="text-xs text-slate-400">Loading details...</p>}
                  {offerDetails[offer.id] && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Offer Content</p>
                      <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-72">
                        {JSON.stringify(offerDetails[offer.id], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/issuer-ui && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add local-ui-cc/issuer-ui/src/
git commit -m "feat: rewrite issuer-ui Layout and all screens with Tailwind"
```

---

### Task 11: Verifier UI — Tailwind setup

**Files:**
- Create: `local-ui-cc/verifier-ui/tailwind.config.ts`
- Create: `local-ui-cc/verifier-ui/postcss.config.js`
- Create: `local-ui-cc/verifier-ui/src/styles/main.css`
- Modify: `local-ui-cc/verifier-ui/vite.config.ts`
- Modify: `local-ui-cc/verifier-ui/tsconfig.json`
- Modify: `local-ui-cc/verifier-ui/index.html`
- Modify: `local-ui-cc/verifier-ui/src/main.tsx`
- Modify: `local-ui-cc/verifier-ui/src/App.tsx`
- Delete: `local-ui-cc/verifier-ui/src/App.css`
- Delete: `local-ui-cc/verifier-ui/src/components/Toast.tsx`

- [ ] **Step 1: Install dependencies**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/verifier-ui && npm install --save-dev tailwindcss@3 postcss autoprefixer`

- [ ] **Step 2: Create tailwind.config.ts**

```typescript
// verifier-ui/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../shared/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E293B',
        'primary-light': '#334155',
        surface: '#FFFFFF',
        'surface-alt': '#F8FAFC',
        border: '#E2E8F0',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px',
      },
      borderRadius: {
        card: '8px', btn: '6px', input: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        toast: '0 4px 16px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create postcss.config.js**

```javascript
// verifier-ui/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create main.css**

```css
/* verifier-ui/src/styles/main.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Verifier accent: amber */
  --color-accent: #F59E0B;
  --color-accent-hover: #D97706;
}

body {
  @apply font-sans bg-surface-alt text-slate-800 antialiased;
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
// verifier-ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5175,
  },
});
```

- [ ] **Step 6: Update tsconfig.json**

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
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Update index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <title>Verifier Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Update main.tsx to import main.css instead of App.css**

```typescript
// verifier-ui/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: Update App.tsx — remove App.css import, import Toast from shared**

```typescript
// verifier-ui/src/App.tsx
import { useState } from 'react';
import type { Screen } from './types';
import { useToast, ToastContainer } from '@shared/components/Toast';
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

- [ ] **Step 10: Remove old App.css and old Toast.tsx**

```bash
rm /home/lin/linwork/git/waltid-identity/local-ui-cc/verifier-ui/src/App.css
rm /home/lin/linwork/git/waltid-identity/local-ui-cc/verifier-ui/src/components/Toast.tsx
```

- [ ] **Step 11: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/verifier-ui && npx tsc --noEmit`

- [ ] **Step 12: Commit**

```bash
git add local-ui-cc/verifier-ui/
git commit -m "feat: set up Tailwind CSS in verifier-ui with amber accent"
```

---

### Task 12: Verifier UI — Layout and screens

**Files:**
- Rewrite: `local-ui-cc/verifier-ui/src/components/Layout.tsx`
- Rewrite: `local-ui-cc/verifier-ui/src/screens/NewRequestScreen.tsx`
- Rewrite: `local-ui-cc/verifier-ui/src/screens/SessionsScreen.tsx`

- [ ] **Step 1: Rewrite Layout**

```typescript
// verifier-ui/src/components/Layout.tsx
import { useState } from 'react';
import type { Screen } from '../types';
import { PlusCircle, History, Menu, X, ChevronLeft } from 'lucide-react';

const NAV_ITEMS: { screen: Screen; label: string; icon: typeof PlusCircle }[] = [
  { screen: 'new-request', label: 'New Request', icon: PlusCircle },
  { screen: 'sessions', label: 'Sessions', icon: History },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 56;

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-primary text-slate-200 flex flex-col
          transition-all duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-700">
          {collapsed ? null : <span className="font-semibold text-sm tracking-wide">Verifier Portal</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => {
                  onNavigate(item.screen);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                  ${active
                    ? 'bg-primary-light text-white border-l-[3px] border-accent pl-[13px]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-l-[3px] border-transparent'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-primary text-white">
          <button onClick={() => setMobileOpen(true)} className="p-1"><Menu className="w-5 h-5" /></button>
          <span className="font-semibold text-sm">Verifier Portal</span>
        </header>
        <main className="flex-1 p-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite NewRequestScreen**

```typescript
// verifier-ui/src/screens/NewRequestScreen.tsx
import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { CredentialFormat, VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { createMdocAuthRequest, createSdJwtAuthRequest, createJwtVcAuthRequest } from '../api/verifier-api';
import { Card, Button, Tabs, Input, Textarea } from '@shared';
import { Copy } from 'lucide-react';

const MDOC_FIELDS = ['family_name', 'given_name', 'birth_date', 'document_number', 'issue_date', 'expiry_date', 'issuing_country', 'issuing_authority'];
const SDJWT_FIELDS = ['given_name', 'family_name', 'birthdate', 'email', 'phone_number'];

const FORMAT_TABS = [
  { key: 'mdoc', label: 'mDoc (ISO 18013-7)' },
  { key: 'sd-jwt', label: 'SD-JWT VC' },
  { key: 'jwt-vc', label: 'JWT VC/VP' },
];

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function NewRequestScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [iacaCertPem, setIacaCertPem] = useState('');
  const [selectedMdocFields, setSelectedMdocFields] = useState<string[]>(['family_name', 'given_name']);
  const [selectedSdJwtFields, setSelectedSdJwtFields] = useState<string[]>(['given_name', 'birthdate']);
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

      const stateMatch = url.match(/state=([^&]+)/) || url.match(/request_uri=.*\/([^/&?]+)/);
      const state = stateMatch ? stateMatch[1] : '';
      const session: VerificationSession = {
        state, format, timestamp: new Date().toISOString(), requestUrl: url,
      };
      const sessions = loadSessions();
      sessions.unshift(session);
      saveSessions(sessions);

      addToast('Authorization request created', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to create request', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-5">New Verification Request</h1>

      <Card>
        <Tabs tabs={FORMAT_TABS} activeKey={format} onChange={(k) => setFormat(k as CredentialFormat)} />

        {format === 'mdoc' && (
          <div className="mb-4">
            <Textarea
              label="IACA Certificate PEM"
              rows={4}
              value={iacaCertPem}
              onChange={e => setIacaCertPem(e.target.value)}
              placeholder="Paste the IACA certificate PEM from the Issuer's onboarding..."
            />
            <label className="block text-xs font-semibold text-slate-600 mb-2 mt-3">Fields to request</label>
            <div className="grid grid-cols-2 gap-1.5">
              {MDOC_FIELDS.map(f => (
                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-btn hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedMdocFields.includes(f)}
                    onChange={() => toggle(selectedMdocFields, setSelectedMdocFields, f)}
                    className="rounded border-slate-300 text-accent focus:ring-accent/30"
                  />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'sd-jwt' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Fields to request</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SDJWT_FIELDS.map(f => (
                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-btn hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedSdJwtFields.includes(f)}
                    onChange={() => toggle(selectedSdJwtFields, setSelectedSdJwtFields, f)}
                    className="rounded border-slate-300 text-accent focus:ring-accent/30"
                  />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'jwt-vc' && (
          <div className="mb-4">
            <Input
              label="Credential Type"
              value={credentialType}
              onChange={e => setCredentialType(e.target.value)}
            />
          </div>
        )}

        <Button onClick={handleCreate} loading={loading}>
          {loading ? 'Creating...' : 'Create Authorization Request'}
        </Button>
      </Card>

      {resultUrl && (
        <Card header={<span className="font-medium">Authorization Request URL</span>} className="mt-5">
          <div className="flex gap-2">
            <Textarea
              value={resultUrl}
              readOnly
              rows={3}
            />
            <Button
              size="md"
              variant="secondary"
              onClick={() => { navigator.clipboard.writeText(resultUrl); addToast('Copied to clipboard', 'success'); }}
              className="shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Paste this URL into the Wallet app's Presentation screen to fulfill the request.
          </p>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite SessionsScreen**

```typescript
// verifier-ui/src/screens/SessionsScreen.tsx
import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { getSession } from '../api/verifier-api';
import { Card, Button, Badge, EmptyState } from '@shared';
import { History, Circle } from 'lucide-react';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function SessionsScreen({ addToast }: Props) {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [polling, setPolling] = useState<Record<string, boolean>>({});

  useEffect(() => { setSessions(loadSessions()); }, []);

  async function handlePoll(session: VerificationSession, index: number) {
    if (!session.state) { addToast('No session state to poll', 'error'); return; }
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
      addToast(err instanceof Error ? err.message : 'Poll failed', 'error');
    } finally {
      setPolling(prev => ({ ...prev, [session.state]: false }));
    }
  }

  function clearSessions() {
    setSessions([]);
    saveSessions([]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Verification Sessions</h1>
        {sessions.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearSessions}>Clear All</Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="No sessions yet"
            description="Create a New Request first to start verifying credentials."
          />
        </Card>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Format</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Session ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant={s.format === 'mdoc' ? 'mdoc' : s.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
                        {s.format === 'mdoc' ? 'mDoc' : s.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {s.state ? s.state.slice(0, 20) + '...' : '(none)'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {s.result === undefined ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Circle className="w-2 h-2 fill-slate-300 text-slate-300 animate-pulse" />
                          Pending
                        </span>
                      ) : s.result ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                          <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error">
                          <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handlePoll(s, i)} loading={polling[s.state]}>
                        Poll
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sessions.some(s => s.resultData) && (
            <Card header={<span className="font-medium">Result Data</span>} className="mt-5">
              {sessions.filter(s => s.resultData).map((s, i) => (
                <details key={i} className="mb-2 last:mb-0">
                  <summary className="text-sm cursor-pointer text-slate-600 hover:text-slate-800 py-1">
                    <span className="inline-flex items-center gap-2">
                      <Badge variant={s.format === 'mdoc' ? 'mdoc' : s.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
                        {s.format === 'mdoc' ? 'mDoc' : s.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
                      </Badge>
                      {new Date(s.timestamp).toLocaleString()}
                    </span>
                  </summary>
                  <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-72 mt-2">
                    {JSON.stringify(s.resultData, null, 2)}
                  </pre>
                </details>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc/verifier-ui && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add local-ui-cc/verifier-ui/src/
git commit -m "feat: rewrite verifier-ui Layout and all screens with Tailwind"
```

---

### Task 13: Integration verification — start all apps

**Files:**
- Modify: `local-ui-cc/start-all.sh` (optional — update ports if changed)

- [ ] **Step 1: Start all three apps**

Run: `cd /home/lin/linwork/git/waltid-identity/local-ui-cc && bash start-all.sh`

Expected: All three Vite dev servers start without errors:
- Wallet UI: http://localhost:5173
- Issuer UI: http://localhost:5174
- Verifier UI: http://localhost:5175

- [ ] **Step 2: Check browser console for errors**

Open each URL in a browser. Check there are no console errors, no missing imports, and Tailwind styles are applied.

- [ ] **Step 3: Verify responsive behavior**

Resize browser to mobile width (< 768px). Verify:
- Sidebar hides, hamburger menu appears
- Content stacks vertically
- Tables scroll horizontally if needed

- [ ] **Step 4: Verify all screens render**

Wallet UI:
- Login screen shows centered card with Inter font
- After login: sidebar navigation, Credentials screen, Claim Offer, Presentation, Keys & DIDs

Issuer UI:
- Dashboard, Issue Credential, Offers screens

Verifier UI:
- New Request, Sessions screens

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration polish from visual verification"
```

---

### Task 14: Polish pass

**Files:**
- Modify: CSS/animation tweaks across all apps
- Modify: `local-ui-cc/shared/src/styles/tokens.css`

- [ ] **Step 1: Add page transition**

```css
/* Add to each app's main.css */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

main > * {
  animation: fade-in 0.2s ease-out;
}
```

- [ ] **Step 2: Add hover transitions to all interactive elements**

Already covered by Tailwind's `transition-colors` on buttons and cards. Verify no elements are missing.

- [ ] **Step 3: Update Toast with exit animation**

In `local-ui-cc/shared/src/components/Toast.tsx`, add an exiting state and animation. Replace the `addToast` setTimeout and the `dismissToast` calls to trigger exit animation before removal:

```typescript
// Add to Toast.tsx, replace useToast hook:
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [exiting, setExiting] = useState<Set<number>>(new Set());

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'error') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setExiting(prev => new Set(prev).add(id));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        setExiting(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 200);
    }, 4600);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setExiting(prev => new Set(prev).add(id));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setExiting(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  return { toasts, addToast, dismissToast, exiting };
}

// Update ToastContainer to use exiting state:
export function ToastContainer({ toasts, dismissToast, exiting }: {
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
  exiting: Set<number>;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2">
      {toasts.map(t => {
        const Icon = iconMap[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-card shadow-toast text-white text-sm max-w-sm
              cursor-pointer ${exiting.has(t.id) ? 'animate-slide-out' : 'animate-slide-in'} ${bgMap[t.type]}`}
            onClick={() => dismissToast(t.id)}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 break-words">{t.text}</span>
            <X className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70 hover:opacity-100" />
          </div>
        );
      })}
    </div>
  );
}
```

Add to tailwind configs across all three apps:
```typescript
keyframes: {
  'slide-in': {
    from: { transform: 'translateX(100%)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' },
  },
  'slide-out': {
    from: { transform: 'translateX(0)', opacity: '1' },
    to: { transform: 'translateX(100%)', opacity: '0' },
  },
},
animation: {
  'slide-in': 'slide-in 0.2s ease-out',
  'slide-out': 'slide-out 0.2s ease-in',
},
```

Update all three App.tsx files to pass `exiting` to ToastContainer:
```typescript
const { toasts, addToast, dismissToast, exiting } = useToast();
// ...
<ToastContainer toasts={toasts} dismissToast={dismissToast} exiting={exiting} />
```

- [ ] **Step 4: Polish micro-copy**

Review all screen text for consistency:
- Use sentence case for descriptions
- Use title case for headings
- Consistent tone across all three apps

- [ ] **Step 5: Final TypeScript check on all three apps**

Run:
```bash
cd /home/lin/linwork/git/waltid-identity/local-ui-cc/wallet-ui && npx tsc --noEmit
cd /home/lin/linwork/git/waltid-identity/local-ui-cc/issuer-ui && npx tsc --noEmit
cd /home/lin/linwork/git/waltid-identity/local-ui-cc/verifier-ui && npx tsc --noEmit
```

Expected: all pass with no errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: polish pass — transitions, animations, micro-copy consistency"
```

---

## Implementation Order

1. Task 1: Shared package foundation
2. Task 2: Shared primitives — Button, Card, Badge
3. Task 3: Shared primitives — Input, Textarea, Spinner, EmptyState
4. Task 4: Shared primitives — Toast, Tabs, barrel export
5. Task 5: Wallet UI — Tailwind setup
6. Task 6: Wallet UI — Sidebar Layout
7. Task 7: Wallet UI — LoginScreen + CredentialsScreen
8. Task 8: Wallet UI — ClaimOffer + Presentation + KeysDids
9. Task 9: Issuer UI — Tailwind setup
10. Task 10: Issuer UI — Layout + screens
11. Task 11: Verifier UI — Tailwind setup
12. Task 12: Verifier UI — Layout + screens
13. Task 13: Integration verification
14. Task 14: Polish pass
