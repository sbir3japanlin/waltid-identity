import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { getSession } from '../api/verifier-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function SessionsScreen({ addToast }: Props) {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [polling, setPolling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  async function handlePoll(session: VerificationSession, index: number) {
    if (!session.state) {
      addToast('No session state to poll', 'error');
      return;
    }
    setPolling(prev => ({ ...prev, [session.state]: true }));
    try {
      const result = await getSession(session.state);
      const updated = [...sessions];
      updated[index] = {
        ...updated[index],
        result: result.verificationResult === 'true',
        resultData: result,
      };
      setSessions(updated);
      saveSessions(updated);
      const status = result.verificationResult === 'true' ? 'Verified' : 'Failed / Pending';
      addToast(`Verification: ${status}`, result.verificationResult === 'true' ? 'success' : 'error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Poll failed';
      addToast(msg, 'error');
    } finally {
      setPolling(prev => ({ ...prev, [session.state]: false }));
    }
  }

  function clearSessions() {
    setSessions([]);
    saveSessions([]);
  }

  const formatBadge = (format: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      mdoc: { cls: 'badge-mdoc', label: 'mDoc' },
      'sd-jwt': { cls: 'badge-sd-jwt', label: 'SD-JWT' },
      'jwt-vc': { cls: 'badge-jwt-vc', label: 'JWT VC' },
    };
    const info = map[format] || { cls: '', label: format };
    return <span className={`badge ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Verification Sessions</h1>
        {sessions.length > 0 && (
          <button className="btn" onClick={clearSessions} style={{ background: '#eee', fontSize: 12 }}>
            Clear All
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <p style={{ color: '#888' }}>No sessions yet. Create a New Request first.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>State / Session ID</th>
              <th>Created</th>
              <th>Result</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i}>
                <td>{formatBadge(s.format)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.state ? s.state.slice(0, 24) + '...' : '(none)'}</td>
                <td style={{ fontSize: 12 }}>{new Date(s.timestamp).toLocaleString()}</td>
                <td>
                  {s.result === undefined ? (
                    <span style={{ color: '#888', fontSize: 12 }}>Pending</span>
                  ) : s.result ? (
                    <span style={{ color: '#2e7d32', fontSize: 12, fontWeight: 600 }}>Verified</span>
                  ) : (
                    <span style={{ color: '#d32f2f', fontSize: 12, fontWeight: 600 }}>Failed</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePoll(s, i)}
                    disabled={polling[s.state]}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    {polling[s.state] ? '...' : 'Poll'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {sessions.some(s => s.resultData) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Latest Result Data</h3>
          {sessions.filter(s => s.resultData).map((s, i) => (
            <details key={i} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13 }}>
                {formatBadge(s.format)} — {new Date(s.timestamp).toLocaleString()} — {s.result ? 'Verified' : 'Failed'}
              </summary>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', maxHeight: 300, marginTop: 8 }}>
                {JSON.stringify(s.resultData, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
