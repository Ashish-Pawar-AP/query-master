import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { SubModule } from "./subModule.model.js";
import { Module } from "../modules/module.model.js";
import { Favorite } from "../favorites/favorite.model.js";
import { Note } from "../notes/note.model.js";
import { getContentFilter, assertContentAccess } from "../../utils/accessScope.js";
import { generateSql } from "../../utils/sqlGenerator.js";
import { trackRecentlyViewed } from "../../utils/trackRecentlyViewed.js";

// A Sub Module IS a query (see subModule.model.js) — this controller covers both the
// navigation-tree CRUD (create/rename/archive a sub module) and the query concerns that
// used to live in a separate queries feature (browsing, search, generating SQL).
//
// Each Admin owns an isolated Category/Module/Query tree — they only see and manage what
// they personally created, never another Admin's content (see utils/accessScope.js). A
// User only sees what's been explicitly granted to them via Permission, which an Admin
// can only grant on their own submodules to Users they themselves created.
//
// No usage counters (copy/favorite/view counts) and no per-action audit log are kept here
// — those wrote a new value or a new document on every single read action, which grows
// without bound as user and admin activity increases. Favoriting itself is kept (it's a
// small, necessary join record — one row per user per favorited query — not a counter),
// and each user's own capped "recently viewed" list (see trackRecentlyViewed).

export const listSubModules = asyncHandler(async (req, res) => {
  const filter = await getContentFilter(req.user, "subModuleIds");

  if (req.query.module) filter.module = req.query.module;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.queryType) filter.queryType = req.query.queryType;
  if (req.query.tag) filter.tags = req.query.tag;

  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const [items, total] = await Promise.all([
    SubModule.find(filter)
      .select("-sqlTemplate")
      .populate("category", "name")
      .populate("module", "name")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SubModule.countDocuments(filter),
  ]);

  let favoriteIds = new Set();
  if (items.length > 0) {
    const favorites = await Favorite.find({ user: req.user._id, subModule: { $in: items.map((i) => i._id) } })
      .select("subModule")
      .lean();
    favoriteIds = new Set(favorites.map((f) => f.subModule.toString()));
  }
  const withFavorite = items.map((i) => ({ ...i, isFavorite: favoriteIds.has(i._id.toString()) }));

  res.json({ success: true, data: withFavorite, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getSubModule = asyncHandler(async (req, res) => {
  const subModule = await SubModule.findById(req.params.id).populate("category", "name").populate("module", "name").lean();
  if (!subModule) throw new ApiError(404, "Sub module not found");
  await assertContentAccess(req.user, subModule, "subModuleIds");

  const isFavorite = !!(await Favorite.exists({ user: req.user._id, subModule: subModule._id }));

  // Viewing is the highest-frequency action in the app — track it on the user's own
  // bounded recently-viewed list rather than writing anywhere unbounded.
  await trackRecentlyViewed(req.user._id, subModule._id);

  res.json({ success: true, data: { ...subModule, isFavorite } });
});

export const createSubModule = asyncHandler(async (req, res) => {
  const payload = req.body;
  if (!payload.name || !payload.category || !payload.module || !payload.queryType || !payload.sqlTemplate) {
    throw new ApiError(400, "Name, category, module, query type and SQL template are required");
  }

  // The parent module must belong to this Admin — otherwise Admin A could create a query
  // inside Admin B's module just by knowing/guessing its id.
  const moduleDoc = await Module.findById(payload.module);
  if (!moduleDoc) throw new ApiError(404, "Module not found");
  await assertContentAccess(req.user, moduleDoc, "moduleIds");

  const exists = await SubModule.findOne({ name: payload.name, module: payload.module });
  if (exists) throw new ApiError(409, "A sub module with this name already exists in this module");

  const subModule = await SubModule.create({ ...payload, createdBy: req.user._id });
  res.status(201).json({ success: true, data: subModule });
});

export const updateSubModule = asyncHandler(async (req, res) => {
  const subModule = await SubModule.findById(req.params.id);
  if (!subModule) throw new ApiError(404, "Sub module not found");
  await assertContentAccess(req.user, subModule, "subModuleIds");

  const editable = [
    "name",
    "description",
    "status",
    "queryType",
    "tableName",
    "sqlTemplate",
    "placeholders",
    "updatableFields",
    "whereFields",
    "whereLogic",
    "tags",
    "notesEnabled",
  ];
  for (const field of editable) {
    if (req.body[field] !== undefined) subModule[field] = req.body[field];
  }
  subModule.version += 1;
  subModule.updatedBy = req.user._id;
  await subModule.save();

  res.json({ success: true, data: subModule });
});

export const deleteSubModule = asyncHandler(async (req, res) => {
  const subModule = await SubModule.findById(req.params.id);
  if (!subModule) throw new ApiError(404, "Sub module not found");
  await assertContentAccess(req.user, subModule, "subModuleIds");

  await subModule.deleteOne();
  await Favorite.deleteMany({ subModule: subModule._id });
  await Note.deleteMany({ subModule: subModule._id });
  res.json({ success: true, message: "Sub module deleted" });
});

// Generates SQL from the sub module's query definition + the values/selections the user
// supplied. Used both for a live preview and for the "Copy Query" action — there's nothing
// left to distinguish them now that copies aren't counted, so it's one endpoint.
export const generateSubModuleSql = asyncHandler(async (req, res) => {
  const subModule = await SubModule.findById(req.params.id);
  if (!subModule) throw new ApiError(404, "Sub module not found");
  await assertContentAccess(req.user, subModule, "subModuleIds");

  const sql = generateSql(subModule, req.body);
  res.json({ success: true, data: { sql } });
});
