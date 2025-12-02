import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/main";
import { setAuthUser } from "@/redux/authSlice";

const SuggestedUsers = () => {
  const { suggestedUsers, user: loggedInUser } = useSelector(
    (store) => store.auth
  );
  const dispatch = useDispatch();

  const followOrUnfollowHandler = async (userId) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/user/followorunfollow/${userId}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        // Check current state before update
        const isCurrentlyFollowing = loggedInUser?.following?.some(
          (id) => String(id) === String(userId)
        );

        // Update logged-in user's following array
        const updatedUser = {
          ...loggedInUser,
          following: isCurrentlyFollowing
            ? loggedInUser.following.filter(
                (id) => String(id) !== String(userId)
              )
            : [...loggedInUser.following, userId],
        };
        dispatch(setAuthUser(updatedUser));

        toast.success(res.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="my-10">
      <div className="flex items-center justify-between text-sm">
        <h1 className="font-semibold text-gray-600">Suggested for you</h1>
        <span className="font-medium cursor-pointer">See All</span>
      </div>
      {suggestedUsers.map((user) => {
        const isFollowing = loggedInUser?.following?.some(
          (id) => String(id) === String(user._id)
        );
        return (
          <div
            key={user._id}
            className="flex items-center justify-between my-5"
          >
            <div className="flex items-center gap-2">
              <Link to={`/profile/${user?._id}`}>
                <Avatar>
                  <AvatarImage src={user?.profilePicture} alt="post_image" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <h1 className="font-semibold text-sm">
                  <Link to={`/profile/${user?._id}`}>{user?.username}</Link>
                </h1>
                <span className="text-gray-600 text-sm">
                  {user?.bio || "Bio here..."}
                </span>
              </div>
            </div>
            <span
              onClick={() => followOrUnfollowHandler(user._id)}
              className="text-[#3BADF8] text-xs font-bold cursor-pointer hover:text-[#3495d6]"
            >
              {isFollowing ? "Following" : "Follow"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default SuggestedUsers;
