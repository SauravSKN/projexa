import express from 'express';
import { Project } from '../models/Project.js';
import { Team } from '../models/Team.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const projectRouter = express.Router();

projectRouter.use(authenticate);

/**
 * GET /api/v1/projects
 * Role-scoped list of capstone projects:
 * - Admin: sees all projects
 * - Guide: sees only projects for teams under their supervision
 */
projectRouter.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'guide') {
      const guideTeams = await Team.find({ guideId: req.user._id }).select('_id').lean();
      filter.teamId = { $in: guideTeams.map((t) => t._id) };
    }

    const projects = await Project.find(filter)
      .populate('teamId', '_id name session')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = projects.map((p) => ({
      id: String(p._id),
      title: p.title,
      description: p.description,
      teamId: p.teamId ? String(p.teamId._id) : null,
      teamName: p.teamId ? p.teamId.name : null,
      teamSession: p.teamId ? p.teamId.session : null,
      startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
      targetDate: p.targetDate ? p.targetDate.toISOString().slice(0, 10) : null,
      status: p.status || 'active',
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/projects
 * Register new capstone project (Admin only)
 * Requirements: Title, Description, Associated Team, Chronological Dates (targetDate > startDate), Status
 */
projectRouter.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description, teamId, startDate, targetDate, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Project title is required' },
      });
    }

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Associated team selection is required' },
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Associated team ${teamId} not found` },
      });
    }

    if (!startDate || !targetDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start date and target completion date are required' },
      });
    }

    const start = new Date(startDate);
    const target = new Date(targetDate);
    if (isNaN(start.getTime()) || isNaN(target.getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid date format provided' },
      });
    }

    if (target <= start) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Target completion date must be strictly after the start date',
        },
      });
    }

    const project = await Project.create({
      title: title.trim(),
      description: (description || '').trim(),
      teamId: team._id,
      startDate: start,
      targetDate: target,
      status: status || 'active',
      createdBy: req.user._id,
    });

    const populated = await Project.findById(project._id).populate('teamId', '_id name session').lean();

    return res.status(201).json({
      success: true,
      data: {
        id: String(populated._id),
        title: populated.title,
        description: populated.description,
        teamId: populated.teamId ? String(populated.teamId._id) : null,
        teamName: populated.teamId ? populated.teamId.name : null,
        startDate: populated.startDate ? populated.startDate.toISOString().slice(0, 10) : null,
        targetDate: populated.targetDate ? populated.targetDate.toISOString().slice(0, 10) : null,
        status: populated.status,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/projects/:id
 * Edit permitted project metadata (Admin only)
 */
projectRouter.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, targetDate, status } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Project ${id} not found` },
      });
    }

    if (title) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (status) project.status = status;

    if (startDate) project.startDate = new Date(startDate);
    if (targetDate) project.targetDate = new Date(targetDate);

    if (project.targetDate <= project.startDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Target completion date must be strictly after the start date',
        },
      });
    }

    await project.save();

    const populated = await Project.findById(project._id).populate('teamId', '_id name session').lean();

    return res.status(200).json({
      success: true,
      data: {
        id: String(populated._id),
        title: populated.title,
        description: populated.description,
        teamId: populated.teamId ? String(populated.teamId._id) : null,
        teamName: populated.teamId ? populated.teamId.name : null,
        startDate: populated.startDate ? populated.startDate.toISOString().slice(0, 10) : null,
        targetDate: populated.targetDate ? populated.targetDate.toISOString().slice(0, 10) : null,
        status: populated.status,
      },
    });
  } catch (error) {
    return next(error);
  }
});
