import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    startDate: { type: Date, required: true },
    targetDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'pending', 'draft', 'completed'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectSchema.index({ teamId: 1 });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export default Project;
