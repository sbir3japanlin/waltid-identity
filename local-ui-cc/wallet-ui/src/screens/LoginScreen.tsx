import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { register, login, getWallets } from '../api/wallet-api';
import { setToken } from '../utils';

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
