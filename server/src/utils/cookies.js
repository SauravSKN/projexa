import crypto from 'node:crypto';

export const AUTH_COOKIE_NAME = 'projexa_token';
export const CSRF_COOKIE_NAME = 'projexa_csrf';

/** Minimal cookie header parser (avoids adding a dependency for one header). */
export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};

  const jar = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      jar[key] = decodeURIComponent(value);
    } catch {
      jar[key] = value;
    }
  }
  return jar;
}

export function setAuthCookie(res, token, config) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionTtlSeconds * 1000,
  });
}

/**
 * The CSRF cookie must be readable by the browser client so it can echo the
 * value back in the X-CSRF-Token header (double-submit pattern).
 */
export function setCsrfCookie(res, csrfToken, config) {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionTtlSeconds * 1000,
  });
}

export function clearAuthCookies(res, config) {
  const options = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  };
  res.clearCookie(AUTH_COOKIE_NAME, options);
  res.clearCookie(CSRF_COOKIE_NAME, { ...options, httpOnly: false });
}

/** Constant-time string comparison that never throws on length mismatch. */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
