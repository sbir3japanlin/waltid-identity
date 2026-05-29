import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { CredentialFormat, IssuedOffer } from '../types';
import { loadOnboardingState, loadOffers, saveOffers } from '../utils';
import { issueMdoc, issueSdJwt, issueJwtVc, getCredentialOffer } from '../api/issuer-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function IssueCredentialScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUri, setResultUri] = useState('');
  const [offerContent, setOfferContent] = useState<unknown>(null);

  async function handleIssue() {
    setLoading(true);
    setResultUri('');
    setOfferContent(null);
    try {
      const onboard = loadOnboardingState();
      let offerUri: string;

      if (format === 'mdoc') {
        if (!onboard.dsKey || !onboard.dsCertPem || !onboard.iacaCertPem) {
          throw new Error('mDoc not onboarded. Go to Dashboard first.');
        }
        offerUri = await issueMdoc(onboard.dsKey, onboard.dsCertPem, onboard.iacaCertPem);
      } else {
        if (!onboard.issuerKey || !onboard.issuerDid) {
          throw new Error('Issuer not onboarded. Go to Dashboard first.');
        }
        if (format === 'sd-jwt') {
          offerUri = await issueSdJwt(onboard.issuerKey, onboard.issuerDid);
        } else {
          offerUri = await issueJwtVc(onboard.issuerKey, onboard.issuerDid);
        }
      }

      setResultUri(offerUri);

      const offerIdMatch = offerUri.match(/id=([^&]+)/);
      const offerId = offerIdMatch ? offerIdMatch[1] : '';
      const offers = loadOffers();
      offers.unshift({ id: offerId, uri: offerUri, format, timestamp: new Date().toISOString() });
      saveOffers(offers);

      if (offerId) {
        try {
          const content = await getCredentialOffer(offerId);
          setOfferContent(content);
        } catch { /* non-critical */ }
      }

      addToast('Credential offer created', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Issuance failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 className="section-title">Issue Credential</h1>

      <div className="card">
        <div className="format-tabs">
          {(['mdoc', 'sd-jwt', 'jwt-vc'] as CredentialFormat[]).map(f => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'mdoc' ? 'mDoc (ISO 18013-5)' : f === 'sd-jwt' ? 'SD-JWT VC' : 'JWT VC/VP'}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {format === 'mdoc' && 'Issues an ISO 18013-5 mobile Driver\'s License credential with IACA -> DS certificate chain.'}
          {format === 'sd-jwt' && 'Issues an SD-JWT VC identity credential with selective disclosure on birthdate and family_name.'}
          {format === 'jwt-vc' && 'Issues a W3C Verifiable Credential (UniversityDegree) with Presentation Exchange.'}
        </p>

        <button className="btn btn-primary" onClick={handleIssue} disabled={loading}>
          {loading ? 'Issuing...' : `Issue ${format.toUpperCase()} Credential`}
        </button>
      </div>

      {resultUri && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Credential Offer URI</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={resultUri}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => { navigator.clipboard.writeText(resultUri); addToast('Copied to clipboard', 'success'); }}
              style={{ whiteSpace: 'nowrap' }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {offerContent && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Offer Content</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
            {JSON.stringify(offerContent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
