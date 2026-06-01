import { useState } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { CredentialFormat, VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { createMdocAuthRequest, createSdJwtAuthRequest, createJwtVcAuthRequest } from '../api/verifier-api';
import { Card, Button, Tabs, Input, Textarea } from '@shared';
import { Copy } from 'lucide-react';

const MDOC_FIELDS = ['family_name', 'given_name', 'birth_date', 'document_number', 'issue_date', 'expiry_date', 'issuing_country', 'issuing_authority'];
const SDJWT_FIELDS = ['given_name', 'family_name', 'birthdate', 'email', 'phone_number'];

const FORMAT_TABS = [
  { key: 'mdoc', label: 'mDoc (ISO 18013-7)' },
  { key: 'sd-jwt', label: 'SD-JWT VC' },
  { key: 'jwt-vc', label: 'JWT VC/VP' },
];

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function NewRequestScreen({ addToast }: Props) {
  const [format, setFormat] = useState<CredentialFormat>('sd-jwt');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [iacaCertPem, setIacaCertPem] = useState('');
  const [selectedMdocFields, setSelectedMdocFields] = useState<string[]>(['family_name', 'given_name']);
  const [selectedSdJwtFields, setSelectedSdJwtFields] = useState<string[]>(['given_name', 'birthdate']);
  const [credentialType, setCredentialType] = useState('UniversityDegree');

  function toggle(arr: string[], setArr: (a: string[]) => void, val: string) {
    if (arr.includes(val)) setArr(arr.filter(v => v !== val));
    else setArr([...arr, val]);
  }

  async function handleCreate() {
    setLoading(true); setResultUrl('');
    try {
      let url: string;
      if (format === 'mdoc') {
        if (!iacaCertPem.trim()) throw new Error('Paste the IACA certificate PEM from the Issuer.');
        if (selectedMdocFields.length === 0) throw new Error('Select at least one field to request.');
        url = await createMdocAuthRequest(iacaCertPem.trim(), selectedMdocFields);
      } else if (format === 'sd-jwt') {
        if (selectedSdJwtFields.length === 0) throw new Error('Select at least one field to request.');
        url = await createSdJwtAuthRequest(selectedSdJwtFields);
      } else { url = await createJwtVcAuthRequest(credentialType); }
      setResultUrl(url);
      const stateMatch = url.match(/state=([^&]+)/) || url.match(/request_uri=.*\/([^/&?]+)/);
      const state = stateMatch ? stateMatch[1] : '';
      const sessions = loadSessions();
      sessions.unshift({ state, format, timestamp: new Date().toISOString(), requestUrl: url });
      saveSessions(sessions);
      addToast('Authorization request created', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to create request', 'error');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-5">New Verification Request</h1>
      <Card>
        <Tabs tabs={FORMAT_TABS} activeKey={format} onChange={(k) => setFormat(k as CredentialFormat)} />

        {format === 'mdoc' && (
          <div className="mb-4">
            <Textarea label="IACA Certificate PEM" rows={4} value={iacaCertPem}
              onChange={e => setIacaCertPem(e.target.value)}
              placeholder="Paste the IACA certificate PEM from the Issuer's onboarding..." />
            <label className="block text-xs font-semibold text-slate-600 mb-2 mt-3">Fields to request</label>
            <div className="grid grid-cols-2 gap-1.5">
              {MDOC_FIELDS.map(f => (
                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-btn hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={selectedMdocFields.includes(f)}
                    onChange={() => toggle(selectedMdocFields, setSelectedMdocFields, f)}
                    className="rounded border-slate-300 text-accent focus:ring-accent/30" />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'sd-jwt' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Fields to request</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SDJWT_FIELDS.map(f => (
                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-btn hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={selectedSdJwtFields.includes(f)}
                    onChange={() => toggle(selectedSdJwtFields, setSelectedSdJwtFields, f)}
                    className="rounded border-slate-300 text-accent focus:ring-accent/30" />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'jwt-vc' && (
          <div className="mb-4">
            <Input label="Credential Type" value={credentialType} onChange={e => setCredentialType(e.target.value)} />
          </div>
        )}

        <Button onClick={handleCreate} loading={loading}>
          {loading ? 'Creating...' : 'Create Authorization Request'}
        </Button>
      </Card>

      {resultUrl && (
        <Card header={<span className="font-medium">Authorization Request URL</span>} className="mt-5">
          <div className="flex gap-2">
            <Textarea value={resultUrl} readOnly rows={3} />
            <Button size="md" variant="secondary" className="shrink-0"
              onClick={() => { navigator.clipboard.writeText(resultUrl); addToast('Copied to clipboard', 'success'); }}>
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Paste this URL into the Wallet app's Presentation screen to fulfill the request.</p>
        </Card>
      )}
    </div>
  );
}
