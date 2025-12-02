import { Home, Search, PlusSquare, MessageCircle, Heart } from "lucide-react";
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
  const { likeNotification, commentNotification, allNotifications } =
    useSelector((store) => store.realTimeNotification);
  const { unreadMessages } = useSelector((store) => store.chat);

  // Safety check for undefined notifications
  const likes = likeNotification || [];
  const comments = commentNotification || [];
  const notifications = allNotifications || [];

  // Count only unread notifications
  const unreadCount = likes.length + comments.length;

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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path, item.action)}
                className="relative flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon
                  className={`h-6 w-6 ${
                    active ? "text-black" : "text-gray-600"
                  }`}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Profile Avatar */}
          <button
            onClick={() => navigate(`/profile/${user?._id}`)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${
              isActive(`/profile/${user?._id}`) ? "ring-2 ring-black" : ""
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

      {/* Create Post Dialog */}
      <CreatePost open={open} setOpen={setOpen} />

      {/* Notifications Dialog */}
      <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No notifications yet
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={notification.userId?.profilePicture}
                      alt="avatar"
                    />
                    <AvatarFallback>
                      <FaRegCircleUser />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {notification.userId?.username}
                      </span>{" "}
                      {notification.type === "like"
                        ? "liked your post"
                        : "commented on your post"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileBottomNav;
