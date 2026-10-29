import { Router } from 'express';
import { validateAdminUserCreate, validateId, validateUserListQuery, validateUserStatusUpdate } from '../middleware/validate.js';
import { protectedRoute } from '../middleware/auth.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import {
  createUserByAdmin,
  listUsers,
  setUserStatus,
} from '../services/authService.js';

/**
 * Administrative user directory.
 *
 * `GET /api/v1/users` and `POST /api/v1/users` are admin only. This is the
 * only supported way to provision guide and admin accounts.
 */
export function createUserRouter({ config }) {
  const router = Router();

  router.get(
    '/',
    ...protectedRoute(config, 'admin'),
    validateUserListQuery,
    asyncHandler(async (req, res) => {
      const limit = Number.parseInt(req.query.limit ?? '50', 10);
      const offset = Number.parseInt(req.query.offset ?? '0', 10);

      const data = await listUsers({
        role: req.query.role,
        status: req.query.status,
        limit,
        offset,
      });

      return sendSuccess(res, data);
    }),
  );

  router.post(
    '/',
    ...protectedRoute(config, 'admin'),
    validateAdminUserCreate,
    asyncHandler(async (req, res) => {
      const { fullName, email, password, role } = req.body;
      const user = await createUserByAdmin({ fullName, email, password, role });
      return sendSuccess(res, { user: user.toSafeObject() }, 201);
    }),
  );

  router.patch(
    '/:id/status',
    ...protectedRoute(config, 'admin'),
    validateId,
    validateUserStatusUpdate,
    asyncHandler(async (req, res) => {
      const user = await setUserStatus({
        userId: req.params.id,
        status: req.body.status,
      });
      return sendSuccess(res, { user: user.toSafeObject() });
    }),
  );

  return router;
}

export default createUserRouter;
