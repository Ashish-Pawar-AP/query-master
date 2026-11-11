import { Router } from "express";
import { listUserPermissions, setUserPermissions } from "./permission.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../users/user.model.js";

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get("/:userId", listUserPermissions);
router.put("/:userId", setUserPermissions);

export default router;
