export type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

export type Screen = 'dashboard' | 'issue' | 'offers';

export interface OnboardingState {
  iacaKey?: unknown;
  iacaCertData?: unknown;
  iacaCertPem?: string;
  dsKey?: unknown;
  dsCertPem?: string;
  issuerKey?: unknown;
  issuerDid?: string;
}

export interface IssuedOffer {
  id: string;
  uri: string;
  format: CredentialFormat;
  timestamp: string;
}
