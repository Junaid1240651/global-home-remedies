import express from "express";
import fileUploadController from "../controllers/fileUpload.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/upload", verifyUser, fileUploadController.fileUpload);

export default router;
