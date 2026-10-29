import { Router } from 'express';
import { validateId, validateProjectCreate, validateProjectUpdate } from '../middleware/validate.js';
import { protectedRoute } from '../middleware/auth.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import {
  createProject,
  getProjectForPrincipal,
  listProjectsForPrincipal,
  updateProject,
} from '../services/projectService.js';

export function createProjectRouter({ config }) {
  const router = Router();

  router.post(
    '/',
    ...protectedRoute(config, 'admin'),
    validateProjectCreate,
    asyncHandler(async (req, res) => {
      const project = await createProject({ payload: req.body, actor: req.user });
      const populated = await getProjectForPrincipal(req.user, project._id);
      return sendSuccess(res, { project: populated.toJSON() }, 201);
    }),
  );

  router.get(
    '/',
    ...protectedRoute(config),
    asyncHandler(async (req, res) => {
      const projects = await listProjectsForPrincipal(req.user);
      return sendSuccess(res, {
        projects: projects.map((project) => project.toJSON()),
      });
    }),
  );

  router.get(
    '/:id',
    ...protectedRoute(config),
    validateId,
    asyncHandler(async (req, res) => {
      const project = await getProjectForPrincipal(req.user, req.params.id);
      return sendSuccess(res, { project: project.toJSON() });
    }),
  );

  router.patch(
    '/:id',
    ...protectedRoute(config, 'admin'),
    validateId,
    validateProjectUpdate,
    asyncHandler(async (req, res) => {
      const project = await updateProject({
        projectId: req.params.id,
        payload: req.body,
        actor: req.user,
      });
      const populated = await getProjectForPrincipal(req.user, project._id);
      return sendSuccess(res, { project: populated.toJSON() });
    }),
  );

  return router;
}

export default createProjectRouter;
