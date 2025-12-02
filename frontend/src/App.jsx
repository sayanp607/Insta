// App.jsx
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import {
  initializeSocket,
  disconnectSocket,
  getSocket,
} from "./socketInstance,";
import {
  setOnlineUsers,
  addUnreadMessage,
  setMessages,
} from "./redux/chatSlice";
import { setLikeNotification, setCommentNotification } from "./redux/rtnSlice";
import { setSelectedUser, setSuggestedUsers } from "./redux/authSlice";
import { setPosts } from "./redux/postSlice";
import { API_BASE_URL } from "./main";
import axios from "axios";
import ProtectedRoutes from "./components/ProtectedRoutes";
import Signup from "./components/Signup";
import Login from "./components/Login";
import MainLayout from "./components/MainLayout";
import Home from "./components/Home";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import ChatPage from "./components/ChatPage";
import IncomingCallNotification from "./components/IncomingCallNotification";
import IncomingAudioCallNotification from "./components/IncomingAudioCallNotification";
import VideoCall from "./components/VideoCall";
import AudioCall from "./components/AudioCall";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoutes>
        <MainLayout />
      </ProtectedRoutes>
    ),
    children: [
      {
        path: "/",
        element: (
          <ProtectedRoutes>
            <Home />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/profile/:id",
        element: (
          <ProtectedRoutes>
            <Profile />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/account/edit",
        element: (
          <ProtectedRoutes>
            <EditProfile />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/chat",
        element: (
          <ProtectedRoutes>
            <ChatPage />
          </ProtectedRoutes>
        ),
      },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
]);

function App() {
  const { user, suggestedUsers } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [incomingAudioCallData, setIncomingAudioCallData] = useState(null);
  const [isInAudioCall, setIsInAudioCall] = useState(false);

  useEffect(() => {
    if (user?._id) {
      const socket = initializeSocket(user._id);
      console.log("Socket initialized for user:", user._id);

      // Remove existing listeners before adding new ones to prevent duplicates
      socket.off("connect");
      socket.off("getOnlineUsers");
      socket.off("newMessage");
      socket.off("notification");

      // Wait for socket to connect before setting up listeners
      socket.on("connect", () => {
        console.log("Socket connected successfully!");
        console.log("Socket ID:", socket.id);
        console.log("Socket connected:", socket.connected);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected!");
      });

      socket.on("getOnlineUsers", (onlineUsers) => {
        console.log("Online users updated:", onlineUsers);
        dispatch(setOnlineUsers(onlineUsers));
      });

      // Listen for new chat messages
      socket.on("newMessage", async (message) => {
        console.log("======= NEW MESSAGE RECEIVED =======");
        console.log("Received new message:", message);
        console.log("Message senderId:", message.senderId);

        // Get selectedUser from Redux state
        const state = window.__REDUX_STORE__?.getState();
        const currentSelectedUser = state?.auth?.selectedUser;
        const currentMessages = state?.chat?.messages || [];

        console.log("Current selected user:", currentSelectedUser?._id);
        console.log("Current path:", window.location.pathname);

        // Only add unread count if the message is not from the currently selected user in chat
        const currentPath = window.location.pathname;
        const isOnChatPage = currentPath === "/chat";

        // If the message is from the currently selected user and we're on the chat page, add to messages
        if (isOnChatPage && message.senderId === currentSelectedUser?._id) {
          console.log("Adding message to current chat");
          dispatch(setMessages([...currentMessages, message]));
        } else {
          // Don't increment unread count for call messages (video_call or audio_call)
          const isCallMessage =
            message.messageType === "video_call" ||
            message.messageType === "audio_call";

          if (!isCallMessage) {
            console.log(
              "Adding to unread messages for user:",
              message.senderId
            );
            // Increment unread count for regular messages only
            dispatch(addUnreadMessage({ userId: message.senderId }));

            // Show toast notification for new message
            import("sonner").then(({ toast }) => {
              toast.info("New message received");
            });
          } else {
            console.log("Call message received, not counting as unread");
          }
        }
        console.log("======= END NEW MESSAGE =======");
      });

      // Listen for messages seen event
      socket.on("messagesSeen", ({ receiverId }) => {
        console.log("Messages seen by:", receiverId);

        // Update messages in Redux to mark as seen
        const state = window.__REDUX_STORE__?.getState();
        const currentMessages = state?.chat?.messages || [];

        const updatedMessages = currentMessages.map((msg) => {
          if (msg.receiverId === receiverId && !msg.seen) {
            return { ...msg, seen: true, seenAt: new Date().toISOString() };
          }
          return msg;
        });

        dispatch(setMessages(updatedMessages));
      });

      socket.on("notification", async (notification) => {
        console.log("Received notification:", notification);
        console.log("Notification type:", notification.type);

        if (notification.type === "comment") {
          console.log("Processing comment notification");
          dispatch(setCommentNotification(notification));
          console.log("Comment notification dispatched to Redux");

          // Show toast notification for comment
          import("sonner").then(({ toast }) => {
            toast.success(
              `${
                notification.userDetails?.username || "Someone"
              } commented on your post`
            );
          });

          // Fetch updated post data to show new comment immediately
          try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/post/all`, {
              withCredentials: true,
            });
            if (res.data.success) {
              console.log("Updated posts fetched:", res.data.posts.length);
              dispatch(setPosts(res.data.posts));
            }
          } catch (error) {
            console.error("Error fetching updated posts:", error);
          }
        } else {
          console.log("Processing like notification");
          dispatch(setLikeNotification(notification));
        }
      });

      // Fetch suggested users globally for video calls
      const fetchSuggestedUsers = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/v1/user/suggested`, {
            withCredentials: true,
          });
          if (res.data.success) {
            console.log("Fetched suggested users:", res.data.users);
            dispatch(setSuggestedUsers(res.data.users));
          }
        } catch (error) {
          console.log("Error fetching suggested users:", error);
        }
      };
      fetchSuggestedUsers();

      return () => {
        // Don't disconnect socket, just remove listeners to prevent issues
        // socket.off("connect");
        // socket.off("getOnlineUsers");
        // socket.off("newMessage");
        // socket.off("notification");
      };
    } else {
      disconnectSocket();
    }
  }, [user, dispatch]);

  const handleAcceptCall = (callData) => {
    // Find the caller in suggested users and set as selected user
    const caller = suggestedUsers.find((u) => u._id === callData.from);
    if (caller) {
      dispatch(setSelectedUser(caller));
    }
    setIncomingCallData(callData);
    setIsInVideoCall(true);
  };

  const handleRejectCall = (callerId) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("call:reject", { to: callerId });
    }
    setIncomingCallData(null);
  };

  const handleCloseVideoCall = () => {
    setIsInVideoCall(false);
    setIncomingCallData(null);
  };

  const handleAcceptAudioCall = (callData) => {
    const caller = suggestedUsers.find((u) => u._id === callData.from);
    if (caller) {
      dispatch(setSelectedUser(caller));
    }
    setIncomingAudioCallData(callData);
    setIsInAudioCall(true);
  };

  const handleRejectAudioCall = (callerId) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("audio_call:reject", { to: callerId });
    }
    setIncomingAudioCallData(null);
  };

  const handleCloseAudioCall = () => {
    setIsInAudioCall(false);
    setIncomingAudioCallData(null);
  };

  // Memoize the selected caller to prevent unnecessary re-renders
  const selectedCaller = useMemo(() => {
    if (!incomingCallData?.from) return null;
    return suggestedUsers.find((u) => u._id === incomingCallData.from);
  }, [incomingCallData?.from, suggestedUsers]);

  const selectedAudioCaller = useMemo(() => {
    if (!incomingAudioCallData?.from) return null;
    return suggestedUsers.find((u) => u._id === incomingAudioCallData.from);
  }, [incomingAudioCallData?.from, suggestedUsers]);

  return (
    <>
      <RouterProvider router={browserRouter} />

      {/* Global Incoming Video Call Notification */}
      <IncomingCallNotification
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Global Incoming Audio Call Notification */}
      <IncomingAudioCallNotification
        onAccept={handleAcceptAudioCall}
        onReject={handleRejectAudioCall}
      />

      {/* Global Video Call for Incoming Calls */}
      {isInVideoCall && incomingCallData && selectedCaller && (
        <VideoCall
          selectedUser={selectedCaller}
          onClose={handleCloseVideoCall}
          incomingCallData={incomingCallData}
        />
      )}

      {/* Global Audio Call */}
      {isInAudioCall && incomingAudioCallData && selectedAudioCaller && (
        <AudioCall
          selectedUser={selectedAudioCaller}
          onClose={handleCloseAudioCall}
          incomingCallData={incomingAudioCallData}
        />
      )}
    </>
  );
}

export default App;
