const WALLET_API_BASE = 'http://localhost:7001/wallet-api';

export function getApiBase(): string {
  return WALLET_API_BASE;
}

export function fixUrlForDocker(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal');
}

export function fixUrlForHost(url: string): string {
  return url.replace(/host\.docker\.internal/g, 'localhost');
}

export function getToken(): string | null {
  return localStorage.getItem('wallet_token');
}

export function setToken(token: string): void {
  localStorage.setItem('wallet_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('wallet_token');
}
