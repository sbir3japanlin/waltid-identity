export type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

export type Screen = 'login' | 'credentials' | 'claim' | 'presentation' | 'keys-dids';

export interface CredentialCard {
  id: string;
  format: CredentialFormat;
  type: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
}
