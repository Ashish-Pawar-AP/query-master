import { Router } from "express";
import { listUsers, getUser, createUser, updateUser, deleteUser } from "./user.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../users/user.model.js";

const router = Router();

router.use(requireAuth, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
