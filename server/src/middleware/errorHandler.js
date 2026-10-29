import { ApiError } from '../utils/ApiError.js';

/**
 * Central error handler. Converts known failures into the shared Projexa
 * error envelope and never leaks stack traces or secrets to clients.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const error = normaliseError(err);

  if (error.status >= 500) {
    console.error('[PROJEXA] Unhandled server error:', err);
  }

  const payload = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details) payload.error.details = error.details;

  return res.status(error.status).json(payload);
}

function normaliseError(err) {
  if (err instanceof ApiError) return err;

  if (err?.name === 'CastError') {
    return ApiError.badRequest(`Invalid identifier: ${err.value}`);
  }
  if (err?.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((entry) => ({
      field: entry.path,
      message: entry.message,
    }));
    return ApiError.badRequest(details.map((entry) => entry.message).join(', '), details);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`A record with that ${field} already exists`);
  }
  if (err?.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid or malformed session token');
  }
  if (err?.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Session token has expired');
  }
  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON');
  }

  return ApiError.internal();
}

/** Terminal 404 handler for unmatched routes. */
export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
}

export default errorHandler;
