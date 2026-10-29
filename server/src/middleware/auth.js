import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/http.js';
import { csrfProtection } from './csrf.js';
import { AUTH_COOKIE_NAME, parseCookies } from '../utils/cookies.js';

/**
 * Authentication middleware.
 *
 * Accepts a session token either from the HTTP-only cookie (browser clients)
 * or from an `Authorization: Bearer <token>` header (API clients such as
 * Postman). The resolved principal is always re-read from MongoDB so a
 * disabled or deleted account can never act on an old token.
 */
export function authenticate(config) {
  return asyncHandler(async (req, res, next) => {
    const { token, source } = extractToken(req);

    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { user, session } = await resolveSession(token, config);

    req.user = user;
    req.session = session;
    req.authSource = source;

    return next();
  });
}

/** Restricts a route to the listed roles. Must run after `authenticate`. */
export function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (req.user.status !== 'active') {
      return next(ApiError.forbidden('Account is disabled'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not allowed to perform this action`,
        ),
      );
    }
    return next();
  };
}

/**
 * Convenience bundle for protected routes:
 * authenticate -> role guard -> CSRF protection.
 */
export function protectedRoute(config, ...allowedRoles) {
  const handlers = [authenticate(config)];
  if (allowedRoles.length > 0) {
    handlers.push(requireRole(...allowedRoles));
  }
  handlers.push(csrfProtection());
  return handlers;
}

export function extractToken(req) {
  const authorization = req.headers?.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) return { token, source: 'bearer' };
  }

  const cookieToken = parseCookies(req)[AUTH_COOKIE_NAME];
  if (cookieToken) return { token: cookieToken, source: 'cookie' };

  return { token: null, source: null };
}

export async function resolveSession(token, config) {
  const { verifySessionToken } = await import('../services/authService.js');
  return verifySessionToken(token, config);
}

export default authenticate;
