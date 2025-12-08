import { verifyAccessToken, validateSession } from '../utils/tokenManager.js';

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Authorization token not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const tokenVerification = verifyAccessToken(token);

    if (!tokenVerification.valid) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Invalid or expired token',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const sessionValidation = await validateSession(token);

    if (!sessionValidation.valid) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: sessionValidation.error || 'Session invalid or expired',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    if (sessionValidation.session) {
      await sessionValidation.session.updateActivity();
    }

    req.user = tokenVerification.decoded;
    req.session = sessionValidation.session;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      status: 'error',
      statusCode: 401,
      message: 'Authentication failed',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Authentication required',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Insufficient permissions for this action',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return next();
    }

    const tokenVerification = verifyAccessToken(token);

    if (!tokenVerification.valid) {
      return next();
    }

    const sessionValidation = await validateSession(token);

    if (!sessionValidation.valid) {
      return next();
    }

    if (sessionValidation.session) {
      await sessionValidation.session.updateActivity();
    }

    req.user = tokenVerification.decoded;
    req.session = sessionValidation.session;

    next();
  } catch (error) {
    next();
  }
};

const verifyDevice = (req, res, next) => {
  if (!req.session || !req.user) {
    return res.status(401).json({
      success: false,
      status: 'error',
      statusCode: 401,
      message: 'Authentication required',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  const currentUserAgent = req.get('user-agent');
  const sessionUserAgent = req.session.userAgent;

  if (currentUserAgent !== sessionUserAgent) {
    return res.status(403).json({
      success: false,
      status: 'error',
      statusCode: 403,
      message: 'Device mismatch. Please login again.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

export {
  authenticate,
  authorize,
  optionalAuthenticate,
  verifyDevice,
};
