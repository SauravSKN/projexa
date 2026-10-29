import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateLogin, validateRegister } from '../middleware/validate.js';
import { authenticate, protectedRoute } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import {
  clearAuthCookies,
  setAuthCookie,
  setCsrfCookie,
} from '../utils/cookies.js';
import {
  issueSession,
  login,
  registerPublicUser,
  revokeSession,
} from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

function requestContext(req) {
  return {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
  };
}

export function createAuthRouter({ config }) {
  const router = Router();

  // Credential endpoints are rate limited in every non-test environment.
  const credentialLimiter = config.isTest
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many authentication attempts, please try again later',
          },
        },
      });

  /**
   * Public registration. The role field is accepted by the schema but never
   * honoured: only `student` can be self-registered. Guide and admin accounts
   * must be provisioned by an authenticated administrator.
   */
  router.post(
    '/register',
    credentialLimiter,
    validateRegister,
    asyncHandler(async (req, res) => {
      const { fullName, email, password, role } = req.body;

      if (role && role !== 'student') {
        throw ApiError.forbidden(
          'Public registration cannot assign the guide or admin role',
        );
      }

      const user = await registerPublicUser({ fullName, email, password });
      const { token, csrfToken } = await issueSession({
        user,
        config,
        context: requestContext(req),
      });

      setAuthCookie(res, token, config);
      setCsrfCookie(res, csrfToken, config);

      return sendSuccess(
        res,
        {
          user: user.toSafeObject(),
          token,
          csrfToken,
          expiresIn: config.sessionTtlSeconds,
        },
        201,
      );
    }),
  );

  router.post(
    '/login',
    credentialLimiter,
    validateLogin,
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;

      const result = await login({
        email,
        password,
        config,
        context: requestContext(req),
      });

      setAuthCookie(res, result.token, config);
      setCsrfCookie(res, result.csrfToken, config);

      return sendSuccess(res, {
        user: result.user.toSafeObject(),
        token: result.token,
        csrfToken: result.csrfToken,
        expiresIn: config.sessionTtlSeconds,
      });
    }),
  );

  router.get(
    '/me',
    authenticate(config),
    asyncHandler(async (req, res) => {
      return sendSuccess(res, { user: req.user.toSafeObject() });
    }),
  );

  router.post(
    '/logout',
    authenticate(config),
    csrfProtection(),
    asyncHandler(async (req, res) => {
      await revokeSession(req.session);
      clearAuthCookies(res, config);
      return sendSuccess(res, { message: 'Logged out successfully' });
    }),
  );

  return router;
}

export { protectedRoute };
export default createAuthRouter;
