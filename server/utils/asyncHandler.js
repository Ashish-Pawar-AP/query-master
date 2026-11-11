// Wraps an async route handler so thrown errors are forwarded to Express's error middleware.
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
