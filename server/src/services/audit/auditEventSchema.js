/** Coordinate model registration with BE1; call once in the shared Mongoose connection. */
export function registerAuditEventModel(mongoose) {
  if (mongoose.models.AuditEvent) return mongoose.models.AuditEvent;
  const schema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    action: { type: String, required: true, immutable: true },
    targetType: { type: String, enum: ['Team', 'Project'], required: true, immutable: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    timestamp: { type: Date, required: true, default: Date.now, immutable: true },
    changeSummary: {
      fieldsChanged: { type: [String], default: [], immutable: true },
    },
  }, { strict: 'throw', versionKey: false });

  schema.index({ targetType: 1, targetId: 1, timestamp: -1 });
  schema.index({ actorId: 1, timestamp: -1 });
  const blockMutation = function blockMutation(next) { next(new Error('Audit events are append-only')); };
  for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
    schema.pre(operation, blockMutation);
  }
  return mongoose.model('AuditEvent', schema);
}
