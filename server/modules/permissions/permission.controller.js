import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Permission } from "../permissions/permission.model.js";
import { SubModule } from "../submodules/subModule.model.js";
import { User } from "../users/user.model.js";

// These routes are Admin-only (see permission.routes.js). An Admin may only grant access
// to Users they themselves created, and only on SubModules they themselves created —
// otherwise Admin A could reach into Admin B's tree or hand out access to Admin B's users.
async function assertOwnsTargetUser(admin, userId) {
  const targetUser = await User.findById(userId).select("createdBy").lean();
  if (!targetUser || !targetUser.createdBy || targetUser.createdBy.toString() !== admin._id.toString()) {
    throw new ApiError(403, "You do not have access to this user");
  }
}

export const listUserPermissions = asyncHandler(async (req, res) => {
  await assertOwnsTargetUser(req.user, req.params.userId);

  const permissions = await Permission.find({ user: req.params.userId })
    .populate("category", "name")
    .populate("module", "name")
    .populate("subModule", "name")
    .lean();
  res.json({ success: true, data: permissions });
});

// Replaces the full permission set for a user with the provided list of
// { subModule, actions } grants. Simpler and less error-prone than incremental add/remove.
export const setUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { grants } = req.body; // [{ subModule, actions }]
  if (!Array.isArray(grants)) throw new ApiError(400, "grants must be an array");

  await assertOwnsTargetUser(req.user, userId);

  const subModuleIds = grants.map((g) => g.subModule);
  // Only SubModules this Admin actually created can be granted — anything else in the
  // request is silently dropped rather than erroring, same as an unrecognized id would be.
  const subModules = await SubModule.find({ _id: { $in: subModuleIds }, createdBy: req.user._id }).lean();
  const subModuleMap = Object.fromEntries(subModules.map((sm) => [sm._id.toString(), sm]));

  await Permission.deleteMany({ user: userId });

  const docs = grants
    .filter((g) => subModuleMap[g.subModule])
    .map((g) => ({
      user: userId,
      subModule: g.subModule,
      module: subModuleMap[g.subModule].module,
      category: subModuleMap[g.subModule].category,
      actions: g.actions && g.actions.length > 0 ? g.actions : ["VIEW"],
      grantedBy: req.user._id,
    }));

  const created = docs.length > 0 ? await Permission.insertMany(docs) : [];

  res.json({ success: true, data: created });
});
