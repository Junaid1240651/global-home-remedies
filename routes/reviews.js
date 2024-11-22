import express from "express";
import reviewsController from "../controllers/reviews.js"; 
import verifyUser from "../middleware/verifyUser.js";

const router = express.Router();

router.get("/review/:id", verifyUser, reviewsController.getReviews);
router.post("/review", verifyUser, reviewsController.postReviews);
router.patch("/review/:id", verifyUser, reviewsController.updateReviews);
router.delete("/review/:id", verifyUser, reviewsController.deleteReviews);

export default router;
