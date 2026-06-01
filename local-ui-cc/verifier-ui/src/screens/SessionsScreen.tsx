import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { VerificationSession } from '../types';
import { loadSessions, saveSessions } from '../utils';
import { getSession } from '../api/verifier-api';
import { Card, Button, Badge, EmptyState } from '@shared';
import { History, Circle } from 'lucide-react';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function SessionsScreen({ addToast }: Props) {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [polling, setPolling] = useState<Record<string, boolean>>({});

  useEffect(() => { setSessions(loadSessions()); }, []);

  async function handlePoll(session: VerificationSession, index: number) {
    if (!session.state) { addToast('No session state to poll', 'error'); return; }
    setPolling(prev => ({ ...prev, [session.state]: true }));
    try {
      const result = await getSession(session.state);
      const updated = [...sessions];
      updated[index] = { ...updated[index], result: result.verificationResult === 'true', resultData: result };
      setSessions(updated); saveSessions(updated);
      addToast(`Verification: ${result.verificationResult === 'true' ? 'Verified' : 'Failed / Pending'}`,
        result.verificationResult === 'true' ? 'success' : 'error');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Poll failed', 'error');
    } finally { setPolling(prev => ({ ...prev, [session.state]: false })); }
  }

  function clearSessions() { setSessions([]); saveSessions([]); }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Verification Sessions</h1>
        {sessions.length > 0 && <Button size="sm" variant="ghost" onClick={clearSessions}>Clear All</Button>}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState icon={History as any} title="No sessions yet"
            description="Create a New Request first to start verifying credentials." />
        </Card>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Format</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Session ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant={s.format === 'mdoc' ? 'mdoc' : s.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
                        {s.format === 'mdoc' ? 'mDoc' : s.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{s.state ? s.state.slice(0, 20) + '...' : '(none)'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      {s.result === undefined ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Circle className="w-2 h-2 fill-slate-300 text-slate-300 animate-pulse" /> Pending
                        </span>
                      ) : s.result ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                          <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error">
                          <Circle className="w-2 h-2 fill-red-500 text-red-500" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handlePoll(s, i)} loading={polling[s.state]}>Poll</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sessions.some(s => s.resultData) && (
            <Card header={<span className="font-medium">Result Data</span>} className="mt-5">
              {sessions.filter(s => s.resultData).map((s, i) => (
                <details key={i} className="mb-2 last:mb-0">
                  <summary className="text-sm cursor-pointer text-slate-600 hover:text-slate-800 py-1">
                    <span className="inline-flex items-center gap-2">
                      <Badge variant={s.format === 'mdoc' ? 'mdoc' : s.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
                        {s.format === 'mdoc' ? 'mDoc' : s.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
                      </Badge>
                      {new Date(s.timestamp).toLocaleString()}
                    </span>
                  </summary>
                  <pre className="bg-slate-50 p-3 rounded-card text-xs overflow-auto max-h-72 mt-2">
                    {JSON.stringify(s.resultData, null, 2)}
                  </pre>
                </details>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
