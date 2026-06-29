import { Home, Search, PlusSquare, MessageCircle, Heart, TrendingUp, Video } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { FaRegCircleUser } from "react-icons/fa6";
import CreatePost from "./CreatePost";
import { Button } from "./ui/button";
import { markNotificationsAsRead } from "@/redux/rtnSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { likeNotification, commentNotification, allNotifications, isFetched, unreadCount: serverUnreadCount } =
    useSelector((store) => store.realTimeNotification);
  const { unreadMessages } = useSelector((store) => store.chat);

  // Safety check for undefined notifications
  const likes = likeNotification || [];
  const comments = commentNotification || [];
  const notifications = allNotifications || [];

  // Use the synchronized count from Redis/Redux
  const unreadCount = isFetched ? serverUnreadCount : 0;

  // Count unread messages
  const unreadMessageCount = Object.keys(unreadMessages || {}).length;

  const handleNavigation = (path, action) => {
    if (action === "Create") {
      setOpen(true);
    } else if (action === "Notifications") {
      setNotificationOpen(true);
      if (unreadCount > 0) {
        dispatch(markNotificationsAsRead());
      }
    } else {
      navigate(path);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: TrendingUp, path: "/explore", label: "Explore" },
    { icon: Video, path: "/reels", label: "Reels" },
    { icon: Search, path: "/search", label: "Search" },
    { icon: PlusSquare, action: "Create", label: "Create" },
    {
      icon: MessageCircle,
      path: "/chat",
      label: "Messages",
      badge: unreadMessageCount,
    },
    {
      icon: Heart,
      action: "Notifications",
      label: "Notifications",
      badge: unreadCount,
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-[#FAF6F0] border-t border-gray-300 z-50 lg:hidden">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path, item.action)}
                className="relative flex flex-col items-center justify-center p-2 rounded-lg hover:bg-[#FFFFFF] transition-colors"
              >
                <Icon
                  className={`h-6 w-6 ${
                    active ? "text-[#F094A6] filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "text-gray-600"
                  }`}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-[#1A1A1A] text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Profile Avatar */}
          <button
            onClick={() => navigate(`/profile/${user?._id}`)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-lg hover:bg-[#FFFFFF] transition-colors ${
              isActive(`/profile/${user?._id}`) ? "ring-2 ring-[#F094A6] ring-offset-2 ring-offset-[#FAF6F0]" : ""
            }`}
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={user?.profilePicture} alt="profile" />
              <AvatarFallback>
                <FaRegCircleUser />
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <CreatePost open={open} setOpen={setOpen} />
    </>
  );
};

export default MobileBottomNav;
