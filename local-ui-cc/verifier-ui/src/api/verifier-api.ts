import { getApiBase } from '../utils';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'accept': '*/*', ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res;
}

export async function createMdocAuthRequest(
  iacaCertPem: string,
  fields: string[],
): Promise<string> {
  const mdocFields = fields.map(f => {
    return `$['org.iso.18013.5.1']['${f}']`;
  });

  const fieldDefs = mdocFields.map(p => ({
    path: [p],
    intent_to_retain: false,
  }));

  const res = await apiFetch('/openid4vc/verify', {
    method: 'POST',
    headers: {
      'authorizeBaseUrl': 'openid4vp://authorize',
      'responseMode': 'direct_post_jwt',
      'openId4VPProfile': 'ISO_18013_7_MDOC',
    },
    body: JSON.stringify({
      request_credentials: [{
        id: 'mDL-request',
        input_descriptor: {
          id: 'org.iso.18013.5.1.mDL',
          format: { mso_mdoc: { alg: ['ES256'] } },
          constraints: {
            fields: fieldDefs,
            limit_disclosure: 'required',
          },
        },
      }],
      trusted_root_cas: [iacaCertPem],
      openid_profile: 'ISO_18013_7_MDOC',
    }),
  });
  return res.text();
}

export async function createSdJwtAuthRequest(fields: string[]): Promise<string> {
  const fieldDefs = fields.map(p => ({
    path: [`$.${p}`],
    filter: { type: 'string', pattern: '.*' },
  }));

  const res = await apiFetch('/openid4vc/verify', {
    method: 'POST',
    headers: {
      'authorizeBaseUrl': 'openid4vp://authorize',
      'responseMode': 'direct_post',
    },
    body: JSON.stringify({
      request_credentials: [{
        format: 'vc+sd-jwt',
        input_descriptor: {
          id: 'identity-credential-request',
          format: { 'vc+sd-jwt': {} },
          constraints: {
            fields: fieldDefs,
            limit_disclosure: 'required',
          },
        },
      }],
      vp_policies: ['signature_sd-jwt-vc'],
      vc_policies: ['not-before', 'expired'],
    }),
  });
  return res.text();
}

export async function createJwtVcAuthRequest(credentialType: string): Promise<string> {
  const res = await apiFetch('/openid4vc/verify', {
    method: 'POST',
    headers: {
      'authorizeBaseUrl': 'openid4vp://authorize',
      'responseMode': 'direct_post',
    },
    body: JSON.stringify({
      request_credentials: [{
        type: credentialType,
        format: 'jwt_vc_json',
      }],
    }),
  });
  return res.text();
}

export async function getSession(sessionState: string): Promise<{
  verificationResult?: string;
  [key: string]: unknown;
}> {
  const res = await apiFetch(`/openid4vc/session/${sessionState}`);
  return res.json();
}
