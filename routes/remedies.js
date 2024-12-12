import express from "express";
import remediesController from "../controllers/remedies.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/remedies", verifyUser, remediesController.getAllRemedies);
router.get("/remedies/:id", verifyUser, remediesController.getRemedies);
router.post("/remedies", verifyUser, remediesController.postRemedies);
router.get("/remedies/category/:id", verifyUser, remediesController.getRemediesByCategoryId);
router.get("/trending/remedies", verifyUser, remediesController.getTrendingRemidies);
router.post("/remedies/like/:id", verifyUser, remediesController.likeRemedies);
router.post("/remedies/dislike/:id", verifyUser, remediesController.dislikeRemedies);
router.post("/remedies/bookmark/:id", verifyUser, remediesController.bookmarkRemedies);
router.post("/remedies/bookmark", verifyUser, remediesController.getBookmarkRemedies);
router.patch("/remedies/:id", verifyUser, remediesController.updateRemedies);
router.delete("/remedies/:id", verifyUser, remediesController.deleteRemedies);

export default router;
