import User from '../models/User.js';
import Session from '../models/Session.js';
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  createSession,
  refreshAccessToken,
  revokeSession as revokeSessionUtil,
  revokeAllUserSessions,
  getUserSessions,
} from '../utils/tokenManager.js';
import { validateUserSignup, validateEmail } from '../utils/validation.js';
import {
  createdResponse,
  badRequestError,
  unauthorizedError,
  serverError,
  successResponse,
} from '../utils/response.js';

const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'Unknown',
    deviceName: req.get('device-name') || 'Unknown Device',
  };
};

export const signup = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    const validation = validateUserSignup({ username, email, password, phone });
    if (!validation.isValid) {
      return badRequestError(res, validation.error);
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return badRequestError(res, 'Username or email already exists');
    }

    const user = new User({
      username,
      email,
      password,
      phone,
      role: 'user',
    });

    await user.save();

    const tokens = generateTokenPair(user._id, user.role);

    const clientInfo = getClientInfo(req);
    const sessionResult = await createSession({
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      ...clientInfo,
    });
    console.log(sessionResult)
    if (!sessionResult.success) {
      return serverError(res, 'Failed to create session');
    }

    return createdResponse(res, 'User created successfully', {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    return serverError(res, 'Signup failed', error.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return badRequestError(res, 'Email and password are required');
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return badRequestError(res, emailValidation.error);
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || user.isDeleted) {
      return unauthorizedError(res, 'Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return unauthorizedError(res, 'Invalid email or password');
    }

    const tokens = generateTokenPair(user._id, user.role);
    const clientInfo = getClientInfo(req);
    const sessionResult = await createSession({
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      ...clientInfo,
    });

    if (!sessionResult.success) {
      return serverError(res, 'Failed to create session');
    }

    return successResponse(res, 200, 'Logged in successfully', {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    return serverError(res, 'Login failed', error.message);
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return badRequestError(res, 'Refresh token is required');
    }

    const tokenVerification = verifyRefreshToken(refreshToken);
    if (!tokenVerification.valid) {
      return unauthorizedError(res, 'Invalid or expired refresh token');
    }

    const userId = tokenVerification.decoded.userId;

    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return unauthorizedError(res, 'User not found');
    }

    const refreshResult = await refreshAccessToken(userId, refreshToken, user.role);

    if (!refreshResult.success) {
      return unauthorizedError(res, refreshResult.error);
    }

    return successResponse(res, 200, 'Token refreshed successfully', {
      tokens: {
        accessToken: refreshResult.tokens.accessToken,
        refreshToken: refreshResult.tokens.refreshToken,
        accessTokenExpiresAt: refreshResult.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: refreshResult.tokens.refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    return serverError(res, 'Token refresh failed', error.message);
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return badRequestError(res, 'Token is required');
    }

    const revokeResult = await revokeSessionUtil(token);

    if (!revokeResult.success) {
      return serverError(res, revokeResult.error);
    }

    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    return serverError(res, 'Logout failed', error.message);
  }
};

export const logoutAll = async (req, res) => {
  try {
    const userId = req.user.userId;

    const revokeResult = await revokeAllUserSessions(userId, 'logout');

    if (!revokeResult.success) {
      return serverError(res, revokeResult.error);
    }

    return successResponse(res, 200, 'Logged out from all devices');
  } catch (error) {
    return serverError(res, 'Logout failed', error.message);
  }
};

export const getSessions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const sessionsResult = await getUserSessions(userId, true);

    if (!sessionsResult.success) {
      return serverError(res, sessionsResult.error);
    }

    return successResponse(res, 200, 'Sessions retrieved successfully', {
      sessions: sessionsResult.sessions,
    });
  } catch (error) {
    return serverError(res, 'Failed to retrieve sessions', error.message);
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const session = await Session.findById(sessionId);

    if (!session) {
      return badRequestError(res, 'Session not found');
    }

    if (userRole !== 'admin' && session.userId.toString() !== userId) {
      return badRequestError(res, 'You can only revoke your own sessions');
    }

    await session.revoke('admin_action');

    return successResponse(res, 200, 'Session revoked successfully');
  } catch (error) {
    return serverError(res, 'Failed to revoke session', error.message);
  }
};
