import { ApiError } from "../utils/ApiError.js";

// Restricts a route to one or more roles. Requires requireAuth to have run first.
export function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };
}
