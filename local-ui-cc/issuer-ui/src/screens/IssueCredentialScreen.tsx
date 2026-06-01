import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { CredentialFormat } from '../types';
import { loadOnboardingState, loadOffers, saveOffers } from '../utils';
import { issueMdoc, issueSdJwt, issueJwtVc, getCredentialOffer } from '../api/issuer-api';
import { Card, Button, Tabs } from '@shared';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

const FORMAT_TABS = [
  { key: 'mdoc', label: 'mDoc (ISO 18013-5)' },
  { key: 'sd-jwt', label: 'SD-JWT VC' },
  { key: 'jwt-vc', label: 'JWT VC/VP' },
];

const FORMAT_DESCRIPTIONS: Record<CredentialFormat, string> = {
  'mdoc': 'Issues an ISO 18013-5 mobile Driver\'s License credential with IACA -> DS certificate chain.',
  'sd-jwt': 'Issues an SD-JWT VC identity credential with selective disclosure on birthdate and family_name.',
  'jwt-vc': 'Issues a W3C Verifiable Credential (UniversityDegree) with Presentation Exchange.',
};

export function IssueCredentialScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUri, setResultUri] = useState('');
  const [offerContent, setOfferContent] = useState('');

  async function handleIssue() {
    setLoading(true);
    setResultUri('');
    setOfferContent('');
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
          setOfferContent(JSON.stringify(content, null, 2));
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
    <div className="max-w-[800px]">
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Issue Credential</h1>

      <Card>
        <Tabs tabs={FORMAT_TABS} activeKey={format} onChange={key => setFormat(key as CredentialFormat)} />

        <p className="text-sm text-slate-500 mb-4">
          {FORMAT_DESCRIPTIONS[format]}
        </p>

        <Button onClick={handleIssue} loading={loading}>
          {loading ? 'Issuing...' : `Issue ${format.toUpperCase()} Credential`}
        </Button>
      </Card>

      {resultUri && (
        <Card header={<span className="font-medium">Credential Offer URI</span>} className="mt-4">
          <div className="flex gap-2">
            <input
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-input"
              value={resultUri}
              readOnly
            />
            <Button
              size="sm"
              onClick={() => { navigator.clipboard.writeText(resultUri); addToast('Copied to clipboard', 'success'); }}
              className="shrink-0"
            >
              Copy
            </Button>
          </div>
        </Card>
      )}

      {offerContent && (
        <Card header={<span className="font-medium">Offer Content</span>} className="mt-4">
          <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-[400px]">{offerContent}</pre>
        </Card>
      )}
    </div>
  );
}
