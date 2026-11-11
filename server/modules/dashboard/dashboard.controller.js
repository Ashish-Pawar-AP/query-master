import { asyncHandler } from "../../utils/asyncHandler.js";
import { User, ROLES } from "../users/user.model.js";
import { Category } from "../categories/category.model.js";
import { Module } from "../modules/module.model.js";
import { SubModule } from "../submodules/subModule.model.js";

// No usage counters (copy/favorite/view counts) and no activity log exist to draw from —
// both were removed because they grew without bound as user and admin activity increased.
// These widgets stick to counts of existing records (cheap, bounded by how much structure
// admins have actually created) plus each user's own small capped recently-viewed list.
//
// Super Admin's dashboard is deliberately scoped to Admins + Users only — no category,
// module, or query counts, and no "recently added queries" feed. With many Admins each
// creating their own Categories/Modules/Queries, that content isn't Super Admin's to
// oversee; Admin owns it. See middleware/rbac + accessScope for the matching API-level
// restriction.

async function superAdminWidgets() {
  const [totalUsers, totalAdmins, activeUsers] = await Promise.all([
    User.countDocuments({ role: ROLES.USER }),
    User.countDocuments({ role: ROLES.ADMIN }),
    User.countDocuments({ status: "ACTIVE" }),
  ]);

  const growthAgg = await User.aggregate([
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 12 },
  ]);

  return {
    widgets: { totalUsers, totalAdmins, activeUsers },
    userGrowth: growthAgg.map((g) => ({ month: g._id, count: g.count })),
  };
}

async function adminWidgets(adminId) {
  const [usersCreated, categories, modules, queriesCreated] = await Promise.all([
    User.countDocuments({ createdBy: adminId, role: ROLES.USER }),
    Category.countDocuments({ createdBy: adminId }),
    Module.countDocuments({ createdBy: adminId }),
    SubModule.countDocuments({ createdBy: adminId }),
  ]);

  return {
    widgets: { usersCreated, categories, modules, queriesCreated },
  };
}

async function userWidgets(userId) {
  const userDoc = await User.findById(userId).populate("recentlyViewed", "name queryType").lean();

  return {
    recentlyViewed: (userDoc?.recentlyViewed || []).slice(0, 5),
  };
}

export const getDashboard = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === ROLES.SUPER_ADMIN) {
    data = await superAdminWidgets();
  } else if (req.user.role === ROLES.ADMIN) {
    data = await adminWidgets(req.user._id);
  } else {
    data = await userWidgets(req.user._id);
  }
  res.json({ success: true, data: { role: req.user.role, ...data } });
});
