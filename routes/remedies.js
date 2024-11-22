import express from "express";
import remediesController from "../controllers/remedies.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/remedies", verifyUser, remediesController.getAllRemedies);
router.get("/remedies/:id", verifyUser, remediesController.getRemedies);
router.post("/remedies", verifyUser, remediesController.postRemedies);
router.patch("/remedies/:id", verifyUser, remediesController.updateRemedies);
router.delete("/remedies/:id", verifyUser, remediesController.deleteRemedies);

export default router;
