import aj from '#config/arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    let limit;

    switch (role) {
      case 'admin':
        limit = isDevelopment ? 1000 : 20;
        break;
      case 'user':
        limit = isDevelopment ? 500 : 10;
        break;
      case 'guest':
        limit = isDevelopment ? 200 : 5;
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: isDevelopment ? 'DRY_RUN' : 'LIVE',
        interval: '1m',
        max: limit,
        name: `${role}-rate-limit`,
      })
    );

    const decision = await client.protect(req);

    // Only enforce bot detection in production mode
    if (
      decision.isDenied() &&
      decision.reason.isBot() &&
      process.env.NODE_ENV === 'production'
    ) {
      logger.warn('Bot request blocked', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Automated requests are not allowed',
      });
    }

    // Shield blocking is disabled in DRY_RUN mode
    if (
      decision.isDenied() &&
      decision.reason.isShield() &&
      process.env.NODE_ENV === 'production'
    ) {
      logger.warn('Shield Blocked request', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request blocked by security policy',
      });
    }

    // Rate limiting is disabled in DRY_RUN mode, but check anyway for safety
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      // Only enforce in production (DRY_RUN mode shouldn't trigger this, but just in case)
      if (process.env.NODE_ENV === 'production') {
        return res
          .status(403)
          .json({ error: 'Forbidden', message: 'Too many requests' });
      }
    }

    next();
  } catch (e) {
    // Log error but don't block requests in development if Arcjet fails
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      logger.warn(
        'Arcjet middleware error (continuing in dev mode):',
        e.message
      );
      return next(); // Continue in development even if Arcjet fails
    }

    logger.error('Arcjet middleware error:', e);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong with security middleware',
    });
  }
};
export default securityMiddleware;
