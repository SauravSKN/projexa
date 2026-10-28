import express from 'express';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { Project } from '../models/Project.js';
import { createDashboardService } from '../services/dashboard/dashboardService.js';
import { registerDashboardRoutes } from '../services/dashboard/registerDashboardRoutes.js';
import { authenticate } from '../middleware/auth.js';

export const dashboardRouter = express.Router();

const dashboardService = createDashboardService({ User, Team, Project });
registerDashboardRoutes(dashboardRouter, { authenticate, service: dashboardService });
