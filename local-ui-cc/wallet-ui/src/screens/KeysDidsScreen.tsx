import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import { getKeys, getDids } from '../api/wallet-api';
import { Card, Button, Spinner } from '@shared';
import { Key, Globe } from 'lucide-react';

interface Props {
  walletId: string;
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function KeysDidsScreen({ walletId, addToast }: Props) {
  const [keys, setKeys] = useState<unknown[]>([]);
  const [dids, setDids] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [walletId]);

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

  const keyRows = keys.map((key: any) => ({
    id: key.keyId?.id || key.id || '-',
    type: key.keyId?.type || key.type || '-',
  }));

  const didRows = dids.map((did: any) => ({
    did: did.did || '-',
    alias: did.alias || '-',
    isDefault: did.default ? 'Yes' : 'No',
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Keys & DIDs</h1>
        <Button size="sm" variant="secondary" onClick={loadData}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-5">
          <Card header={<div className="flex items-center gap-2"><Key className="w-4 h-4" /> Keys</div>}>
            {keyRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No keys found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-500">Key ID</th>
                    <th className="text-left py-2 font-medium text-slate-500">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {keyRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs">{row.id}</td>
                      <td className="py-2 text-xs">{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card header={<div className="flex items-center gap-2"><Globe className="w-4 h-4" /> DIDs</div>}>
            {didRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No DIDs found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-500">DID</th>
                    <th className="text-left py-2 font-medium text-slate-500">Alias</th>
                    <th className="text-left py-2 font-medium text-slate-500">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {didRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs max-w-[200px] truncate">{row.did}</td>
                      <td className="py-2 text-xs">{row.alias}</td>
                      <td className="py-2">
                        <span className={`text-xs font-medium ${row.isDefault === 'Yes' ? 'text-success' : 'text-slate-400'}`}>
                          {row.isDefault}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
