import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getSidebarTree,
} from "./category.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../users/user.model.js";

const router = Router();

router.use(requireAuth);

router.get("/sidebar", getSidebarTree);
router.get("/", listCategories);
router.get("/:id", getCategory);
router.post("/", requireRole(ROLES.ADMIN), createCategory);
router.patch("/:id", requireRole(ROLES.ADMIN), updateCategory);
router.delete("/:id", requireRole(ROLES.ADMIN), deleteCategory);

export default router;
