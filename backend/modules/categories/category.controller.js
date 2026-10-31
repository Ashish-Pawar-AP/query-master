import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Category } from "../categories/category.model.js";
import { Module } from "../modules/module.model.js";
import { SubModule } from "../submodules/subModule.model.js";
import { getAccessibleScope, getContentFilter, assertContentAccess } from "../../utils/accessScope.js";
import { ROLES } from "../users/user.model.js";

export const listCategories = asyncHandler(async (req, res) => {
  const filter = await getContentFilter(req.user, "categoryIds");
  if (req.query.search) {
    filter.name = { $regex: req.query.search, $options: "i" };
  }
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  await assertContentAccess(req.user, category, "categoryIds");
  res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Category name is required");

  // Uniqueness is scoped per-Admin, not global — each Admin owns an isolated tree, so
  // two different Admins can both have an "Employee" category without colliding.
  const exists = await Category.findOne({ name, createdBy: req.user._id });
  if (exists) throw new ApiError(409, "A category with this name already exists");

  const category = await Category.create({ name, description, createdBy: req.user._id });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  await assertContentAccess(req.user, category, "categoryIds");

  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (status) category.status = status;
  category.updatedBy = req.user._id;
  await category.save();
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  await assertContentAccess(req.user, category, "categoryIds");

  const moduleCount = await Module.countDocuments({ category: category._id });
  if (moduleCount > 0) {
    throw new ApiError(409, "Cannot delete a category that still has modules. Archive it instead.");
  }

  await category.deleteOne();
  res.json({ success: true, message: "Category deleted" });
});

// Returns full Category -> Module -> SubModule tree, scoped to what the user can see:
// an Admin's own created tree, or a User's granted slice of their creating Admin's tree.
// Super Admin never reaches this (route is Admin+User only), but stays empty if it did.
// Powers the dynamic sidebar (PRD Feature 7).
export const getSidebarTree = asyncHandler(async (req, res) => {
  let scope = null; // only populated (and only meaningful) for USER
  let baseFilter;

  if (req.user.role === ROLES.ADMIN) {
    baseFilter = { createdBy: req.user._id };
  } else if (req.user.role === ROLES.USER) {
    scope = await getAccessibleScope(req.user);
    baseFilter = {};
  } else {
    baseFilter = { _id: { $in: [] } }; // SUPER_ADMIN — always empty
  }

  const categoryFilter = { ...baseFilter, status: "ACTIVE", ...(scope ? { _id: { $in: scope.categoryIds } } : {}) };
  const moduleFilter = { ...baseFilter, status: "ACTIVE", ...(scope ? { _id: { $in: scope.moduleIds } } : {}) };
  const subModuleFilter = { ...baseFilter, status: "ACTIVE", ...(scope ? { _id: { $in: scope.subModuleIds } } : {}) };

  const [categories, modules, subModules] = await Promise.all([
    Category.find(categoryFilter).sort({ name: 1 }).lean(),
    Module.find(moduleFilter).sort({ name: 1 }).lean(),
    SubModule.find(subModuleFilter).select("name module category status queryType").sort({ name: 1 }).lean(),
  ]);

  const tree = categories.map((cat) => ({
    ...cat,
    modules: modules
      .filter((m) => m.category.toString() === cat._id.toString())
      .map((mod) => ({
        ...mod,
        subModules: subModules
          .filter((sm) => sm.module.toString() === mod._id.toString())
          .map((sm) => ({
            ...sm,
            actions: scope ? scope.grantsBySubModule[sm._id.toString()] || [] : ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"],
          })),
      })),
  }));

  res.json({ success: true, data: tree });
});
