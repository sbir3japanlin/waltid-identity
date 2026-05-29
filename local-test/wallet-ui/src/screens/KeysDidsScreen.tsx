import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import { getKeys, getDids } from '../api/wallet-api';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function KeysDidsScreen({ walletId, addToast }: Props) {
  const [keys, setKeys] = useState<unknown[]>([]);
  const [dids, setDids] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [walletId]);

  async function loadData() {
    setLoading(true);
    try {
      const [k, d] = await Promise.all([getKeys(walletId), getDids(walletId)]);
      setKeys(k);
      setDids(d);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load keys/DIDs';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="section-title">Keys &amp; DIDs</h1>
      {loading ? <p>Loading...</p> : (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Keys</h3>
            {keys.length === 0 ? (
              <p style={{ color: '#888' }}>No keys found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Key ID</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{key.keyId?.id || key.id || '-'}</td>
                      <td>{key.keyId?.type || key.type || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>DIDs</h3>
            {dids.length === 0 ? (
              <p style={{ color: '#888' }}>No DIDs found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>DID</th>
                    <th>Alias</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {dids.map((did: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{did.did || '-'}</td>
                      <td>{did.alias || '-'}</td>
                      <td>{did.default ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button className="btn btn-primary" onClick={loadData}>Refresh</button>
        </>
      )}
    </div>
  );
}
