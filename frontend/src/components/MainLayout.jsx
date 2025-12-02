import React from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import MobileBottomNav from "./MobileBottomNav";

const MainLayout = () => {
  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>

      {/* Main Content - Adjusted padding for mobile/desktop */}
      <div className="lg:ml-[15%] pb-20 lg:pb-0">
        <Outlet />
      </div>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
