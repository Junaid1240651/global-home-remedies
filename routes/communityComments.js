import express from "express";
import communityCommentsController from "../controllers/communityComments.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/community_comments/:id",verifyUser, communityCommentsController.getCommunityComments);
router.post("/community_comments",verifyUser, communityCommentsController.postCommunityComments);
router.patch("/community_comments/:id",verifyUser, communityCommentsController.updateCommunityComments);
router.delete("/community_comments/:id",verifyUser, communityCommentsController.deleteCommunityComments);
router.post("/community_comments/like/:id", verifyUser, communityCommentsController.likeCommunityComment);
router.post("/community_comments/dislike/:id", verifyUser, communityCommentsController.dislikeCommunityComment);
export default router;
