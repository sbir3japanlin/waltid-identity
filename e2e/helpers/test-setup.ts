let counter = 0;

export function uniqueEmail(): string {
  counter += 1;
  const ts = Date.now();
  return `e2e-${ts}-${counter}@test.com`;
}

export const WALLET_URL = "http://localhost:5173";
export const ISSUER_URL = "http://localhost:5174";
export const VERIFIER_URL = "http://localhost:5175";

export const TEST_PASSWORD = "test123";
