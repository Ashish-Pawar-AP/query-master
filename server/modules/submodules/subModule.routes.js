import { Router } from "express";
import {
  listSubModules,
  getSubModule,
  createSubModule,
  updateSubModule,
  deleteSubModule,
  generateSubModuleSql,
} from "./subModule.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../users/user.model.js";

const router = Router();

router.use(requireAuth);

router.get("/", listSubModules);
router.get("/:id", getSubModule);
router.post("/", requireRole(ROLES.ADMIN), createSubModule);
router.patch("/:id", requireRole(ROLES.ADMIN), updateSubModule);
router.delete("/:id", requireRole(ROLES.ADMIN), deleteSubModule);
router.post("/:id/generate", generateSubModuleSql);

export default router;
