import type { OnboardingState, IssuedOffer } from './types';

const ISSUER_API_BASE = 'http://localhost:7002';

export function getApiBase(): string {
  return ISSUER_API_BASE;
}

export function fixUrlForDocker(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal');
}

export function fixUrlForHost(url: string): string {
  return url.replace(/host\.docker\.internal/g, 'localhost');
}

export function loadOnboardingState(): OnboardingState {
  try {
    return JSON.parse(localStorage.getItem('issuer_onboarding') || '{}');
  } catch { return {}; }
}

export function saveOnboardingState(state: OnboardingState): void {
  localStorage.setItem('issuer_onboarding', JSON.stringify(state));
}

export function loadOffers(): IssuedOffer[] {
  try {
    return JSON.parse(localStorage.getItem('issuer_offers') || '[]');
  } catch { return []; }
}

export function saveOffers(offers: IssuedOffer[]): void {
  localStorage.setItem('issuer_offers', JSON.stringify(offers));
}
