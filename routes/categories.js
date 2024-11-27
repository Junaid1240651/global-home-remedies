import express from "express";
import categoriesController from "../controllers/categories.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/categories", verifyUser, categoriesController.getAllCategories);
router.post("/categories", verifyUser, categoriesController.postCategories);
router.patch("/categories/:id",verifyUser, categoriesController.updateCategories);
router.delete("/categories/:id",verifyUser, categoriesController.deleteCategories);

export default router;
