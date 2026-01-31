import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    accessToken: {
      type: String,
      required: [true, 'Access token is required'],
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: [true, 'Refresh token is required'],
      unique: true,
      index: true,
    },
    accessTokenExpiresAt: {
      type: Date,
      required: [true, 'Access token expiration is required'],
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: [true, 'Refresh token expiration is required'],
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokeReason: {
      type: String,
      enum: ['logout', 'token_expired', 'security_breach', 'admin_action', 'password_change'],
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    pageViews: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ refreshTokenExpiresAt: 1 });

sessionSchema.methods.revoke = function (reason = 'logout') {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokeReason = reason;
  return this.save();
};

sessionSchema.methods.isValid = function () {
  return (
    this.isActive &&
    this.refreshTokenExpiresAt > new Date()
  );
};

sessionSchema.methods.updateActivity = function () {
  this.lastActivityAt = new Date();
  this.pageViews = (this.pageViews || 0) + 1;
  return this.save();
};

sessionSchema.statics.findActiveSession = function (accessToken, refreshToken) {
  return this.findOne({
    accessToken,
    refreshToken,
    isActive: true,
  });
};

sessionSchema.statics.revokeAllUserSessions = function (userId, reason = 'logout') {
  return this.updateMany(
    { userId, isActive: true },
    {
      isActive: false,
      revokedAt: new Date(),
      revokeReason: reason,
    }
  );
};

sessionSchema.statics.cleanupExpiredSessions = function () {
  return this.deleteMany({
    refreshTokenExpiresAt: { $lt: new Date() },
  });
};

sessionSchema.statics.cleanupRevokedSessions = function (daysOld = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysOld);

  return this.deleteMany({
    isActive: false,
    revokedAt: { $lt: dateThreshold },
  });
};

sessionSchema.statics.cleanupInactiveSessions = function (daysInactive = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysInactive);

  return this.deleteMany({
    lastActivityAt: { $lt: dateThreshold },
    isActive: false,
  });
};

sessionSchema.statics.getActiveSessionsForUser = function (userId) {
  return this.find({
    userId,
    isActive: true,
    refreshTokenExpiresAt: { $gt: new Date() },
  }).sort({ lastActivityAt: -1 });
};

sessionSchema.statics.getSessionStats = async function (userId) {
  const activeSessions = await this.countDocuments({
    userId,
    isActive: true,
    refreshTokenExpiresAt: { $gt: new Date() },
  });

  const totalSessions = await this.countDocuments({ userId });

  const lastActivity = await this.findOne({ userId })
    .sort({ lastActivityAt: -1 })
    .select('lastActivityAt deviceName');

  return {
    activeSessions,
    totalSessions,
    lastActivity,
  };
};

export default mongoose.model('Session', sessionSchema);
