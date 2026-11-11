import { ApiError } from "../utils/ApiError.js";
import { Permission } from "../modules/permissions/permission.model.js";
import { ROLES } from "../modules/users/user.model.js";

// Confirms the current user has the given action granted on a specific sub module.
// Only Admin bypasses granular permission checks — they own the whole tree. Super Admin
// does not: their scope is Admins + Users, not content.
export function requireSubModuleAccess(action) {
  return async function accessGuard(req, res, next) {
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }
    const subModuleId = req.params.subModuleId || req.body.subModule || req.query.subModule;
    if (!subModuleId) {
      throw new ApiError(400, "subModule is required to check access");
    }
    const grant = await Permission.findOne({ user: req.user._id, subModule: subModuleId });
    if (!grant || !grant.actions.includes(action)) {
      throw new ApiError(403, "You do not have access to this resource");
    }
    next();
  };
}
