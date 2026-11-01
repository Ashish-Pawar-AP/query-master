import { Router } from "express";
import { getDashboard } from "./dashboard.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", getDashboard);

export default router;
