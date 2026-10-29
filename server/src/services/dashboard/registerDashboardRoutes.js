/** Mount on /api/v1/dashboard in Backend Member 3's Express app. */
export function registerDashboardRoutes(router, { authenticate, service }) {
  if (!router || typeof authenticate !== 'function' || !service) {
    throw new TypeError('Router, authentication middleware and dashboard service are required');
  }

  const enforceRole = (role) => (req, res, next) => {
    // authenticate must validate the live session and populate req.user.
    if (!req.user?._id) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    }
    if (req.user.status !== 'active' || req.user.role !== role) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    return next();
  };

  for (const role of ['student', 'guide', 'admin']) {
    router.get(`/${role}`, authenticate, enforceRole(role), async (req, res, next) => {
      try {
        const data = await service[role](req.user);
        return res.status(200).json({ success: true, data });
      } catch (error) {
        return next(error);
      }
    });
  }
  return router;
}
