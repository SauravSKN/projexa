import mongoose from 'mongoose';

/**
 * Canonical Project schema (owned by Backend Member 3).
 *
 * Status contract (Phase 1): proposed -> approved -> active -> completed,
 * plus archived. `active` replaces the earlier `in-progress` value and is the
 * value used by the Member 4 seed fixtures and dashboard read services.
 */
const PROJECT_STATUSES = ['proposed', 'approved', 'active', 'completed', 'archived'];

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [2, 'Project title must be at least 2 characters'],
      maxlength: [200, 'Project title must be less than 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be less than 1000 characters'],
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'A project must belong to a team'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project creator is required'],
    },
    status: {
      type: String,
      enum: {
        values: PROJECT_STATUSES,
        message: '{VALUE} is not a supported project status',
      },
      default: 'proposed',
    },
    startDate: {
      type: Date,
      default: null,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [80, 'Category must be less than 80 characters'],
    },
    maxGrade: {
      type: Number,
      min: [0, 'Maximum grade must be zero or greater'],
      default: 100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

projectSchema.index({ teamId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ title: 1 });

projectSchema.pre('validate', function validateProject(next) {
  if (this.startDate && this.targetDate && this.targetDate < this.startDate) {
    this.invalidate('targetDate', 'Target date cannot be before the start date');
  }
  next();
});

export { PROJECT_STATUSES };

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
