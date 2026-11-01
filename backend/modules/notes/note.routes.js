import { Router } from "express";
import { listNotes, createNote, updateNote, deleteNote } from "./note.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../users/user.model.js";

const router = Router();

// Super Admin has no content access, so no notes either.
router.use(requireAuth, requireRole(ROLES.ADMIN, ROLES.USER));

router.get("/", listNotes);
router.post("/", createNote);
router.patch("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;
