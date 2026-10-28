import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    session: { type: String, required: true, trim: true },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    guideId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

teamSchema.index({ memberIds: 1 });
teamSchema.index({ guideId: 1 });
teamSchema.index({ name: 1, session: 1 });

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
export default Team;
