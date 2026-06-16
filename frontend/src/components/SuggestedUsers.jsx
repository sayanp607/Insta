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
    <div className="my-6">
      <div className="flex items-center justify-between text-sm mb-6">
        <h1 className="font-bold text-gray-500">Suggested for you</h1>
        <span className="font-bold cursor-pointer text-white hover:text-gray-400 transition-colors">See All</span>
      </div>
      {suggestedUsers.map((user) => {
        const isFollowing = loggedInUser?.following?.some(
          (id) => String(id) === String(user._id)
        );
        return (
          <div
            key={user._id}
            className="flex items-center justify-between my-4 transition-all duration-200 hover:bg-[#1a1a1a] p-2 rounded-xl -mx-2"
          >
            <div className="flex items-center gap-3">
              <Link to={`/profile/${user?._id}`}>
                <Avatar className="w-10 h-10 border border-[#262626]">
                  <AvatarImage src={user?.profilePicture} alt="post_image" />
                  <AvatarFallback className="bg-[#262626]">CN</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <h1 className="font-bold text-sm text-white hover:text-gray-400 transition-colors">
                  <Link to={`/profile/${user?._id}`}>{user?.username}</Link>
                </h1>
                <span className="text-gray-500 text-xs line-clamp-1">
                  {user?.bio || "Social Media Enthusiast"}
                </span>
              </div>
            </div>
            <button
              onClick={() => followOrUnfollowHandler(user._id)}
              className={`text-xs font-bold transition-all px-3 py-1 rounded-lg ${
                isFollowing 
                ? "bg-[#262626] text-white hover:bg-[#333]" 
                : "text-[#0095F6] hover:text-white"
              }`}
            >
              {isFollowing ? "Following" : (user?.isFollower ? "Follow Back" : "Follow")}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SuggestedUsers;
