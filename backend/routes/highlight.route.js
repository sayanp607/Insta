import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { createHighlight, getUserHighlights, addStoryToExistingHighlight } from "../controllers/highlight.controller.js";

const router = express.Router();

router.route("/create").post(isAuthenticated, createHighlight);
router.route("/user/:userId").get(getUserHighlights);
router.route("/add-story").post(isAuthenticated, addStoryToExistingHighlight);

export default router;
