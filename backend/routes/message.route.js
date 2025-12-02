
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { getMessage, sendMessage, saveCallHistory, markMessagesAsSeen, sendFileMessage, downloadFile, sendVoiceMessage, downloadVoice, pinMessage, unpinMessage } from "../controllers/message.controller.js";

const router = express.Router();

// Voice message routes
router.route("/send-voice/:id").post(isAuthenticated, upload.single("voice"), sendVoiceMessage);
router.route("/voice/:fileName").get(isAuthenticated, downloadVoice);

router.route("/send/:id").post(isAuthenticated, sendMessage);
router.route("/send-file/:id").post(isAuthenticated, upload.single("file"), sendFileMessage);
router.route("/file/:fileName").get(isAuthenticated, downloadFile);
router.route("/all/:id").get(isAuthenticated, getMessage);
router.route("/call-history").post(isAuthenticated, saveCallHistory);
router.route("/mark-seen").post(isAuthenticated, markMessagesAsSeen);
router.route("/pin").post(isAuthenticated, pinMessage);
router.route("/unpin").post(isAuthenticated, unpinMessage);

export default router;
