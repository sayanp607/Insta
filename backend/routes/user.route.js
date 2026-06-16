import express from "express";
import {
  editProfile,
  followOrUnfollow,
  getProfile,
  getSuggestedUsers,
  login,
  logout,
  register,
  togglePrivacy,
  acceptFollowRequest,
  declineFollowRequest,
  getNotifications,
  markNotificationsAsRead
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/:id/profile").get(isAuthenticated, getProfile);
router
  .route("/profile/edit")
  .post(isAuthenticated, upload.single("profilePhoto"), editProfile);
router.route("/suggested").get(isAuthenticated, getSuggestedUsers);
router.route("/followorunfollow/:id").post(isAuthenticated, followOrUnfollow);
router.route("/toggle-privacy").post(isAuthenticated, togglePrivacy);
router.route("/follow-request/accept/:id").post(isAuthenticated, acceptFollowRequest);
router.route("/follow-request/decline/:id").post(isAuthenticated, declineFollowRequest);
router.route("/notifications").get(isAuthenticated, getNotifications);
router.route("/notifications/mark-as-read").post(isAuthenticated, markNotificationsAsRead);

export default router;
