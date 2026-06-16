import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import {
  addComment,
  addNewPost,
  bookmarkPost,
  deletePost,
  dislikePost,
  getAllPost,
  getCommentsOfPost,
  getUserPost,
  likePost,
  getExplorePost,
  generateAIContent,
  getReelsPost,
  likeComment,
  dislikeComment,
  addReply,
  translateComment,
  getSmartReplies,
} from "../controllers/post.controller.js";

const router = express.Router();

router
  .route("/addpost")
  .post(isAuthenticated, upload.single("image"), addNewPost);

router.route("/all").get(isAuthenticated, getAllPost);
router.route("/reels").get(isAuthenticated, getReelsPost);
router.route("/:id/comments").get(isAuthenticated, getCommentsOfPost);
router.route("/explore").get(isAuthenticated, getExplorePost);
router.route("/userpost/all").get(isAuthenticated, getUserPost);

router.route("/:id/like").get(isAuthenticated, likePost);
router.route("/:id/dislike").get(isAuthenticated, dislikePost);
router.route("/:id/comment").post(isAuthenticated, addComment);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/:id/bookmark").get(isAuthenticated, bookmarkPost);
router.route("/generate-ai-content").post(isAuthenticated, upload.single("image"), generateAIContent);

// Comment Interactions
router.route("/comment/:id/like").get(isAuthenticated, likeComment);
router.route("/comment/:id/dislike").get(isAuthenticated, dislikeComment);
router.route("/comment/:id/reply").post(isAuthenticated, addReply);
router.route("/comment/translate").post(isAuthenticated, translateComment);

// Gen AI
router.route("/smart-replies/:conversationUserId").get(isAuthenticated, getSmartReplies);

export default router;
