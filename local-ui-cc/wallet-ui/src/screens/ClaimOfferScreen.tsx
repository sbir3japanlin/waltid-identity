import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { useOfferRequest } from '../api/wallet-api';

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

      {result ? (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Claimed Credential</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
            {result}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
