import {
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  TrendingUp,
  Video,
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
  const { likeNotification, commentNotification, allNotifications, isFetched, unreadCount: serverUnreadCount } =
    useSelector((store) => store.realTimeNotification);
  const { unreadMessages } = useSelector((store) => store.chat);

  // Safety check for undefined notifications
  const likes = likeNotification || [];
  const comments = commentNotification || [];
  const notifications = allNotifications || [];

  // Use the synchronized count from Redis/Redux
  const unreadCount = isFetched ? serverUnreadCount : 0;

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
      dispatch(markNotificationsAsRead());
      navigate("/notifications");
    } else if (textType === "Explore") {
      navigate("/explore");
    } else if (textType === "Reels") {
      navigate("/reels");
    }
  };
  const sidebarItems = [
    { icon: <Home />, text: "Home" },
    { icon: <Search />, text: "Search" },
    { icon: <TrendingUp />, text: "Explore" },
    { icon: <Video />, text: "Reels" },
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
    <div className="fixed top-0 z-10 left-0 px-4 w-[18%] h-screen hidden lg:block bg-black">
      <div className="absolute right-0 top-0 h-full">
        <div className="creative-v-separator" />
      </div>
      <div className="flex flex-col h-full">
        <div className="my-10 pl-4">
          <h1 className="text-2xl font-bold italic insta-gradient-text tracking-tighter">
            Instagram
          </h1>
        </div>
        <div className="flex-1">
          {sidebarItems.map((item, index) => {
            return (
              <div
                onClick={() => sidebarHandler(item.text)}
                key={index}
                className="flex items-center gap-4 hover:bg-[#1a1a1a] cursor-pointer rounded-xl p-3 my-2 transition-all duration-200 group"
              >
                <div className="relative group-hover:scale-110 transition-transform duration-200">
                  {item.icon}
                  {item.text === "Notifications" && unreadCount > 0 && (
                    <div className="bg-[#FF3040] text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center absolute -top-1 -right-1 border border-black shadow-sm">
                      {unreadCount}
                    </div>
                  )}
                  {item.text === "Messages" && unreadMessageCount > 0 && (
                    <div className="bg-[#FF3040] text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center absolute -top-1 -right-1 border border-black shadow-sm">
                      {unreadMessageCount}
                    </div>
                  )}
                </div>
                <span className="text-[15px] font-medium transition-colors duration-200 group-hover:text-white text-gray-300">
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <CreatePost open={open} setOpen={setOpen} />

      <CreatePost open={open} setOpen={setOpen} />
    </div>
  );
};

export default LeftSidebar;
