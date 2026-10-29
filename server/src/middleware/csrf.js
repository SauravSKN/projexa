import { ApiError } from '../utils/ApiError.js';
import { CSRF_COOKIE_NAME, parseCookies, safeCompare } from '../utils/cookies.js';
import { hashToken } from '../services/authService.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection.
 *
 * It only applies to requests authenticated through the ambient HTTP-only
 * cookie, because browsers attach that cookie automatically. Requests that
 * present an explicit `Authorization: Bearer` header are not vulnerable to
 * CSRF (a browser cannot attach that header cross-site without a successful
 * CORS pre-flight).
 */
export function csrfProtection() {
  return function csrfGuard(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.authSource !== 'cookie') return next();
    if (!req.session) return next(ApiError.unauthorized('Authentication required'));

    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = parseCookies(req)[CSRF_COOKIE_NAME];

    if (typeof headerToken !== 'string' || !headerToken) {
      return next(ApiError.forbidden('Missing X-CSRF-Token header'));
    }
    if (!cookieToken || !safeCompare(headerToken, cookieToken)) {
      return next(ApiError.forbidden('Invalid CSRF token'));
    }
    if (req.session.csrfTokenHash !== hashToken(headerToken)) {
      return next(ApiError.forbidden('CSRF token does not belong to this session'));
    }

    return next();
  };
}

export default csrfProtection;
