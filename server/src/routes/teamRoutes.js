import express from 'express';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const teamRouter = express.Router();

teamRouter.use(authenticate);

/**
 * GET /api/v1/teams
 * Role-scoped list of teams:
 * - Admin: sees all teams
 * - Guide: sees only assigned teams (data isolation)
 */
teamRouter.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'guide') {
      filter.guideId = req.user._id;
    }

    const rawTeams = await Team.find(filter)
      .populate('memberIds', '_id fullName email role')
      .populate('guideId', '_id fullName email role')
      .sort({ createdAt: -1 })
      .lean();

    // Map projects associated with teams
    const teamIds = rawTeams.map((t) => t._id);
    const projects = await Project.find({ teamId: { $in: teamIds } }).select('_id title teamId status startDate targetDate description').lean();
    const projectMap = new Map(projects.map((p) => [String(p.teamId), p]));

    const formatted = rawTeams.map((t) => {
      const proj = projectMap.get(String(t._id));
      return {
        id: String(t._id),
        name: t.name,
        session: t.session,
        status: t.status || 'active',
        guideId: t.guideId ? String(t.guideId._id) : null,
        guideName: t.guideId ? t.guideId.fullName : null,
        members: (t.memberIds || []).map((m) => ({
          id: String(m._id),
          fullName: m.fullName,
          email: m.email,
        })),
        projectTitle: proj ? proj.title : null,
        project: proj ? {
          id: String(proj._id),
          title: proj.title,
          description: proj.description,
          status: proj.status,
          startDate: proj.startDate ? proj.startDate.toISOString().slice(0, 10) : null,
          targetDate: proj.targetDate ? proj.targetDate.toISOString().slice(0, 10) : null,
        } : null,
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/teams
 * Create team (Admin only)
 * Requirements: Team name, session, 3–5 distinct students, optional guide
 */
teamRouter.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, session, memberIds, guideId } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Team name is required' },
      });
    }

    if (!session || typeof session !== 'string' || !session.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Academic session is required' },
      });
    }

    if (!Array.isArray(memberIds) || memberIds.length < 3 || memberIds.length > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A team must have between 3 and 5 unique student members',
        },
      });
    }

    // Check uniqueness of memberIds
    const uniqueIds = [...new Set(memberIds.map(String))];
    if (uniqueIds.length !== memberIds.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Duplicate student members detected in team roster',
        },
      });
    }

    // Verify all selected members are valid, active students
    const studentUsers = await User.find({
      _id: { $in: uniqueIds },
      role: 'student',
      status: 'active',
    });

    if (studentUsers.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'One or more selected members are not active, registered student accounts',
        },
      });
    }

    // If guideId is provided, verify guide is an active faculty guide
    let validGuideId = null;
    if (guideId) {
      const guideUser = await User.findOne({ _id: guideId, role: 'guide', status: 'active' });
      if (!guideUser) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Selected guide is not an active faculty guide' },
        });
      }
      validGuideId = guideUser._id;
    }

    const team = await Team.create({
      name: name.trim(),
      session: session.trim(),
      memberIds: uniqueIds,
      guideId: validGuideId,
      createdBy: req.user._id,
      status: 'finalized',
    });

    const populated = await Team.findById(team._id)
      .populate('memberIds', '_id fullName email')
      .populate('guideId', '_id fullName email')
      .lean();

    return res.status(201).json({
      success: true,
      data: {
        id: String(populated._id),
        name: populated.name,
        session: populated.session,
        status: populated.status,
        guideId: populated.guideId ? String(populated.guideId._id) : null,
        guideName: populated.guideId ? populated.guideId.fullName : null,
        members: (populated.memberIds || []).map((m) => ({
          id: String(m._id),
          fullName: m.fullName,
          email: m.email,
        })),
        projectTitle: null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/teams/:id
 * Assign/reassign guide or update team metadata (Admin only)
 */
teamRouter.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { guideId, name, session, status } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Team ${id} not found` },
      });
    }

    if (guideId !== undefined) {
      if (guideId === null || guideId === '') {
        team.guideId = null;
      } else {
        const guideUser = await User.findOne({ _id: guideId, role: 'guide', status: 'active' });
        if (!guideUser) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Target guide is not an active faculty guide' },
          });
        }
        team.guideId = guideUser._id;
      }
    }

    if (name) team.name = name.trim();
    if (session) team.session = session.trim();
    if (status) team.status = status;

    await team.save();

    const updated = await Team.findById(team._id)
      .populate('memberIds', '_id fullName email')
      .populate('guideId', '_id fullName email')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        id: String(updated._id),
        name: updated.name,
        session: updated.session,
        status: updated.status,
        guideId: updated.guideId ? String(updated.guideId._id) : null,
        guideName: updated.guideId ? updated.guideId.fullName : null,
        members: (updated.memberIds || []).map((m) => ({
          id: String(m._id),
          fullName: m.fullName,
          email: m.email,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});
