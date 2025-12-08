import express from 'express';
const router = express.Router();
import sessionManagementController from '../controllers/sessionManagementController.js';
import { authenticate } from '../middleware/auth.js';

// Get all active sessions for the user
router.get('/', authenticate, sessionManagementController.getActiveSessions);

// Get session statistics
router.get('/stats', authenticate, sessionManagementController.getSessionStats);

// Get specific session details
router.get('/:sessionId', authenticate, sessionManagementController.getSessionDetails);

// Revoke a specific session
router.delete('/:sessionId', authenticate, sessionManagementController.revokeSession);

// Revoke all sessions except current
router.post('/revoke-others', authenticate, sessionManagementController.revokeAllOtherSessions);

// Revoke all sessions (logout all devices)
router.post('/revoke-all', authenticate, sessionManagementController.revokeAllSessions);

// Cleanup expired sessions
router.post('/cleanup', authenticate, sessionManagementController.cleanupExpiredUserSessions);

export default router;
