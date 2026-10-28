import express from 'express';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { authenticate } from '../middleware/auth.js';

export const userRouter = express.Router();

userRouter.use(authenticate);

/**
 * GET /api/v1/users?role=student|guide
 * Populates eligible student and guide selectors for team creation and assignment
 */
userRouter.get('/', async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = { status: 'active' };
    if (role && ['student', 'guide', 'admin'].includes(role)) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('_id fullName email role status department')
      .lean();

    // If querying guides, calculate current active team load for each guide
    if (role === 'guide') {
      const guideIds = users.map((u) => u._id);
      const loads = await Team.aggregate([
        { $match: { guideId: { $in: guideIds } } },
        { $group: { _id: '$guideId', teamCount: { $sum: 1 } } },
      ]);
      const loadMap = new Map(loads.map((l) => [String(l._id), l.teamCount]));

      const enriched = users.map((u) => ({
        id: String(u._id),
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        department: u.department,
        teamCount: loadMap.get(String(u._id)) || 0,
      }));
      return res.status(200).json({ success: true, data: enriched });
    }

    const formatted = users.map((u) => ({
      id: String(u._id),
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      department: u.department,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
});
