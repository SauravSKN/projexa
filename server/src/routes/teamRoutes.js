import { Router } from 'express';
import { validateId, validateTeamCreate, validateTeamUpdate } from '../middleware/validate.js';
import { protectedRoute } from '../middleware/auth.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import {
  createTeam,
  getTeamForPrincipal,
  listTeamsForPrincipal,
  updateTeam,
} from '../services/teamService.js';

export function createTeamRouter({ config }) {
  const router = Router();

  router.post(
    '/',
    ...protectedRoute(config, 'admin'),
    validateTeamCreate,
    asyncHandler(async (req, res) => {
      const team = await createTeam({ payload: req.body, actor: req.user });
      const populated = await getTeamForPrincipal(req.user, team._id);
      return sendSuccess(res, { team: populated.toJSON() }, 201);
    }),
  );

  router.get(
    '/',
    ...protectedRoute(config),
    asyncHandler(async (req, res) => {
      const teams = await listTeamsForPrincipal(req.user);
      return sendSuccess(res, { teams: teams.map((team) => team.toJSON()) });
    }),
  );

  router.get(
    '/:id',
    ...protectedRoute(config),
    validateId,
    asyncHandler(async (req, res) => {
      const team = await getTeamForPrincipal(req.user, req.params.id);
      return sendSuccess(res, { team: team.toJSON() });
    }),
  );

  router.patch(
    '/:id',
    ...protectedRoute(config, 'admin'),
    validateId,
    validateTeamUpdate,
    asyncHandler(async (req, res) => {
      const team = await updateTeam({
        teamId: req.params.id,
        payload: req.body,
        actor: req.user,
      });
      const populated = await getTeamForPrincipal(req.user, team._id);
      return sendSuccess(res, { team: populated.toJSON() });
    }),
  );

  return router;
}

export default createTeamRouter;
