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
