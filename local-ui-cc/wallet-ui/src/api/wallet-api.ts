import { getApiBase, fixUrlForDocker, getToken } from '../utils';

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res;
}

export async function register(name: string, email: string, password: string): Promise<string> {
  const res = await authFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ type: 'email', name, email, password }),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function login(email: string, password: string): Promise<string> {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ type: 'email', email, password }),
  });
  const data = await res.json();
  return data.token;
}

export async function getWallets(): Promise<{ wallets: { id: string }[] }> {
  const res = await authFetch('/wallet/accounts/wallets');
  return res.json();
}

export async function getKeys(walletId: string): Promise<unknown[]> {
  const res = await authFetch(`/wallet/${walletId}/keys`);
  return res.json();
}

export async function getDids(walletId: string): Promise<unknown[]> {
  const res = await authFetch(`/wallet/${walletId}/dids`);
  return res.json();
}

export async function useOfferRequest(walletId: string, offerUri: string): Promise<{ id: string }[]> {
  const fixed = fixUrlForDocker(offerUri);
  const res = await authFetch(`/wallet/${walletId}/exchange/useOfferRequest`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: JSON.stringify(fixed),
  });
  return res.json();
}

export async function matchCredentialsForPresentationDefinition(
  walletId: string,
  presentationDefinition: unknown
): Promise<{ id: string }[]> {
  const res = await authFetch(`/wallet/${walletId}/exchange/matchCredentialsForPresentationDefinition`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: JSON.stringify(presentationDefinition),
  });
  return res.json();
}

export async function resolvePresentationRequest(
  walletId: string,
  authRequest: string
): Promise<string> {
  const fixed = fixUrlForDocker(authRequest);
  const res = await authFetch(`/wallet/${walletId}/exchange/resolvePresentationRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'accept': 'text/plain' },
    body: fixed,
  });
  return res.text();
}

export async function usePresentationRequest(
  walletId: string,
  presentationRequest: string,
  selectedCredentials: string[]
): Promise<unknown> {
  const res = await authFetch(`/wallet/${walletId}/exchange/usePresentationRequest`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: JSON.stringify({ presentationRequest, selectedCredentials }),
  });
  return res.json();
}
