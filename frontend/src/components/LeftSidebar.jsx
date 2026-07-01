import {
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  TrendingUp,
  Video,
  Loader2
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
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
    } else if (textType === "Search") {
      setIsSearchOpen(!isSearchOpen);
    } else if (textType === "Explore") {
      navigate("/explore");
    } else if (textType === "Reels") {
      navigate("/reels");
    }
  };
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/user/search?query=${query}`, {
        withCredentials: true
      });
      if (res.data.success) {
        setSearchResults(res.data.users);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
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
    <div className="fixed top-0 z-10 left-0 px-4 w-[18%] h-screen hidden lg:block bg-transparent border-r-2 border-gray-400/50 shadow-[2px_0_15px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col h-full">
        <div className="my-10 pl-4">
          <h1 className="text-4xl font-black italic insta-gradient-text tracking-tighter drop-shadow-sm">
            Bloom
          </h1>
        </div>
        <div className="flex-1">
          {sidebarItems.map((item, index) => {
            return (
              <div
                onClick={() => sidebarHandler(item.text)}
                key={index}
                className="flex items-center gap-4 hover:bg-pink-50 hover:translate-x-2 cursor-pointer rounded-xl p-3 my-2 transition-all duration-300 ease-out group shadow-sm hover:shadow-md border border-transparent hover:border-pink-200 bg-white/40 backdrop-blur-sm"
              >
                <div className="relative group-hover:scale-110 transition-transform duration-200">
                  {item.icon}
                  {item.text === "Notifications" && unreadCount > 0 && (
                    <div className="bg-[#FF3040] text-[#1A1A1A] text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center absolute -top-1 -right-1 border border-black shadow-sm">
                      {unreadCount}
                    </div>
                  )}
                  {item.text === "Messages" && unreadMessageCount > 0 && (
                    <div className="bg-[#FF3040] text-[#1A1A1A] text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center absolute -top-1 -right-1 border border-black shadow-sm">
                      {unreadMessageCount}
                    </div>
                  )}
                </div>
                <span className="text-[15px] font-medium transition-colors duration-200 group-hover:text-[#1A1A1A] text-gray-800">
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <CreatePost open={open} setOpen={setOpen} />

      <CreatePost open={open} setOpen={setOpen} />

      {/* Search Drawer */}
      <div 
        className={`fixed top-0 left-[18%] z-0 h-screen w-[400px] bg-white/95 backdrop-blur-xl border-r border-gray-200 shadow-[10px_0_30px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out flex flex-col ${isSearchOpen ? 'opacity-100 translate-x-0 visible' : 'opacity-0 -translate-x-10 invisible'}`}
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Search</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-gray-100/80 border-transparent focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-pink-200 rounded-xl transition-all duration-300 outline-none text-sm"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400 w-4 h-4" />}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {searchQuery && searchResults.length === 0 && !isSearching && (
             <p className="text-center text-sm text-gray-500 mt-10">No users found.</p>
          )}
          
          {searchResults.map((searchUser) => (
            <div 
              key={searchUser._id} 
              onClick={() => {
                navigate(`/profile/${searchUser._id}`);
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
            >
              <Avatar className="w-12 h-12 border-2 border-transparent hover:border-pink-300 transition-all">
                <AvatarImage src={searchUser?.profilePicture} alt={searchUser?.username} />
                <AvatarFallback><FaRegCircleUser className="w-6 h-6 text-gray-400" /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-800">{searchUser?.username}</span>
                <span className="text-xs text-gray-500 line-clamp-1">{searchUser?.bio || "No bio"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
