/** Shared success envelope: { success: true, data }. */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** Wraps an async express handler so rejected promises reach the error handler. */
export function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
