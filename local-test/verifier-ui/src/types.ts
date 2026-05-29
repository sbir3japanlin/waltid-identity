export type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

export type Screen = 'new-request' | 'sessions';

export interface VerificationSession {
  state: string;
  format: CredentialFormat;
  timestamp: string;
  requestUrl: string;
  result?: boolean;
  resultData?: unknown;
}
