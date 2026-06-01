import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { resolvePresentationRequest, matchCredentialsForPresentationDefinition, usePresentationRequest } from '../api/wallet-api';
import { fixUrlForHost } from '../utils';
import { Button, Card, Textarea, Input } from '@shared';
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
    if (!authRequest.trim()) { addToast('Please paste an authorization request URL', 'error'); return; }
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
    } finally { setLoading(false); }
  }

  async function handlePresent() {
    if (!matchedCred.trim()) { addToast('Please enter a credential ID to present', 'error'); return; }
    setLoading(true);
    try {
      const result = await usePresentationRequest(walletId, resolvedRequest, [matchedCred]);
      setPresentationResult(result);
      setStep('done');
      addToast('Presentation fulfilled', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Presentation failed';
      addToast(msg, 'error');
    } finally { setLoading(false); }
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

      <div className="flex gap-2 mb-5">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
              ${(step === 'input' && s.num === 1) || (step === 'review' && s.num <= 2) || (step === 'done')
                ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500'}`}>
              {s.done ? '✓' : s.num}
            </div>
            <span className={`text-xs ${(step === 'input' && s.num === 1) || (step === 'review' && s.num <= 2) || (step === 'done')
              ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      {step === 'input' && (
        <Card>
          <Textarea label="Authorization Request URL" rows={3} value={authRequest}
            onChange={e => setAuthRequest(e.target.value)}
            placeholder="Paste the authorization request URL from the Verifier..." />
          <Button onClick={handleResolve} loading={loading}>
            {loading ? 'Resolving...' : 'Review Request'}
          </Button>
        </Card>
      )}

      {step === 'review' && (
        <Card header={<span className="font-medium">Review Presentation</span>}>
          <Input label="Credential ID to present" value={matchedCred}
            onChange={e => setMatchedCred(e.target.value)} placeholder="Credential ID" />
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
