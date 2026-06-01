import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { OnboardingState } from '../types';
import { loadOnboardingState, saveOnboardingState } from '../utils';
import { createIaca, createDocumentSigner, onboardIssuer, getWellKnown } from '../api/issuer-api';
import { Card, Button, Badge } from '@shared';
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
      setState({ ...state, iacaKey: iaca.iacaKey, iacaCertData: iaca.certificateData, iacaCertPem: iaca.certificatePEM, dsKey: ds.documentSignerKey, dsCertPem: ds.certificatePEM });
      addToast('mDoc onboarding complete (IACA + DS)', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'mDoc onboarding failed', 'error');
    } finally { setLoading(prev => ({ ...prev, mdoc: false })); }
  }

  async function handleOnboardIssuer() {
    setLoading(prev => ({ ...prev, issuer: true }));
    try {
      const result = await onboardIssuer();
      setState({ ...state, issuerKey: result.issuerKey, issuerDid: result.issuerDid });
      addToast(`Issuer onboarded. DID: ${result.issuerDid}`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Issuer onboarding failed', 'error');
    } finally { setLoading(prev => ({ ...prev, issuer: false })); }
  }

  const mdocReady = !!(state.iacaKey && state.dsKey);
  const issuerReady = !!(state.issuerKey && state.issuerDid);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Dashboard</h1>

      <Card header={<span className="font-medium">Onboarding Status</span>} className="mb-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-card">
            <div className="flex items-center gap-3">
              <Badge variant="mdoc">mDoc</Badge>
              <div>
                <div className="flex items-center gap-1.5">
                  {mdocReady ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                  <span className={`text-sm font-medium ${mdocReady ? 'text-success' : 'text-slate-500'}`}>{mdocReady ? 'Ready' : 'Not onboarded'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">IACA: {state.iacaCertData ? 'configured' : 'missing'} &middot; DS: {state.dsKey ? 'configured' : 'missing'}</p>
              </div>
            </div>
            <Button size="sm" variant={mdocReady ? 'outline' : 'primary'} onClick={handleOnboardMdoc} loading={loading.mdoc}>
              {loading.mdoc ? 'Onboarding...' : mdocReady ? 'Re-onboard' : 'Onboard'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-card">
            <div className="flex items-center gap-3">
              <div className="flex gap-1"><Badge variant="sd-jwt">SD-JWT</Badge><Badge variant="jwt-vc">JWT VC</Badge></div>
              <div>
                <div className="flex items-center gap-1.5">
                  {issuerReady ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                  <span className={`text-sm font-medium ${issuerReady ? 'text-success' : 'text-slate-500'}`}>{issuerReady ? 'Ready' : 'Not onboarded'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Key: {state.issuerKey ? 'configured' : 'missing'} &middot; DID: {state.issuerDid ? state.issuerDid.slice(0, 20) + '...' : 'missing'}</p>
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
          <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-72">{wellKnown}</pre>
        </Card>
      )}
    </div>
  );
}
