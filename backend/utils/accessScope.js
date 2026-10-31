import { Permission } from "../modules/permissions/permission.model.js";
import { ROLES } from "../modules/users/user.model.js";
import { ApiError } from "./ApiError.js";

// Returns the set of category/module/subModule ids a USER can see, derived from their
// granted permissions. Only meaningful for role === USER — Admin and Super Admin use
// getContentFilter/assertContentAccess below instead, which apply ownership rules rather
// than permission grants.
export async function getAccessibleScope(user) {
  const grants = await Permission.find({ user: user._id }).lean();
  return {
    categoryIds: [...new Set(grants.map((g) => g.category.toString()))],
    moduleIds: [...new Set(grants.map((g) => g.module.toString()))],
    subModuleIds: [...new Set(grants.map((g) => g.subModule.toString()))],
    grantsBySubModule: Object.fromEntries(grants.map((g) => [g.subModule.toString(), g.actions])),
  };
}

// Builds the Mongo filter for a category/module/subModule LIST query, based on role:
//  - ADMIN: only the content they personally created — each Admin owns an isolated tree,
//    they don't see what other Admins have built.
//  - USER: only what's been explicitly granted to them via Permission, by whichever Admin
//    created them.
//  - SUPER_ADMIN: content is entirely out of their scope — always empty.
// `idsField` is one of "categoryIds" | "moduleIds" | "subModuleIds", matching the shape
// returned by getAccessibleScope.
export async function getContentFilter(user, idsField) {
  if (user.role === ROLES.ADMIN) {
    return { createdBy: user._id };
  }
  if (user.role === ROLES.USER) {
    const scope = await getAccessibleScope(user);
    return { _id: { $in: scope[idsField] } };
  }
  return { _id: { $in: [] } }; // SUPER_ADMIN
}

// Throws a 403 unless `user` may view/act on this specific category/module/subModule
// document. Same three-way role split as getContentFilter, for single-document lookups
// (GET by id, and as a defense-in-depth check before mutating) rather than list queries.
export async function assertContentAccess(user, doc, idsField) {
  if (user.role === ROLES.ADMIN) {
    if (!doc.createdBy || !doc.createdBy.equals(user._id)) {
      throw new ApiError(403, "You do not have access to this resource");
    }
    return;
  }
  if (user.role === ROLES.USER) {
    const scope = await getAccessibleScope(user);
    if (!scope[idsField].includes(doc._id.toString())) {
      throw new ApiError(403, "You do not have access to this resource");
    }
    return;
  }
  throw new ApiError(403, "You do not have access to this resource"); // SUPER_ADMIN
}
