import { useState } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { CredentialFormat, VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { createMdocAuthRequest, createSdJwtAuthRequest, createJwtVcAuthRequest } from '../api/verifier-api';

const MDOC_FIELDS = ['family_name', 'given_name', 'birth_date', 'document_number', 'issue_date', 'expiry_date', 'issuing_country', 'issuing_authority'];
const SDJWT_FIELDS = ['given_name', 'family_name', 'birthdate', 'email', 'phone_number'];

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
    setLoading(true);
    setResultUrl('');
    try {
      let url: string;
      if (format === 'mdoc') {
        if (!iacaCertPem.trim()) throw new Error('Paste the IACA certificate PEM from the Issuer.');
        if (selectedMdocFields.length === 0) throw new Error('Select at least one field to request.');
        url = await createMdocAuthRequest(iacaCertPem.trim(), selectedMdocFields);
      } else if (format === 'sd-jwt') {
        if (selectedSdJwtFields.length === 0) throw new Error('Select at least one field to request.');
        url = await createSdJwtAuthRequest(selectedSdJwtFields);
      } else {
        url = await createJwtVcAuthRequest(credentialType);
      }

      setResultUrl(url);

      const stateMatch = url.match(/state=([^&]+)/) || url.match(/request_uri=.*\/([^/&?]+)/);
      const state = stateMatch ? stateMatch[1] : '';
      const session: VerificationSession = {
        state,
        format,
        timestamp: new Date().toISOString(),
        requestUrl: url,
      };
      const sessions = loadSessions();
      sessions.unshift(session);
      saveSessions(sessions);

      addToast('Authorization request created', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create request';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 className="section-title">New Verification Request</h1>

      <div className="card">
        <div className="format-tabs">
          {(['mdoc', 'sd-jwt', 'jwt-vc'] as CredentialFormat[]).map(f => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'mdoc' ? 'mDoc (ISO 18013-7)' : f === 'sd-jwt' ? 'SD-JWT VC' : 'JWT VC/VP'}
            </button>
          ))}
        </div>

        {format === 'mdoc' && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">IACA Certificate PEM</label>
            <textarea
              className="input"
              rows={4}
              value={iacaCertPem}
              onChange={e => setIacaCertPem(e.target.value)}
              placeholder="Paste the IACA certificate PEM from the Issuer's onboarding..."
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <label className="label" style={{ marginTop: 8 }}>Fields to request</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MDOC_FIELDS.map(f => (
                <label key={f} style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={selectedMdocFields.includes(f)} onChange={() => toggle(selectedMdocFields, setSelectedMdocFields, f)} />
                  {f}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'sd-jwt' && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">Fields to request</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SDJWT_FIELDS.map(f => (
                <label key={f} style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={selectedSdJwtFields.includes(f)} onChange={() => toggle(selectedSdJwtFields, setSelectedSdJwtFields, f)} />
                  {f}
                </label>
              ))}
            </div>
          </div>
        )}

        {format === 'jwt-vc' && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">Credential Type</label>
            <input
              className="input"
              value={credentialType}
              onChange={e => setCredentialType(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>
        )}

        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create Authorization Request'}
        </button>
      </div>

      {resultUrl && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Authorization Request URL</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              className="input"
              rows={3}
              value={resultUrl}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => { navigator.clipboard.writeText(resultUrl); addToast('Copied to clipboard', 'success'); }}
              style={{ whiteSpace: 'nowrap' }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Paste this URL into the Wallet app's Presentation screen to fulfill the request.
          </p>
        </div>
      )}
    </div>
  );
}
