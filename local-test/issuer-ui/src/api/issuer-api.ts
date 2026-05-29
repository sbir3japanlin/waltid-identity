import { getApiBase } from '../utils';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res;
}

export async function createIaca(country: string, commonName: string): Promise<{
  iacaKey: unknown;
  certificateData: unknown;
  certificatePEM: string;
}> {
  const res = await apiFetch('/onboard/iso-mdl/iacas', {
    method: 'POST',
    body: JSON.stringify({
      certificateData: {
        country,
        commonName,
        issuerAlternativeNameConf: { uri: 'https://iaca.example.com' },
      },
    }),
  });
  return res.json();
}

export async function createDocumentSigner(
  iacaKey: unknown,
  iacaCertData: unknown,
  country: string,
  commonName: string,
): Promise<{
  documentSignerKey: unknown;
  certificateData: unknown;
  certificatePEM: string;
}> {
  const res = await apiFetch('/onboard/iso-mdl/document-signers', {
    method: 'POST',
    body: JSON.stringify({
      iacaSigner: { iacaKey, certificateData: iacaCertData },
      certificateData: {
        country,
        commonName,
        crlDistributionPointUri: 'https://iaca.example.com/crl',
      },
    }),
  });
  return res.json();
}

export async function onboardIssuer(): Promise<{
  issuerKey: unknown;
  issuerDid: string;
}> {
  const res = await apiFetch('/onboard/issuer', {
    method: 'POST',
    body: JSON.stringify({ key: { keyType: 'secp256r1' } }),
  });
  return res.json();
}

export async function issueMdoc(issuerKey: unknown, dsCertPem: string, iacaCertPem: string): Promise<string> {
  const res = await apiFetch('/openid4vc/mdoc/issue', {
    method: 'POST',
    body: JSON.stringify({
      issuerKey,
      credentialConfigurationId: 'org.iso.18013.5.1.mDL',
      mdocData: {
        'org.iso.18013.5.1': {
          family_name: 'Doe',
          given_name: 'John',
          birth_date: '1986-03-22',
          issue_date: '2019-10-20',
          expiry_date: '2030-10-20',
          issuing_country: 'US',
          issuing_authority: 'US DMV',
          document_number: '123456789',
          portrait: [141, 182, 121, 111, 238, 50, 120, 94, 54, 111, 113, 13, 241, 12, 12],
          driving_privileges: [{ vehicle_category_code: 'B', issue_date: '2019-10-20', expiry_date: '2030-10-20' }],
          un_distinguishing_sign: 'USA',
        },
      },
      x5Chain: [dsCertPem],
      authenticationMethod: 'PRE_AUTHORIZED',
    }),
  });
  return res.text();
}

export async function issueSdJwt(issuerKey: unknown, issuerDid: string): Promise<string> {
  const res = await apiFetch('/openid4vc/sdjwt/issue', {
    method: 'POST',
    body: JSON.stringify({
      issuerKey,
      issuerDid,
      credentialConfigurationId: 'identity_credential_vc+sd-jwt',
      credentialData: {
        given_name: 'John',
        family_name: 'Doe',
        email: 'johndoe@example.com',
        phone_number: '+1-202-555-0101',
        address: { street_address: '123 Main St', locality: 'Anytown', region: 'Anystate', country: 'US' },
        birthdate: '1940-01-01',
        is_over_18: true,
        is_over_21: true,
        is_over_65: true,
      },
      mapping: { id: '<uuid>', iat: '<timestamp-seconds>', nbf: '<timestamp-seconds>', exp: '<timestamp-in-seconds:365d>' },
      selectiveDisclosure: { fields: { birthdate: { sd: true }, family_name: { sd: true }, given_name: { sd: false } } },
      authenticationMethod: 'PRE_AUTHORIZED',
    }),
  });
  return res.text();
}

export async function issueJwtVc(issuerKey: unknown, issuerDid: string): Promise<string> {
  const res = await apiFetch('/openid4vc/jwt/issue', {
    method: 'POST',
    body: JSON.stringify({
      issuerKey,
      issuerDid,
      credentialConfigurationId: 'UniversityDegree_jwt_vc_json',
      credentialData: {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1'],
        id: 'http://example.gov/credentials/3732',
        type: ['VerifiableCredential', 'UniversityDegree'],
        issuer: { id: 'did:web:vc.transmute.world' },
        issuanceDate: '2020-03-10T04:24:12.164Z',
        credentialSubject: {
          id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
          degree: { type: 'BachelorDegree', name: 'Bachelor of Science and Arts' },
        },
      },
      mapping: {
        id: '<uuid>',
        issuer: { id: '<issuerDid>' },
        credentialSubject: { id: '<subjectDid>' },
        issuanceDate: '<timestamp>',
        expirationDate: '<timestamp-in:365d>',
      },
      authenticationMethod: 'PRE_AUTHORIZED',
      standardVersion: 'DRAFT13',
    }),
  });
  return res.text();
}

export async function getCredentialOffer(offerId: string): Promise<unknown> {
  const res = await apiFetch(`/draft13/credentialOffer?id=${encodeURIComponent(offerId)}`);
  return res.json();
}

export async function getWellKnown(): Promise<unknown> {
  const res = await apiFetch('/draft13/.well-known/openid-configuration');
  return res.json();
}
