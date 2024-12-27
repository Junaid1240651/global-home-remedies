import express from "express";
import communityPostsController from "../controllers/communityPosts.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/community_posts",verifyUser, communityPostsController.getAllCommunityPosts);
router.get("/community_posts/:id",verifyUser, communityPostsController.getCommunityPosts);
router.post("/community_posts",verifyUser, communityPostsController.postCommunityPosts);
router.patch("/community_posts/:id",verifyUser, communityPostsController.updateCommunityPosts);
router.delete("/community_posts/:id",verifyUser, communityPostsController.deleteCommunityPosts);
router.post("/community_posts/like/:id", verifyUser, communityPostsController.communityPostLike);
router.post("/community_posts/dislike/:id", verifyUser, communityPostsController.communityPostDislike);
export default router;
