import mongoose from 'mongoose';

/**
 * Server-side session records.
 *
 * The JWT carries a `sid` claim pointing at one of these documents. Logout
 * revokes the record, which genuinely invalidates the token instead of
 * pretending a stateless JWT can be "logged out".
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Session owner is required'],
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
    },
    csrfTokenHash: {
      type: String,
      required: [true, 'CSRF token hash is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiry is required'],
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      default: '',
      maxlength: 300,
    },
    ip: {
      type: String,
      default: '',
      maxlength: 60,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

export default Session;
