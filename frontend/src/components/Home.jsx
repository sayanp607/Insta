import React, { useState } from "react";
import Feed from "./Feed";
import { Outlet } from "react-router-dom";
import RightSidebar from "./RightSidebar";
import useGetAllPost from "@/hooks/useGetAllPost";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { Users, X } from "lucide-react";
import { Button } from "./ui/button";
import StoryBar from "./stories/StoryBar";
import useGetStories from "@/hooks/useGetStories";

const Home = () => {
  useGetAllPost();
  useGetSuggestedUsers();
  useGetStories();
  const [showSuggestedUsers, setShowSuggestedUsers] = useState(false);

  return (
    <div className="flex relative bg-black min-h-screen text-white">
      {/* Mobile Suggested Users Button - Top Right */}
      <button
        onClick={() => setShowSuggestedUsers(true)}
        className="lg:hidden fixed top-4 right-4 z-40 bg-[#121212] p-3 rounded-full shadow-2xl border border-[#262626] hover:bg-[#1a1a1a] transition-all"
      >
        <Users className="h-5 w-5 text-gray-300" />
      </button>

      {/* Feed Section */}
      <div className="flex-grow flex justify-center lg:pr-[300px]">
        <div className="w-full max-w-2xl px-4 py-4 md:py-8">
          <StoryBar />
          <div className="mt-4">
            <Feed />
          </div>
          <Outlet />
        </div>
      </div>

      {/* Desktop Right Sidebar - Hidden on mobile */}
      <div className="hidden lg:block fixed right-0 top-0 h-screen w-[300px] border-l border-[#262626] bg-black p-8">
        <RightSidebar />
      </div>

      {/* Mobile Suggested Users Overlay */}
      {showSuggestedUsers && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSuggestedUsers(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-[#121212] shadow-2xl overflow-y-auto border-l border-[#262626]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#121212] border-b border-[#262626] p-6 flex items-center justify-between">
              <h2 className="font-bold text-xl insta-gradient-text">Suggested</h2>
              <button
                onClick={() => setShowSuggestedUsers(false)}
                className="p-2 hover:bg-[#262626] rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <RightSidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
