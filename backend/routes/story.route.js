import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { addNewStory, getAllStories, viewStory, likeOrUnlikeStory, getStoryViewers } from "../controllers/story.controller.js";

const router = express.Router();

router.route("/add").post(isAuthenticated, upload.single("media"), addNewStory);
router.route("/all").get(isAuthenticated, getAllStories);
router.route("/view/:id").post(isAuthenticated, viewStory);
router.route("/like/:id").post(isAuthenticated, likeOrUnlikeStory);
router.route("/viewers/:id").get(isAuthenticated, getStoryViewers);

export default router;
