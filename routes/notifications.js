import express from "express";
import notificationsController from "../controllers/notifications.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/notification",verifyUser, notificationsController.getNotifications);
router.post("/notification",verifyUser, notificationsController.postNotification);
router.patch("/notification/:id",verifyUser, notificationsController.updateNotification);
router.delete("/notification/:id",verifyUser, notificationsController.deleteNotification);

export default router;
