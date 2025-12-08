import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';

// Access token: short-lived (15 minutes)
const generateAccessToken = (userId, role) => {
  const accessTokenSecret = process.env.JWT_SECRET;
  const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRE || '15m';

  const token = jwt.sign(
    { userId, role, type: 'access' },
    accessTokenSecret,
    { expiresIn: accessTokenExpiry }
  );

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  return {
    token,
    expiresAt,
    expiresIn: accessTokenExpiry,
  };
};

// Refresh token: long-lived (7 days)
const generateRefreshToken = (userId) => {
  const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRE || '7d';

  const token = jwt.sign(
    { userId, type: 'refresh' },
    refreshTokenSecret,
    { expiresIn: refreshTokenExpiry }
  );

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  return {
    token,
    expiresAt,
    expiresIn: refreshTokenExpiry,
  };
};

const generateTokenPair = (userId, role) => {
  const accessTokenData = generateAccessToken(userId, role);
  const refreshTokenData = generateRefreshToken(userId);

  return {
    accessToken: accessTokenData.token,
    accessTokenExpiresAt: accessTokenData.expiresAt,
    refreshToken: refreshTokenData.token,
    refreshTokenExpiresAt: refreshTokenData.expiresAt,
  };
};

const verifyAccessToken = (token) => {
  try {
    const accessTokenSecret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, accessTokenSecret);

    if (decoded.type !== 'access') {
      return {
        valid: false,
        decoded: null,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      decoded,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      decoded: null,
      error: error.message,
    };
  }
};

const verifyRefreshToken = (token) => {
  try {
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, refreshTokenSecret);

    if (decoded.type !== 'refresh') {
      return {
        valid: false,
        decoded: null,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      decoded,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      decoded: null,
      error: error.message,
    };
  }
};

const createSession = async (sessionData) => {
  try {
    const session = new Session(sessionData);
    await session.save();

    return {
      success: true,
      session,
      error: null,
    };
  } catch (error) {
    console.log(error)
    return {
      success: false,
      session: null,
      error: error.message,
    };
  }
};

const getActiveSession = async (userId) => {
  try {
    const session = await Session.findOne({
      userId,
      isActive: true,
    });

    if (!session) {
      return {
        found: false,
        session: null,
        error: 'No active session found',
      };
    }

    return {
      found: true,
      session,
      error: null,
    };
  } catch (error) {
    return {
      found: false,
      session: null,
      error: error.message,
    };
  }
};

const refreshAccessToken = async (userId, refreshToken, role) => {
  try {
    const tokenVerification = verifyRefreshToken(refreshToken);
    if (!tokenVerification.valid) {
      return {
        success: false,
        tokens: null,
        error: tokenVerification.error,
      };
    }

    const session = await Session.findOne({
      userId,
      refreshToken,
      isActive: true,
    });

    if (!session) {
      return {
        success: false,
        tokens: null,
        error: 'Refresh token not found or session is inactive',
      };
    }

    if (session.refreshTokenExpiresAt < new Date()) {
      await session.revoke('token_expired');
      return {
        success: false,
        tokens: null,
        error: 'Refresh token has expired',
      };
    }

    const newTokens = generateTokenPair(userId, role);

    session.accessToken = newTokens.accessToken;
    session.refreshToken = newTokens.refreshToken;
    session.accessTokenExpiresAt = newTokens.accessTokenExpiresAt;
    session.refreshTokenExpiresAt = newTokens.refreshTokenExpiresAt;
    session.lastActivityAt = new Date();
    await session.save();

    return {
      success: true,
      tokens: newTokens,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      tokens: null,
      error: error.message,
    };
  }
};

const revokeSession = async (accessToken) => {
  try {
    const session = await Session.findOne({
      accessToken,
      isActive: true,
    });

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    await session.revoke('logout');

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

const revokeAllUserSessions = async (userId, reason = 'logout') => {
  try {
    await Session.revokeAllUserSessions(userId, reason);

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

const validateSession = async (accessToken) => {
  try {
    const session = await Session.findOne({
      accessToken,
      isActive: true,
    });

    if (!session) {
      return {
        valid: false,
        session: null,
        error: 'Session not found or is inactive',
      };
    }

    if (!session.isValid()) {
      await session.revoke('token_expired');
      return {
        valid: false,
        session: null,
        error: 'Session has expired',
      };
    }

    return {
      valid: true,
      session,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      session: null,
      error: error.message,
    };
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.cleanupExpiredSessions();

    return {
      success: true,
      deletedCount: result.deletedCount,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error.message,
    };
  }
};

const getUserSessions = async (userId, activeOnly = true) => {
  try {
    const filter = { userId };
    if (activeOnly) {
      filter.isActive = true;
    }

    const sessions = await Session.find(filter)
      .select('-accessToken -refreshToken')
      .sort({ createdAt: -1 });

    return {
      success: true,
      sessions,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      sessions: [],
      error: error.message,
    };
  }
};

export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  createSession,
  getActiveSession,
  refreshAccessToken,
  revokeSession,
  revokeAllUserSessions,
  validateSession,
  decodeToken,
  cleanupExpiredSessions,
  getUserSessions,
};
