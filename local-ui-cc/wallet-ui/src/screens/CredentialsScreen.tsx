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
            icon={ShieldOff as any}
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
