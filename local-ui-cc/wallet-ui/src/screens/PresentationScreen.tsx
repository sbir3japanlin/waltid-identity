import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
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
      const resolved = await resolvePresentationRequest(walletId, authRequest.trim());
      setResolvedRequest(resolved);

      let credId = '';
      try {
        const pdUriMatch = authRequest.match(/presentation_definition_uri=([^&]+)/);
        if (pdUriMatch) {
          const pdUriEnc = pdUriMatch[1];
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
