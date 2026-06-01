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
