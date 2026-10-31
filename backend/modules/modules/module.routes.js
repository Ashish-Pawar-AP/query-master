import { Router } from "express";
import { listModules, createModule, updateModule, deleteModule } from "./module.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../users/user.model.js";

const router = Router();

router.use(requireAuth);

router.get("/", listModules);
router.post("/", requireRole(ROLES.ADMIN), createModule);
router.patch("/:id", requireRole(ROLES.ADMIN), updateModule);
router.delete("/:id", requireRole(ROLES.ADMIN), deleteModule);

export default router;
