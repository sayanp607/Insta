import {
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import CreatePost from "./CreatePost";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { markNotificationsAsRead } from "@/redux/rtnSlice";
import { clearUnreadMessages, setMessages } from "@/redux/chatSlice";

import { FaRegCircleUser } from "react-icons/fa6";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { API_BASE_URL } from "@/main";
const LeftSidebar = () => {
  const navigate = useNavigate();
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

  // Count unread messages (number of conversations with unread messages)
  const unreadMessageCount = Object.keys(unreadMessages || {}).length;

  // Debug logging
  console.log("Chat unread state:", {
    unreadMessages: JSON.stringify(unreadMessages),
    unreadMessageCount,
  });
  console.log("Notification counts:", {
    likes: likes.length,
    comments: comments.length,
    allNotifications: notifications.length,
    unreadCount,
  });

  console.log("All notifications data:", notifications);
  console.log("Redux state:", {
    likeNotification,
    commentNotification,
    allNotifications,
  });
  const logoutHandler = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/user/logout`, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        dispatch(setMessages([])); // Clear chat messages
        dispatch(clearUnreadMessages()); // Clear unread message counts
        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const sidebarHandler = (textType) => {
    if (textType === "Logout") {
      const confirmmsg = window.confirm("Are you sure to logout your profile?");
      if (confirmmsg) {
        logoutHandler();
      }
    } else if (textType === "Create") {
      setOpen(true);
    } else if (textType === "Profile") {
      navigate(`/profile/${user?._id}`);
    } else if (textType === "Home") {
      navigate(`/`);
    } else if (textType === "Messages") {
      navigate(`/chat`);
    } else if (textType === "Notifications") {
      setNotificationOpen(true);
      if (unreadCount > 0) {
        dispatch(markNotificationsAsRead());
      }
    }
  };
  const sidebarItems = [
    { icon: <Home />, text: "Home" },
    { icon: <Search />, text: "Search" },
    { icon: <TrendingUp />, text: "Explore" },
    { icon: <MessageCircle />, text: "Messages" },
    { icon: <Heart />, text: "Notifications" },
    { icon: <PlusSquare />, text: "Create" },
    {
      icon: (
        <Avatar className="w-6 h-6">
          <AvatarImage src={user?.profilePicture} alt="@shadcn" />
          <AvatarFallback>
            <FaRegCircleUser />
          </AvatarFallback>
        </Avatar>
      ),
      text: "Profile",
    },
    { icon: <LogOut />, text: "Logout" },
  ];
  return (
    <div className="fixed top-0 z-10 left-4 px-6 border-r border-gray-390 w-[15%] h-screen hidden lg:block">
      <div className="flex flex-col">
        <h1 className="my-8 pl-4 font-bold text-xl">LOGO</h1>
        <div>
          {sidebarItems.map((item, index) => {
            return (
              <div
                onClick={() => sidebarHandler(item.text)}
                key={index}
                className="flex items-center gap-3 relative hover:bg-gray-100 cursor-pointer rounded-lg p-3 my-3"
              >
                {item.icon}
                <span>{item.text}</span>
                {item.text === "Notifications" && unreadCount > 0 && (
                  <Button
                    size="icon"
                    className="rounded-full h-5 w-5 bg-red-600 hover:bg-red-600 absolute bottom-6 left-6"
                  >
                    {unreadCount}
                  </Button>
                )}
                {item.text === "Messages" && unreadMessageCount > 0 && (
                  <Button
                    size="icon"
                    className="rounded-full h-5 w-5 bg-red-600 hover:bg-red-600 absolute bottom-6 left-6"
                  >
                    {unreadMessageCount}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <CreatePost open={open} setOpen={setOpen} />

      {/* Notification Dialog */}
      <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification, index) => (
                  <div
                    key={`${notification.userId}-${notification.type}-${index}`}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      notification.read ? "bg-gray-50" : "bg-blue-50"
                    }`}
                  >
                    <Avatar>
                      <AvatarImage
                        src={notification.userDetails?.profilePicture}
                      />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-bold">
                          {notification.userDetails?.username}
                        </span>{" "}
                        {notification.type === "like"
                          ? "liked"
                          : "commented on"}{" "}
                        your post
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeftSidebar;
