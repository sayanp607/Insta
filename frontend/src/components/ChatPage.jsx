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
} from "lucide-react";
import { Button } from "./ui/button";
import Messages from "./Messages";
import { setMessages, markMessagesAsRead } from "@/redux/chatSlice";
import axios from "axios";
import { FaVideo } from "react-icons/fa";
import { API_BASE_URL } from "@/main";
import VideoCall from "./VideoCall";
import AudioCall from "./AudioCall";
import { getSocket } from "@/socketInstance,.js";
import useGetRTM from "@/hooks/useGetRTM";

const ChatPage = () => {
  console.log("[ChatPage] Component rendering");
  // Initialize real-time message handling
  useGetRTM();
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
  const { user, suggestedUsers, selectedUser } = useSelector(
    (store) => store.auth
  );
  console.log("[ChatPage] User from Redux:", user?._id);
  const { onlineUsers, unreadMessages } = useSelector((store) => store.chat);
  const { messages } = useSelector((store) => store.chat);
  const dispatch = useDispatch();

  const [textMessage, setTextMessage] = useState("");
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

  const sendmsgHandler = async (receiverId) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/send/${receiverId}`,
        { textMessage },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        dispatch(setMessages([...messages, res.data.newMessage]));
        setTextMessage("");
      }
    } catch (error) {
      console.log(error);
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
    if (e.key === "Enter" && textMessage.trim()) {
      sendmsgHandler(selectedUser._id);
      // Stop typing immediately on send
      const socket = getSocket();
      if (socket && selectedUser?._id && user?._id) {
        socket.emit("stop typing", { to: selectedUser._id, from: user._id });
        lastTypingSentRef.current = false;
      }
    }
  };

  useEffect(() => {
    return () => {
      dispatch(setSelectedUser(null));
    };
  }, [dispatch]);

  return (
    <div className="flex h-screen min-h-0 bg-white">
      {/* Left Sidebar - User List */}
      <section
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full md:w-96 md:ml-[16%] flex-col border-r border-gray-300 h-screen min-h-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-300">
          <h1 className="text-xl font-semibold">{user?.username}</h1>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MessageCircleCode className="h-6 w-6" />
          </Button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {suggestedUsers.map((suggestedUser) => {
            const isonline = onlineUsers.includes(suggestedUser?._id);
            const isActive = selectedUser?._id === suggestedUser._id;
            const unreadCount = unreadMessages?.[suggestedUser._id] || 0;
            const isTypingToMe = typingMap[suggestedUser._id];
            return (
              <div
                key={suggestedUser._id}
                onClick={() => handleSelectUser(suggestedUser)}
                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                  isActive ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={suggestedUser?.profilePicture} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                      {suggestedUser?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isonline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {suggestedUser?.username}
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
                        {unreadCount > 5 ? "5+" : unreadCount} new{" "}
                        {unreadCount === 1 ? "message" : "messages"}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs ${
                      isonline ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {isonline
                      ? typingMap[suggestedUser._id]
                        ? "typing..."
                        : "Active now"
                      : "Offline"}
                  </span>
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
        } flex-1 flex-col min-w-0 min-h-0`}
      >
        {selectedUser ? (
          <>
            {/* Header for chat area (mobile back, user info, call buttons) */}
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 border-b border-gray-300 bg-white sticky top-0 z-10">
              <Button
                className="md:hidden rounded-full p-2 h-auto"
                variant="ghost"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="w-9 h-9 md:w-10 md:h-10">
                <AvatarImage src={selectedUser?.profilePicture} alt="profile" />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm">
                  {selectedUser?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base truncate">
                  {selectedUser?.username}
                </h3>
                <span className="text-xs text-gray-500">
                  {onlineUsers.includes(selectedUser._id)
                    ? typingMap[selectedUser._id]
                      ? "typing..."
                      : "Active now"
                    : "Offline"}
                </span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  onClick={() => setIsVideoCallOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100"
                >
                  <FaVideo className="h-5 w-5 text-blue-500" />
                </Button>
                <Button
                  onClick={() => setIsAudioCallOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100"
                >
                  <Phone className="h-5 w-5 text-green-500" />
                </Button>
                <Button
                  onClick={() => setShowSearch(!showSearch)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100"
                >
                  <Search className="h-5 w-5 text-purple-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100 hidden md:flex"
                >
                  <Info className="h-5 w-5" />
                </Button>
              </div>
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

            {/* Message Input */}
            {voiceError && (
              <div className="px-3 md:px-4 py-2 bg-red-50 border-t border-red-200 text-red-600 text-xs md:text-sm">
                {voiceError}
              </div>
            )}
            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 border-t border-gray-300 bg-white">
              {/* File upload button */}
              <label className="rounded-full hover:bg-gray-100 cursor-pointer flex items-center justify-center w-9 h-9 md:w-10 md:h-10 flex-shrink-0">
                <ImageIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  disabled={fileLimitReached || fileUploading}
                  accept="*"
                />
              </label>
              {/* File upload error or limit message */}
              {fileUploadError && (
                <span className="text-xs text-red-500 ml-1 md:ml-2 hidden sm:inline">
                  {fileUploadError}
                </span>
              )}
              {/* Voice message button and recording UI */}
              <div className="relative flex items-center flex-shrink-0">
                {isRecording ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-gray-100 flex h-9 w-auto md:h-10 px-2 md:px-3"
                    type="button"
                    onClick={() => stopRecording(false)}
                  >
                    <StopCircle className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
                    <span className="ml-1 md:ml-2 text-xs text-red-500 font-medium">
                      {recordingTime}s
                    </span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-gray-100 flex h-9 w-9 md:h-10 md:w-10"
                    type="button"
                    onClick={startRecording}
                    disabled={isRecording}
                  >
                    <Mic className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100 hidden sm:flex h-9 w-9 md:h-10 md:w-10"
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                >
                  <Smile className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 md:bottom-14 left-0 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                    />
                  </div>
                )}
              </div>
              <input
                value={textMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onFocus={() => setShowEmojiPicker(false)}
                type="text"
                className="flex-1 px-3 md:px-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors text-sm min-w-0"
                placeholder="Message..."
                disabled={isRecording}
              />
              <Button
                onClick={() =>
                  textMessage.trim() && sendmsgHandler(selectedUser._id)
                }
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-100 flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
                disabled={!textMessage.trim() || isRecording}
              >
                <Send
                  className={`h-4 w-4 md:h-5 md:w-5 ${
                    textMessage.trim() && !isRecording
                      ? "text-blue-500"
                      : "text-gray-400"
                  }`}
                />
              </Button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-white px-4">
            <div className="flex flex-col items-center justify-center text-center p-4 md:p-8">
              <div className="w-16 h-16 md:w-24 md:h-24 mb-4 rounded-full border-4 border-black flex items-center justify-center">
                <MessageCircleCode className="w-8 h-8 md:w-12 md:h-12" />
              </div>
              <h1 className="text-2xl font-light mb-2">Your Messages</h1>
              <p className="text-gray-500 text-sm">
                Send private messages to a friend or group
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
