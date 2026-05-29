import type { VerificationSession } from './types';

const VERIFIER_API_BASE = 'http://localhost:7003';

export function getApiBase(): string {
  return VERIFIER_API_BASE;
}

export function fixUrlForDocker(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal');
}

export function fixUrlForHost(url: string): string {
  return url.replace(/host\.docker\.internal/g, 'localhost');
}

export function loadSessions(): VerificationSession[] {
  try { return JSON.parse(localStorage.getItem('verifier_sessions') || '[]'); }
  catch { return []; }
}

export function saveSessions(sessions: VerificationSession[]): void {
  localStorage.setItem('verifier_sessions', JSON.stringify(sessions));
}
