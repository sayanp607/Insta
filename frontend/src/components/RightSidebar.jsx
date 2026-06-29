import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SuggestedUsers from "./SuggestedUsers";

const RightSidebar = () => {
  const { user } = useSelector((store) => store.auth);
  return (
    <div className="w-full my-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to={`/profile/${user?._id}`}>
            <Avatar className="w-12 h-12 border-2 border-gray-300 hover:scale-105 transition-transform duration-200">
              <AvatarImage src={user?.profilePicture} alt="post_image" />
              <AvatarFallback className="bg-[#F1E8DF]">CN</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <h1 className="font-bold text-sm text-[#1A1A1A] hover:text-gray-600 transition-colors">
              <Link to={`/profile/${user?._id}`}>{user?.username}</Link>
            </h1>
            <span className="text-gray-600 text-xs line-clamp-1">
              {user?.bio || "Social Media Enthusiast"}
            </span>
          </div>
        </div>
        <button className="text-[#0095F6] text-xs font-bold hover:text-[#1A1A1A] transition-colors">
          Switch
        </button>
      </div>
      <SuggestedUsers />
    </div>
  );
};

export default RightSidebar;
