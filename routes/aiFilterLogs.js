import express from "express";
import aiFilterLogsController from "../controllers/aiFilterLogs.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/ai-filter-logs", verifyUser, aiFilterLogsController.getAllAiFilterLogs);
router.post("/ai-filter-logs", verifyUser, aiFilterLogsController.postAiFilterLog);
router.patch("/ai-filter-logs/:id",verifyUser, aiFilterLogsController.updateAiFilterLog);
router.delete("/ai-filter-logs/:id",verifyUser, aiFilterLogsController.deleteAiFilterLog);

export default router;
