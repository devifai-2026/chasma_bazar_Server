import Session from '../models/Session.js';
import {
  successResponse,
  notFoundError,
  badRequestError,
  serverError,
} from '../utils/response.js';
import { validateObjectId } from '../utils/validation.js';

const sessionManagementController = {
  // Get all active sessions for the user
  getActiveSessions: async (req, res) => {
    try {
      const userId = req.user.userId;

      const sessions = await Session.getActiveSessionsForUser(userId);

      const formattedSessions = sessions.map(session => ({
        _id: session._id,
        deviceName: session.deviceName,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
        isCurrent: session._id.toString() === req.session._id.toString(),
      }));

      return successResponse(res, 'Active sessions retrieved', formattedSessions);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get session statistics
  getSessionStats: async (req, res) => {
    try {
      const userId = req.user.userId;

      const stats = await Session.getSessionStats(userId);

      return successResponse(res, 'Session statistics retrieved', stats);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Revoke a specific session
  revokeSession: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.userId;

      // Validate ObjectId
      if (!validateObjectId(sessionId)) {
        return badRequestError(res, 'Invalid session ID format');
      }

      // Find and verify session belongs to user
      const session = await Session.findById(sessionId);
      if (!session) {
        return notFoundError(res, 'Session not found');
      }

      if (session.userId.toString() !== userId.toString()) {
        return badRequestError(res, 'Cannot revoke session of another user');
      }

      // Revoke the session
      await session.revoke('logout');

      return successResponse(res, 'Session revoked successfully');
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Revoke all sessions except current
  revokeAllOtherSessions: async (req, res) => {
    try {
      const userId = req.user.userId;
      const currentSessionId = req.session._id;

      // Get all active sessions except current
      const sessionsToRevoke = await Session.find({
        userId,
        _id: { $ne: currentSessionId },
        isActive: true,
      });

      // Revoke each session
      for (const session of sessionsToRevoke) {
        await session.revoke('logout');
      }

      return successResponse(res, `${sessionsToRevoke.length} sessions revoked`, {
        revokedCount: sessionsToRevoke.length,
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Revoke all sessions (logout from all devices)
  revokeAllSessions: async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await Session.revokeAllUserSessions(userId, 'logout');

      return successResponse(res, 'All sessions revoked', {
        revokedCount: result.modifiedCount,
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get session details
  getSessionDetails: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.userId;

      // Validate ObjectId
      if (!validateObjectId(sessionId)) {
        return badRequestError(res, 'Invalid session ID format');
      }

      // Find session
      const session = await Session.findById(sessionId);
      if (!session) {
        return notFoundError(res, 'Session not found');
      }

      // Verify ownership
      if (session.userId.toString() !== userId.toString()) {
        return badRequestError(res, 'Cannot access session of another user');
      }

      const details = {
        _id: session._id,
        deviceName: session.deviceName,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        revokedAt: session.revokedAt,
        revokeReason: session.revokeReason,
      };

      return successResponse(res, 'Session details retrieved', details);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Cleanup all expired sessions for current user
  cleanupExpiredUserSessions: async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await Session.deleteMany({
        userId,
        refreshTokenExpiresAt: { $lt: new Date() },
      });

      return successResponse(res, 'Expired sessions cleaned up', {
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  },
};

export default sessionManagementController;
