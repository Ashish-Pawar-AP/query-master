import { Router } from "express";
import { listFavorites, addFavorite, removeFavorite } from "./favorite.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listFavorites);
router.post("/:subModuleId", addFavorite);
router.delete("/:subModuleId", removeFavorite);

export default router;
