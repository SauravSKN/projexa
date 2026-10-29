import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Canonical User schema (owned by Backend Member 3).
 *
 * `fullName` is the single canonical name field, matching the dashboard
 * services delivered by Backend Member 4. The legacy `name` field has been
 * removed so no duplicate/conflicting identity field exists.
 */
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name must be less than 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [160, 'Email must be less than 160 characters'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'guide', 'admin'],
        message: '{VALUE} is not a supported role',
      },
      default: 'student',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'disabled'],
        message: '{VALUE} is not a supported account status',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, status: 1 });

/** Compares a candidate plain-text password with the stored bcrypt hash. */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (typeof candidatePassword !== 'string' || !this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/** Hashes a plain-text password using bcrypt with a per-password salt. */
userSchema.statics.hashPassword = async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new TypeError('A plain-text password is required');
  }
  return bcrypt.hash(plainPassword, 12);
};

/** Safe public projection used by every API response. */
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
