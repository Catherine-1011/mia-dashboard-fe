const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ENCODED_SEPARATOR = /%(?:2f|5c)/i;

export function getSafeInternalRedirect(candidate, fallback, trustedOrigin) {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTERS.test(candidate) ||
    ENCODED_SEPARATOR.test(candidate)
  ) return fallback;

  try {
    const origin = new URL(trustedOrigin).origin;
    const parsed = new URL(candidate, origin);
    return parsed.origin === origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function getSafeTrustedRedirect(candidate, fallback, trustedOrigins) {
  if (typeof candidate !== "string" || CONTROL_CHARACTERS.test(candidate)) return fallback;

  try {
    const parsed = new URL(candidate);
    const allowedOrigins = new Set(trustedOrigins.map((origin) => new URL(origin).origin));
    return allowedOrigins.has(parsed.origin) ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}
