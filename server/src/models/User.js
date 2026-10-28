import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['student', 'guide', 'admin'], required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    passwordHash: { type: String },
    department: { type: String, default: 'Computer Science & Engineering' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
