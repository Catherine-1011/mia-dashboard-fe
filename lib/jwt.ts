// utils/jwt.ts
// Simple JWT decode utility (no validation, just base64 decode)
export type DecodedJWT = {
  [key: string]: unknown;
};
export function decodeJWT(token: string): DecodedJWT | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
