import React, { useState } from "react";
import Feed from "./Feed";
import { Outlet } from "react-router-dom";
import RightSidebar from "./RightSidebar";
import useGetAllPost from "@/hooks/useGetAllPost";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { Users, X } from "lucide-react";
import { Button } from "./ui/button";

const Home = () => {
  useGetAllPost();
  useGetSuggestedUsers();
  const [showSuggestedUsers, setShowSuggestedUsers] = useState(false);

  return (
    <div className="flex relative">
      {/* Mobile Suggested Users Button - Top Right */}
      <button
        onClick={() => setShowSuggestedUsers(true)}
        className="lg:hidden fixed top-4 right-4 z-40 bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50"
      >
        <Users className="h-5 w-5 text-gray-700" />
      </button>

      {/* Feed Section */}
      <div className="flex-grow">
        <Feed />
        <Outlet />
      </div>

      {/* Desktop Right Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <RightSidebar />
      </div>

      {/* Mobile Suggested Users Overlay */}
      {showSuggestedUsers && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setShowSuggestedUsers(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Suggested Users</h2>
              <button
                onClick={() => setShowSuggestedUsers(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <RightSidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
