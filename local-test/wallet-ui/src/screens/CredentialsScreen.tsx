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
      const data = await getWallets();
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
