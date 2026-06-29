import { useEffect, useState, useRef } from "react";
import VoicePreviewAndSend from "./VoicePreviewAndSend";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { setSelectedUser } from "@/redux/authSlice";
import {
  MessageCircleCode,
  ArrowLeft,
  Send,
  Phone,
  Info,
  Image as ImageIcon,
  Smile,
  Mic,
  StopCircle,
  Search,
  Plus,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import Messages from "./Messages";
import { setMessages, markMessagesAsRead, setReplyingTo } from "@/redux/chatSlice";
import axios from "axios";
import { FaVideo } from "react-icons/fa";
import { API_BASE_URL } from "@/main";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import VideoCall from "./VideoCall";
import AudioCall from "./AudioCall";
import { getSocket } from "@/socketInstance,.js";
import useGetRTM from "@/hooks/useGetRTM";

const ChatPage = () => {
  console.log("[ChatPage] Component rendering");
  // Initialize real-time message handling
  useGetRTM();
  const { user, suggestedUsers, selectedUser } = useSelector((store) => store.auth);
  const { messages, replyingTo, onlineUsers, unreadMessages } = useSelector((store) => store.chat);
  const dispatch = useDispatch();
  const [textMessage, setTextMessage] = useState("");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  // Voice message state (must be inside component)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  // Notification for over-limit
  const [voiceError, setVoiceError] = useState("");
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Smart Reply state
  const [smartReplies, setSmartReplies] = useState([]);

  // Fetch smart replies when a chat is selected
  useEffect(() => {
    const fetchSmartReplies = async () => {
      if (!selectedUser?._id) {
        setSmartReplies([]);
        return;
      }
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/v1/post/smart-replies/${selectedUser._id}`,
          { withCredentials: true }
        );
        if (res.data.success) {
          setSmartReplies(res.data.replies);
        }
      } catch (error) {
        console.log("Smart reply fetch error:", error);
        setSmartReplies([]);
      }
    };
    fetchSmartReplies();
  }, [selectedUser?._id, messages?.length]);

  // Start recording
  const startRecording = async () => {
    setVoiceError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError("Audio recording not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      setMediaRecorder(recorder);
      audioChunksRef.current = [];
      setIsRecording(true);
      setRecordingTime(0);
      recorder.start();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };
      // Timer for 30s limit
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 29) {
            stopRecording(true);
            setVoiceError("Voice message limit is 30 seconds.");
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setVoiceError("Microphone access denied or unavailable.");
    }
  };

  // Stop recording
  const stopRecording = (auto = false) => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
    if (!auto) setVoiceError("");
  };

  // Reset audio after sending/cancel
  const resetAudio = () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
    setRecordingTime(0);
    setIsRecording(false);
    setVoiceError("");
  };
  console.log("[ChatPage] User from Redux:", user?._id);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const [typingMap, setTypingMap] = useState({}); // { userId: true/false }
  console.log("[ChatPage] Current typingMap state:", typingMap);

  // Force socket check - create a state that updates when socket is available
  const [socketReady, setSocketReady] = useState(false);

  // Check for socket availability
  useEffect(() => {
    const checkSocket = () => {
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log("[ChatPage] Socket is ready and connected:", socket.id);
        setSocketReady(true);
      } else {
        console.log("[ChatPage] Socket not ready yet, will retry");
      }
    };

    // Check immediately
    checkSocket();

    // If not ready, check again after a short delay
    const timer = setInterval(checkSocket, 100);

    return () => clearInterval(timer);
  }, []);

  // Typing indicator logic (for receiving) - MUST be here as a hook
  useEffect(() => {
    console.log(
      "[ChatPage] Typing useEffect EXECUTING - socketReady:",
      socketReady,
      "user:",
      !!user?._id
    );
    const socket = getSocket();
    console.log(
      "[ChatPage] Socket status:",
      socket ? `Connected (${socket.id})` : "NULL",
      "User ID:",
      user?._id
    );

    if (!socket || !user?._id || !socketReady) {
      console.log(
        "[ChatPage] Skipping typing listeners - socket:",
        !!socket,
        "socketReady:",
        socketReady,
        "user:",
        !!user?._id
      );
      return;
    }

    console.log("[ChatPage] Setting up typing listeners NOW");

    const handleTyping = ({ from }) => {
      console.log("[handleTyping] Received typing event from:", from);
      setTypingMap((prev) => {
        const updated = { ...prev, [from]: true };
        console.log("[handleTyping] Updated typingMap:", updated);
        return updated;
      });
    };

    const handleStopTyping = ({ from }) => {
      console.log("[handleStopTyping] Received stop typing event from:", from);
      setTypingMap((prev) => {
        const updated = { ...prev, [from]: false };
        console.log("[handleStopTyping] Updated typingMap:", updated);
        return updated;
      });
    };

    console.log("[ChatPage] Registering typing event listeners");
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);

    // Test if socket is receiving ANY events
    socket.onAny((eventName, ...args) => {
      if (eventName === "typing" || eventName === "stop typing") {
        console.log("[ChatPage] Socket received event:", eventName, args);
      }
    });

    return () => {
      console.log("[ChatPage] Cleaning up typing listeners");
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
      socket.offAny();
    };
  }, [user?._id, socketReady]); // Add socketReady to dependencies

  const [fileLimitReached, setFileLimitReached] = useState(false);
  const [fileUploadError, setFileUploadError] = useState("");
  const [fileUploading, setFileUploading] = useState(false);

  // File upload handler
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser?._id) return;
    setFileUploadError("");
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/send-file/${selectedUser._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (res.data.success) {
        dispatch(setMessages([...messages, res.data.newMessage]));
        setFileLimitReached(false);
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setFileLimitReached(true);
        setFileUploadError("Daily file send limit reached (10 files per day)");
      } else {
        setFileUploadError("File upload failed");
      }
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  };

  // Typing indicator logic (for sending)
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);

  const sendmsgHandler = async (receiverId, messageToForceSend) => {
    const msgText = messageToForceSend || textMessage;
    if (!msgText.trim() || isSending) return;
    
    // Clear input & prevent double-clicks immediately (Optimistic UI)
    setTextMessage("");
    setIsSending(true);
    const replyId = replyingTo?._id;
    dispatch(setReplyingTo(null));

    // Stop typing indicator
    const socket = getSocket();
    if (socket && selectedUser?._id && user?._id) {
      socket.emit("stop typing", { to: selectedUser._id, from: user._id });
      lastTypingSentRef.current = false;
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/send/${receiverId}`,
        { textMessage: msgText, replyTo: replyId },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        dispatch(setMessages([...messages, res.data.newMessage]));
        // Remove the used smart replies to clear the UI
        if (messageToForceSend) {
          setSmartReplies([]);
        }
      } else {
        setTextMessage(msgText); // Restore on backend failure
        toast.error("Failed to send: " + (res.data.message || "Unknown error"));
      }
    } catch (error) {
      console.log(error);
      setTextMessage(msgText); // Restore on network error
      toast.error("Error sending message: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectUser = async (suggestedUser) => {
    dispatch(setSelectedUser(suggestedUser));
    // Mark messages from this user as read in local state
    dispatch(markMessagesAsRead(suggestedUser._id));

    // Call backend API to mark messages as seen in database
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/message/mark-seen`,
        { senderId: suggestedUser._id },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      console.log("Messages marked as seen for:", suggestedUser.username);
    } catch (error) {
      console.error("Failed to mark messages as seen:", error);
    }
  };

  const handleBackToList = () => {
    dispatch(setSelectedUser(null));
  };

  const emitTyping = () => {
    const socket = getSocket();
    if (!socket || !selectedUser?._id || !user?._id) return;
    if (!lastTypingSentRef.current) {
      console.log("[emitTyping] Emitting 'typing'", {
        to: selectedUser._id,
        from: user._id,
      });
      socket.emit("typing", { to: selectedUser._id, from: user._id });
      lastTypingSentRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      console.log("[emitTyping] Emitting 'stop typing'", {
        to: selectedUser._id,
        from: user._id,
      });
      socket.emit("stop typing", { to: selectedUser._id, from: user._id });
      lastTypingSentRef.current = false;
    }, 1500);
  };

  const handleInputChange = (e) => {
    setTextMessage(e.target.value);
    emitTyping();
  };

  const handleEmojiSelect = (emoji) => {
    setTextMessage((prev) => prev + (emoji.native || ""));
    emitTyping();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && textMessage.trim() && !isSending) {
      sendmsgHandler(selectedUser._id);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(setSelectedUser(null));
    };
  }, [dispatch]);

  return (
    <div className="flex h-screen min-h-0 bg-background text-foreground overflow-hidden">
      {/* Left Sidebar - User List */}
      <section
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full md:w-96 flex-col h-screen min-h-0 bg-card/10 section-glass-low transition-all duration-300 relative`}
      >
        <div className="absolute right-0 top-0 h-full z-30">
          <div className="creative-v-separator" />
        </div>
        {/* Header */}
        <div className="flex flex-col sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-5 bg-background/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{user?.username}</h1>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label>Group Name</Label>
                  <Input 
                    value={groupName} 
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="bg-background border-white/10"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Participants</Label>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                    {suggestedUsers.map(u => (
                      <div key={u._id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg">
                        <Checkbox 
                          id={`user-${u._id}`}
                          checked={selectedGroupParticipants.includes(u._id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedGroupParticipants([...selectedGroupParticipants, u._id]);
                            else setSelectedGroupParticipants(selectedGroupParticipants.filter(id => id !== u._id));
                          }}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.profilePicture} />
                          <AvatarFallback>{u.username[0]}</AvatarFallback>
                        </Avatar>
                        <Label htmlFor={`user-${u._id}`} className="cursor-pointer flex-1">{u.username}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      const res = await axios.post(`${API_BASE_URL}/api/v1/message/group/create`, {
                        groupName,
                        participants: selectedGroupParticipants
                      }, { withCredentials: true });
                      if (res.data.success) {
                        setIsGroupDialogOpen(false);
                        setGroupName("");
                        setSelectedGroupParticipants([]);
                        toast.success("Group created!");
                      }
                    } catch (error) {
                      toast.error("Failed to create group");
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-[#1A1A1A]"
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
          <div className="creative-h-separator" />
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-1">
          {suggestedUsers.map((suggestedUser) => {
            const isonline = onlineUsers.includes(suggestedUser?._id);
            const isActive = selectedUser?._id === suggestedUser._id;
            const unreadCount = unreadMessages?.[suggestedUser._id] || 0;
            const isTypingToMe = typingMap[suggestedUser._id];
            return (
              <div
                key={suggestedUser._id}
                onClick={() => handleSelectUser(suggestedUser)}
                className={`group flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-all duration-200 mx-2 ${
                  isActive ? "active-chat-user bg-secondary/50" : "hover:bg-secondary/30"
                }`}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-200">
                    <AvatarImage src={suggestedUser?.profilePicture} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-[#1A1A1A] font-bold">
                      {suggestedUser?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isonline && (
                    <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                      {suggestedUser?.username}
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-[#1A1A1A] bg-blue-600 px-2 py-0.5 rounded-full shadow-[0_2px_8px_rgba(37,99,235,0.4)]">
                        {unreadCount > 5 ? "5+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-medium ${
                        isonline ? "text-green-500" : "text-muted-foreground"
                      }`}
                    >
                      {isonline
                        ? typingMap[suggestedUser._id]
                          ? "typing..."
                          : "Online"
                        : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Side - Chat Area */}
      <div
        className={`${
          selectedUser ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 min-h-0 bg-background relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_40%)] pointer-events-none"></div>
        {selectedUser ? (
          <>
            {/* Header for chat area */}
            <div className="flex flex-col sticky top-0 z-20">
              <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-4 bg-background/40 backdrop-blur-md">
              <Button
                className="md:hidden rounded-full p-2 h-auto"
                variant="ghost"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="w-10 h-10 ring-2 ring-primary/10 shadow-lg">
                <AvatarImage src={selectedUser?.profilePicture} alt="profile" className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-[#1A1A1A] font-bold">
                  {selectedUser?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 ml-1">
                <h3 className="font-bold text-sm md:text-base truncate text-foreground">
                  {selectedUser?.username}
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${onlineUsers.includes(selectedUser._id) ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-muted-foreground/30"}`}></div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {onlineUsers.includes(selectedUser._id)
                      ? typingMap[selectedUser._id]
                        ? "typing..."
                        : "Online"
                      : "Offline"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setIsVideoCallOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/10 group transition-all duration-200"
                >
                  <FaVideo className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                </Button>
                <Button
                  onClick={() => setIsAudioCallOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/10 group transition-all duration-200"
                >
                  <Phone className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                </Button>
                <Button
                  onClick={() => setShowSearch(!showSearch)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/10 group transition-all duration-200"
                >
                  <Search className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                </Button>
              </div>
            </div>
            <div className="creative-h-separator" />
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <Messages
              selectedUser={selectedUser}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              isTyping={(() => {
                const isTypingValue = typingMap[selectedUser._id] || false;
                console.log("[ChatPage] Passing isTyping to Messages:", {
                  selectedUserId: selectedUser._id,
                  typingMap,
                  isTypingValue,
                });
                return isTypingValue;
              })()}
            />
          </div>

          {/* Message Input Area */}
          {voiceError && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs font-medium backdrop-blur-md relative z-30">
              <div className="creative-h-separator absolute top-0 left-0 w-full opacity-50" />
              {voiceError}
            </div>
          )}
          
          {/* Smart Reply Suggestions */}
          <AnimatePresence>
            {smartReplies.length > 0 && !textMessage.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="px-4 pt-2 relative z-20"
              >
                <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest shrink-0 mr-1">✨ AI</span>
                  {smartReplies.map((reply, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => sendmsgHandler(selectedUser._id, reply)}
                      disabled={isSending}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 text-[#1A1A1A]/80 hover:text-[#1A1A1A] hover:border-white/20 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)] disabled:opacity-50 transition-all duration-200 backdrop-blur-sm"
                    >
                      {reply}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 py-6 bg-transparent relative z-20">
            <div className="creative-h-separator absolute top-0 left-0 w-full" />
            
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="max-w-4xl mx-auto overflow-hidden"
                >
                  <div className="bg-secondary/60 backdrop-blur-xl rounded-t-[20px] p-3 border-t border-x border-white/5 border-l-4 border-l-blue-500 flex items-center justify-between mb-0.5">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        Replying to {replyingTo.senderId?.username || "User"}
                      </span>
                      <p className="text-xs text-muted-foreground truncate italic">
                        {replyingTo.message || (replyingTo.messageType === 'voice' ? '🎤 Voice message' : '📁 Attached file')}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full hover:bg-white/10"
                      onClick={() => dispatch(setReplyingTo(null))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`max-w-4xl mx-auto flex items-end gap-2 bg-secondary/40 backdrop-blur-xl border border-white/5 p-2 ${replyingTo ? 'rounded-b-[32px] rounded-t-[4px]' : 'rounded-[32px]'} shadow-2xl transition-all focus-within:bg-secondary/60 focus-within:border-primary/20`}>
              {/* File upload button */}
              <label className="rounded-full hover:bg-white/10 cursor-pointer flex items-center justify-center w-10 h-10 flex-shrink-0 transition-colors">
                <ImageIcon className="h-5 w-5 text-blue-400" />
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  disabled={fileLimitReached || fileUploading}
                  accept="*"
                />
              </label>

              {/* Emoji Picker */}
              <div className="relative flex items-center flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/10 h-10 w-10 transition-colors"
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                >
                  <Smile className="h-5 w-5 text-yellow-500" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute bottom-14 left-0 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                    />
                  </div>
                )}
              </div>

              {/* Input Field */}
              <div className="flex-1 relative flex items-center bg-background/50 rounded-[24px] pr-2 transition-all">
                <input
                  value={textMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setShowEmojiPicker(false)}
                  type="text"
                  className="w-full px-4 py-3 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                  placeholder="Type a message..."
                  disabled={isRecording}
                />
                
                {/* Voice message button inside input */}
                <div className="flex items-center">
                  {isRecording ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-destructive/10 flex h-8 w-auto px-2 transition-all"
                      type="button"
                      onClick={() => stopRecording(false)}
                    >
                      <StopCircle className="h-5 w-5 text-destructive animate-pulse" />
                      <span className="ml-1 text-[10px] text-destructive font-bold tabular-nums">
                        {recordingTime}s
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-white/10 h-8 w-8 transition-colors"
                      type="button"
                      onClick={startRecording}
                      disabled={isRecording}
                    >
                      <Mic className="h-4 w-4 text-primary/60" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <Button
                onClick={() =>
                  textMessage.trim() && sendmsgHandler(selectedUser._id)
                }
                variant="ghost"
                size="icon"
                className={`rounded-full h-10 w-10 transition-all ${
                  textMessage.trim() && !isRecording
                    ? "bg-blue-600 hover:bg-blue-500 text-[#1A1A1A] scale-100 translate-x-0"
                    : "bg-transparent text-muted-foreground/40 scale-90 translate-x-2"
                }`}
                disabled={!textMessage.trim() || isRecording || isSending}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            {fileUploadError && (
              <span className="text-[10px] text-destructive absolute -top-5 left-6 font-medium animate-in fade-in slide-in-from-bottom-1">
                {fileUploadError}
              </span>
            )}
          </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background px-4">
            <div className="flex flex-col items-center justify-center text-center p-4 md:p-8 animate-in fade-in zoom-in-95 duration-700">
              <div className="w-20 h-20 md:w-28 md:h-28 mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                <div className="w-full h-full bg-background rounded-[22px] flex items-center justify-center">
                  <MessageCircleCode className="w-10 h-10 md:w-14 md:h-14 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-black mb-3 tracking-tighter">Your Messages</h1>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Connect with your friends, share stories, and stay close effortlessly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Voice Message Preview Modal */}
      {audioBlob && !isRecording && (
        <VoicePreviewAndSend
          audioBlob={audioBlob}
          selectedUser={selectedUser}
          messages={messages}
          dispatch={dispatch}
          setMessages={setMessages}
          resetAudio={resetAudio}
          setVoiceError={setVoiceError}
        />
      )}

      {/* Video Call Component */}
      {isVideoCallOpen && selectedUser && (
        <VideoCall
          selectedUser={selectedUser}
          onClose={() => setIsVideoCallOpen(false)}
        />
      )}

      {/* Audio Call Component */}
      {isAudioCallOpen && selectedUser && (
        <AudioCall
          selectedUser={selectedUser}
          onClose={() => setIsAudioCallOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;
