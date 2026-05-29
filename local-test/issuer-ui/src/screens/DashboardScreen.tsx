import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { OnboardingState } from '../types';
import { loadOnboardingState, saveOnboardingState } from '../utils';
import { createIaca, createDocumentSigner, onboardIssuer, getWellKnown } from '../api/issuer-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function DashboardScreen({ addToast }: Props) {
  const [state, setState] = useState<OnboardingState>(loadOnboardingState);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [wellKnown, setWellKnown] = useState('');

  useEffect(() => {
    saveOnboardingState(state);
  }, [state]);

  useEffect(() => {
    getWellKnown().then(data => setWellKnown(JSON.stringify(data, null, 2))).catch(() => {});
  }, []);

  async function handleOnboardMdoc() {
    setLoading(prev => ({ ...prev, mdoc: true }));
    try {
      const iaca = await createIaca('US', 'Test IACA');
      const ds = await createDocumentSigner(iaca.iacaKey, iaca.certificateData, 'US', 'Test DS');
      const newState: OnboardingState = {
        ...state,
        iacaKey: iaca.iacaKey,
        iacaCertData: iaca.certificateData,
        iacaCertPem: iaca.certificatePEM,
        dsKey: ds.documentSignerKey,
        dsCertPem: ds.certificatePEM,
      };
      setState(newState);
      addToast('mDoc onboarding complete (IACA + DS)', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'mDoc onboarding failed';
      addToast(msg, 'error');
    } finally {
      setLoading(prev => ({ ...prev, mdoc: false }));
    }
  }

  async function handleOnboardIssuer() {
    setLoading(prev => ({ ...prev, issuer: true }));
    try {
      const result = await onboardIssuer();
      const newState: OnboardingState = {
        ...state,
        issuerKey: result.issuerKey,
        issuerDid: result.issuerDid,
      };
      setState(newState);
      addToast(`Issuer onboarded. DID: ${result.issuerDid}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Issuer onboarding failed';
      addToast(msg, 'error');
    } finally {
      setLoading(prev => ({ ...prev, issuer: false }));
    }
  }

  const mdocReady = !!(state.iacaKey && state.dsKey);
  const issuerReady = !!(state.issuerKey && state.issuerDid);

  return (
    <div>
      <h1 className="section-title">Dashboard</h1>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Onboarding Status</h3>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Status</th>
              <th>Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="badge badge-mdoc">mDoc</span></td>
              <td style={{ color: mdocReady ? '#2e7d32' : '#888' }}>{mdocReady ? 'Ready' : 'Not onboarded'}</td>
              <td style={{ fontSize: 12 }}>
                IACA: {state.iacaCertData ? '✓' : '✗'} &nbsp; DS: {state.dsKey ? '✓' : '✗'}
              </td>
              <td>
                <button className="btn btn-primary" onClick={handleOnboardMdoc} disabled={loading.mdoc} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {loading.mdoc ? 'Onboarding...' : mdocReady ? 'Re-onboard' : 'Onboard'}
                </button>
              </td>
            </tr>
            <tr>
              <td><span className="badge badge-sd-jwt">SD-JWT</span> / <span className="badge badge-jwt-vc">JWT VC</span></td>
              <td style={{ color: issuerReady ? '#2e7d32' : '#888' }}>{issuerReady ? 'Ready' : 'Not onboarded'}</td>
              <td style={{ fontSize: 12 }}>
                Key: {state.issuerKey ? '✓' : '✗'} &nbsp; DID: {state.issuerDid ? state.issuerDid.slice(0, 20) + '...' : '✗'}
              </td>
              <td>
                <button className="btn btn-primary" onClick={handleOnboardIssuer} disabled={loading.issuer} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {loading.issuer ? 'Onboarding...' : issuerReady ? 'Re-onboard' : 'Onboard'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {wellKnown ? (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Well-Known Configuration</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
            {wellKnown}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
