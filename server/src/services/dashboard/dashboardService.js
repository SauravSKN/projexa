/** Phase 1 dashboard read services. Models are provided by Backend Member 3. */

export class DashboardAccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'DashboardAccessError';
    this.status = status;
    this.code = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN';
  }
}

const id = (value) => String(value);

function cleanIdentity(user, role) {
  if (!user || user.status !== 'active' || user.role !== role) {
    throw new DashboardAccessError('This dashboard is not available to this account');
  }
  return user;
}

export function createDashboardService({ User, Team, Project }) {
  if (!User || !Team || !Project) throw new TypeError('User, Team and Project models are required');

  async function identity(principal, role) {
    if (!principal?._id) throw new DashboardAccessError('Authentication required', 401);
    const user = await User.findById(principal._id).select('_id fullName role status').lean();
    return cleanIdentity(user, role);
  }

  return {
    async student(principal) {
      const user = await identity(principal, 'student');
      const team = await Team.findOne({ memberIds: user._id })
        .select('_id name memberIds guideId').lean();
      if (!team) return { userName: user.fullName, team: null, project: null, guide: null };

      const [project, guide] = await Promise.all([
        Project.findOne({ teamId: team._id }).select('_id title status').lean(),
        team.guideId
          ? User.findById(team.guideId).select('_id fullName').lean()
          : Promise.resolve(null),
      ]);
      return {
        userName: user.fullName,
        team: { id: id(team._id), name: team.name, memberCount: team.memberIds.length },
        project: project ? { id: id(project._id), title: project.title, status: project.status } : null,
        guide: guide ? { name: guide.fullName } : null,
      };
    },

    async guide(principal) {
      const user = await identity(principal, 'guide');
      const teams = await Team.find({ guideId: user._id }).select('_id name').lean();
      if (teams.length === 0) return { assignedTeamCount: 0, projectCount: 0, assignedTeams: [] };

      const projects = await Project.find({ teamId: { $in: teams.map((team) => team._id) } })
        .select('_id teamId title').lean();
      const projectByTeam = new Map(projects.map((project) => [id(project.teamId), project]));
      return {
        assignedTeamCount: teams.length,
        projectCount: projects.length,
        assignedTeams: teams.map((team) => ({
          id: id(team._id), name: team.name,
          projectTitle: projectByTeam.get(id(team._id))?.title ?? null,
        })),
      };
    },

    async admin(principal) {
      await identity(principal, 'admin');
      const [studentCount, guideCount, teamCount, projectCount, guides, loads] = await Promise.all([
        User.countDocuments({ role: 'student', status: 'active' }),
        User.countDocuments({ role: 'guide', status: 'active' }),
        Team.countDocuments({}),
        Project.countDocuments({}),
        User.find({ role: 'guide', status: 'active' }).select('_id fullName').lean(),
        Team.aggregate([
          { $match: { guideId: { $ne: null } } },
          { $group: { _id: '$guideId', teamCount: { $sum: 1 } } },
        ]),
      ]);
      const counts = new Map(loads.map((entry) => [id(entry._id), entry.teamCount]));
      return {
        studentCount, guideCount, teamCount, projectCount,
        guideLoad: guides.map((guide) => ({
          guideId: id(guide._id), guideName: guide.fullName,
          teamCount: counts.get(id(guide._id)) ?? 0,
        })).sort((a, b) => a.guideName.localeCompare(b.guideName)),
      };
    },
  };
}
