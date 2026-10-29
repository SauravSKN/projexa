import mongoose from 'mongoose';

/**
 * Canonical Team schema (owned by Backend Member 3).
 *
 * `session` is the canonical academic-session field (replacing the earlier
 * `semester` name) to match the Member 4 handoff contract.
 */
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [100, 'Team name must be less than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
    session: {
      type: String,
      required: [true, 'Academic session is required'],
      trim: true,
      maxlength: [20, 'Academic session must be less than 20 characters'],
    },
    memberIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team creator is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'finalized', 'archived'],
        message: '{VALUE} is not a supported team status',
      },
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

teamSchema.index({ name: 1, session: 1 });
teamSchema.index({ memberIds: 1 });
teamSchema.index({ guideId: 1 });
teamSchema.index({ status: 1 });

/**
 * Array-level validation. The previous implementation attached the validator
 * to the array *elements*, so it never checked the collection as a whole.
 */
teamSchema.pre('validate', function validateTeam(next) {
  const ids = (this.memberIds || []).map((id) => String(id));

  if (new Set(ids).size !== ids.length) {
    this.invalidate('memberIds', 'Team members must be unique');
  }
  if (ids.length > 5) {
    this.invalidate('memberIds', 'A team must not have more than 5 student members');
  }
  if (this.status === 'finalized' && ids.length < 3) {
    this.invalidate(
      'memberIds',
      'A finalized team must have between 3 and 5 student members',
    );
  }

  next();
});

teamSchema.virtual('memberCount').get(function memberCount() {
  return this.memberIds ? this.memberIds.length : 0;
});

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

export default Team;
