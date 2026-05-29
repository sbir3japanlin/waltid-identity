import { useState, useEffect } from 'react';
import type { ToastMessage } from '../components/Toast';
import type { IssuedOffer } from '../types';
import { loadOffers } from '../utils';
import { getCredentialOffer } from '../api/issuer-api';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export function OffersScreen({ addToast }: Props) {
  const [offers, setOffers] = useState<IssuedOffer[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offerDetails, setOfferDetails] = useState<Record<string, unknown>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setOffers(loadOffers());
  }, []);

  async function handleViewDetails(offerId: string) {
    if (expandedId === offerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(offerId);
    if (!offerDetails[offerId]) {
      setLoadingDetail(true);
      try {
        const content = await getCredentialOffer(offerId);
        setOfferDetails(prev => ({ ...prev, [offerId]: content }));
      } catch {
        setOfferDetails(prev => ({ ...prev, [offerId]: { error: 'Failed to fetch' } }));
      } finally {
        setLoadingDetail(false);
      }
    }
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
      <h1 className="section-title">Active Offers</h1>
      {offers.length === 0 ? (
        <div className="card">
          <p style={{ color: '#888' }}>No offers generated yet. Go to Issue Credential to create one.</p>
        </div>
      ) : (
        offers.map((offer, i) => (
          <div className="card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {formatBadge(offer.format)}
                <span style={{ marginLeft: 8, fontSize: 13, fontFamily: 'monospace' }}>
                  {offer.id ? offer.id.slice(0, 30) + '...' : '(no ID)'}
                </span>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {new Date(offer.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleViewDetails(offer.id)}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                {expandedId === offer.id ? 'Hide' : 'View Details'}
              </button>
            </div>
            {expandedId === offer.id && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 12 }}>Offer URI:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                    {offer.uri}
                  </div>
                </div>
                {loadingDetail && <p style={{ fontSize: 12, color: '#888' }}>Loading details...</p>}
                {offerDetails[offer.id] && (
                  <div>
                    <strong style={{ fontSize: 12 }}>Offer Content:</strong>
                    <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 11, overflow: 'auto', maxHeight: 300, marginTop: 4 }}>
                      {JSON.stringify(offerDetails[offer.id], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
