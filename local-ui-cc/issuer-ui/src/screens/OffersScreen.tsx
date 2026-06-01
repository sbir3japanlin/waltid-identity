import { useState, useEffect } from 'react';
import type { ToastMessage } from '@shared/components/Toast';
import type { IssuedOffer } from '../types';
import { loadOffers } from '../utils';
import { getCredentialOffer } from '../api/issuer-api';
import { Card, Button, Badge, EmptyState } from '@shared';
import { ReceiptText } from 'lucide-react';

interface Props {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

const FORMAT_BADGE_VARIANT: Record<string, 'mdoc' | 'sd-jwt' | 'jwt-vc'> = {
  mdoc: 'mdoc',
  'sd-jwt': 'sd-jwt',
  'jwt-vc': 'jwt-vc',
};

export function OffersScreen(_props: Props) {
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-5">Active Offers</h1>
      {offers.length === 0 ? (
        <EmptyState
          icon={ReceiptText as any}
          title="No offers yet"
          description="Go to Issue Credential to create one."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {offers.map((offer, i) => (
            <Card key={i} header={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Badge variant={FORMAT_BADGE_VARIANT[offer.format] || 'neutral'}>{offer.format.toUpperCase()}</Badge>
                  <span className="text-xs font-mono text-slate-500">
                    {offer.id ? offer.id.slice(0, 30) + '...' : '(no ID)'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(offer.timestamp).toLocaleString()}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDetails(offer.id)}
                >
                  {expandedId === offer.id ? 'Hide' : 'View Details'}
                </Button>
              </div>
            }>
              {expandedId === offer.id && (
                <div>
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Offer URI:</p>
                    <div className="font-mono text-xs break-all bg-slate-50 p-2 rounded-card">
                      {offer.uri}
                    </div>
                  </div>
                  {loadingDetail && <p className="text-xs text-slate-500">Loading details...</p>}
                  {offerDetails[offer.id] ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Offer Content:</p>
                      <pre className="bg-slate-50 p-2 rounded-card text-xs overflow-auto max-h-72">
                        {JSON.stringify(offerDetails[offer.id], null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
