import { useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import useGetAllMessage from "@/hooks/useGetAllMessage";
import { setMessages } from "@/redux/chatSlice";
import { API_BASE_URL } from "@/main";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, Pin, MoreVertical, PinOff, Search, X, MessageCircleCode, Reply, Smile, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { setReplyingTo, updateMessageReactions } from "@/redux/chatSlice";
import PinMessageDialog from "./PinMessageDialog";
import axios from "axios";

function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Invalid date";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to compare only dates
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const yesterdayDate = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );

  if (messageDate.getTime() === todayDate.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterdayDate.getTime()) {
    return "Yesterday";
  } else {
    // Always include year for clarity
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    return date.toLocaleDateString("en-US", options);
  }
}

function formatDateAndTime(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Invalid date";

  const dateStr = formatDate(timestamp);
  const timeStr = formatTime(timestamp);

  // If either is empty, return what we have
  if (!dateStr && !timeStr) return "Invalid date";
  if (!dateStr) return timeStr;
  if (!timeStr) return dateStr;

  return `${dateStr}, ${timeStr}`;
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  // Check if both dates are valid
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}


const Messages = ({
  selectedUser,
  searchQuery = "",
  setSearchQuery = () => {},
  showSearch = false,
  setShowSearch = () => {},
  searchResults = [],
  setSearchResults = () => {},
  isTyping = false,
}) => {
  console.log("[Messages] isTyping prop:", isTyping);

  useGetAllMessage();
  const { messages, replyingTo } = useSelector((store) => store.chat);
  const [reactionMenuOpen, setReactionMenuOpen] = useState(null);

  const emojis = ["❤️", "😂", "🔥", "👍", "😮", "😢"];

  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/react/${messageId}`,
        { emoji },
        { withCredentials: true }
      );
      if (res.data.success) {
        dispatch(updateMessageReactions({ messageId, reactions: res.data.reactions }));
        setReactionMenuOpen(null);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onSwipeToReply = (message) => {
    dispatch(setReplyingTo(message));
  };

  const ReplyBubble = ({ replyTo }) => {
    if (!replyTo) return null;
    return (
      <div className="flex flex-col mb-1 max-w-full opacity-70">
        <div className="bg-muted/50 rounded-lg p-2 border-l-2 border-blue-500 text-xs">
          <p className="font-bold text-[10px] text-blue-400">
            {replyTo.senderId?.username || "User"}
          </p>
          <p className="truncate text-muted-foreground italic">
            {replyTo.message || (replyTo.messageType === 'voice' ? '🎤 Voice' : '📁 File')}
          </p>
        </div>
      </div>
    );
  };

  const ReactionsDisplay = ({ reactions }) => {
    if (!reactions || reactions.length === 0) return null;
    
    // Group reactions by emoji
    const grouped = reactions.reduce((acc, curr) => {
      acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="flex flex-wrap gap-1 mt-1 -mb-1">
        {Object.entries(grouped).map(([emoji, count]) => (
          <div key={emoji} className="bg-card/80 border border-white/10 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
            <span className="text-[11px]">{emoji}</span>
            {count > 1 && <span className="text-[9px] font-bold text-muted-foreground">{count}</span>}
          </div>
        ))}
      </div>
    );
  };
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);

  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePinClick = (msg) => {
    setSelectedMessage(msg);
    setShowPinDialog(true);
    setMessageMenuOpen(null);
  };

  const handleUnpin = async (msg) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/unpin`,
        { messageId: msg._id },
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedMessages = messages.map((m) =>
          m._id === msg._id
            ? {
                ...m,
                pinned: false,
                pinnedBy: null,
                pinnedAt: null,
                pinnedUntil: null,
              }
            : m
        );
        dispatch(setMessages(updatedMessages));
      }
    } catch (error) {
      console.error("Failed to unpin message:", error);
    }
    setMessageMenuOpen(null);
  };

  const handlePinSuccess = (pinnedMessage) => {
    const updatedMessages = messages.map((m) =>
      m._id === pinnedMessage._id ? pinnedMessage : m
    );
    dispatch(setMessages(updatedMessages));
  };

  // Get pinned messages
  const pinnedMessages = useMemo(
    () =>
      messages?.filter(
        (msg) => msg.pinned && new Date(msg.pinnedUntil) > new Date()
      ) || [],
    [messages]
  );

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = messages?.filter((msg) => {
        const messageText = msg.message?.toLowerCase() || "";
        const fileName = msg.fileName?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return messageText.includes(query) || fileName.includes(query);
      });
      setSearchResults(filtered || []);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, messages, setSearchResults]);

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.classList.add("bg-yellow-100");
      setTimeout(() => {
        messageElement.classList.remove("bg-yellow-100");
      }, 2000);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log("All messages:", messages);
    console.log("Pinned messages:", pinnedMessages);
    if (pinnedMessages.length > 0) {
      console.log("First pinned message:", pinnedMessages[0]);
    }
  }, [messages, pinnedMessages]);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Pinned Messages Section - Fixed at top */}
      {pinnedMessages.length > 0 && (
        <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-md border-l-4 border-yellow-500 shadow-xl p-4 m-4 rounded-r-xl">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500 uppercase tracking-wider">
              Pinned {pinnedMessages.length === 1 ? "Message" : "Messages"}
            </span>
          </div>
          <div className="space-y-3">
            {pinnedMessages.map((msg) => (
              <div key={msg._id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-inner group/pin transition-all hover:bg-white/10">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-foreground/90 line-clamp-2 flex-1 font-medium">
                    {msg.message || "Voice/File message"}
                  </p>
                  <button
                    onClick={() => handleUnpin(msg)}
                    className="ml-2 p-1.5 hover:bg-white/10 rounded-full opacity-0 group-hover/pin:opacity-100 transition-opacity"
                    title="Unpin"
                  >
                    <PinOff className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Until {new Date(msg.pinnedUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar - Only show when search is active */}
      {showSearch && (
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border p-4 shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in conversation..."
                className="w-full pl-11 pr-4 py-2.5 bg-secondary/50 border border-white/5 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearchToggle}
              className="p-2.5 hover:bg-secondary rounded-full transition-colors"
              title="Close search"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 pl-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Found {searchResults.length} Match{searchResults.length !== 1 ? "es" : ""}
              </span>
            </div>
          )}

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {searchResults.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => scrollToMessage(msg._id)}
                  className="w-full text-left p-3 hover:bg-secondary/50 rounded-2xl transition-all border border-transparent hover:border-white/5 group"
                >
                  <p className="text-sm text-foreground/80 group-hover:text-foreground truncate font-medium">
                    {msg.message || msg.fileName || "Voice message"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                    {formatDateAndTime(msg.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 w-full flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-8 flex flex-col">
          {/* User Profile Section */}
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-1000">
          <div className="relative mb-6">
            <Avatar className="h-28 w-28 ring-4 ring-primary/5 shadow-[0_0_40px_rgba(0,0,0,0.2)]">
              <AvatarImage src={selectedUser?.profilePicture} alt="profile" className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-[#1A1A1A] text-4xl font-black">
                {selectedUser?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-background p-1 rounded-full shadow-lg border border-border">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <Pin className="w-3 h-3 text-[#1A1A1A] fill-white" />
              </div>
            </div>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-foreground mb-1">
            {selectedUser?.username}
          </h3>
          <p className="text-muted-foreground text-sm font-medium mb-6">
            {selectedUser?.bio || "Digital creator"}
          </p>
          <Link to={`/profile/${selectedUser?._id}`}>
            <Button
              className="rounded-full px-8 py-2 text-xs font-bold uppercase tracking-widest bg-secondary hover:bg-secondary/80 text-foreground transition-all duration-300 border border-white/5"
              variant="secondary"
            >
              View Profile
            </Button>
          </Link>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent mt-12 mb-4 opacity-50"></div>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2">
          {messages && messages.length > 0 ? (
            messages.map((msg, index) => {
              const isMyMessage = msg.senderId === user?._id;
              const isCallMessage =
                msg.messageType === "video_call" ||
                msg.messageType === "audio_call";

              // Show date separator if it's first message or day has changed
              // Only show if the timestamp is valid
              const isValidTimestamp = !isNaN(
                new Date(msg.createdAt).getTime()
              );
              const showDateSeparator =
                isValidTimestamp &&
                (index === 0 ||
                  !isSameDay(msg.createdAt, messages[index - 1].createdAt));

              const showTimestamp =
                index === 0 ||
                new Date(msg.createdAt).getTime() -
                  new Date(messages[index - 1].createdAt).getTime() >
                  300000; // 5 minutes

              // Check if this is the last message from current user
              const isLastMyMessage =
                isMyMessage &&
                (index === messages.length - 1 ||
                  messages[index + 1]?.senderId !== user?._id);

              // Render message types
              let messageContent = null;
              if (isCallMessage) {
                messageContent = (
                  <div className="flex flex-col items-center my-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-secondary/30 backdrop-blur-md rounded-2xl text-[11px] font-bold uppercase tracking-widest text-muted-foreground border border-white/5 shadow-xl">
                      {msg.messageType === "video_call" ? (
                        <Video className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-green-500" />
                      )}
                      {msg.callDetails?.status === "completed" ? (
                        <>
                          <span className="text-foreground/80">
                            {msg.messageType === "video_call" ? "Video" : "Audio"} Call Ended
                          </span>
                          <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                          <span>
                            {Math.floor((msg.callDetails?.duration || 0) / 60)}:
                            {((msg.callDetails?.duration || 0) % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-red-500">
                            Missed {msg.messageType === "video_call" ? "video" : "audio"} call
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              } else if (
                msg.messageType === "file" ||
                msg.messageType === "voice"
              ) {
                messageContent = (
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 100 }}
                    dragSnapToOrigin={true}
                    dragElastic={0.1}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 50) {
                        onSwipeToReply(msg);
                      }
                    }}
                    className={`flex flex-col group/msg max-w-[85%] mb-4 animate-in fade-in duration-500 cursor-grab active:cursor-grabbing ${
                      isMyMessage ? "items-end ml-auto" : "items-start mr-auto"
                    }`}
                  >
                    <ReplyBubble replyTo={msg.replyTo} />
                    {/* Preview for images or voice */}
                    {msg.messageType === "voice" ? (
                      <div className={`p-3 rounded-2xl backdrop-blur-md border border-white/5 chat-bubble-shadow ${
                        isMyMessage ? "bg-blue-600/20" : "bg-card/40"
                      }`}>
                        <div className="flex items-center gap-3">
                          <audio
                            controls
                            src={API_BASE_URL + msg.fileUrl}
                            className="h-8 max-w-[200px]"
                          />
                          {typeof msg.voiceDuration === "number" && (
                            <span className="text-[10px] font-black text-muted-foreground uppercase tabular-nums">
                              {Math.floor(msg.voiceDuration / 60)}:
                              {(msg.voiceDuration % 60)
                                .toString()
                                .padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setReactionMenuOpen(reactionMenuOpen === msg._id ? null : msg._id)}
                          className="absolute -right-2 -top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 bg-background border border-white/10 rounded-full shadow-lg hover:scale-110"
                        >
                          <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : msg.fileType && msg.fileType.startsWith("image/") ? (
                      <div className="relative group/image overflow-hidden rounded-2xl chat-bubble-shadow border border-white/10">
                        <a
                          href={API_BASE_URL + msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={API_BASE_URL + msg.fileUrl}
                            alt={msg.fileName}
                            className="max-h-72 w-auto object-cover transition-transform duration-500 group-hover/image:scale-105"
                          />
                        </a>
                        <button
                          onClick={() => setReactionMenuOpen(reactionMenuOpen === msg._id ? null : msg._id)}
                          className="absolute -right-2 -top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 bg-background border border-white/10 rounded-full shadow-lg hover:scale-110"
                        >
                          <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl flex items-center gap-4 chat-bubble-shadow border border-white/5 ${
                        isMyMessage ? "bg-blue-600/30" : "bg-card/60"
                      }`}>
                        <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center border border-white/5">
                          <svg
                            className="w-5 h-5 text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={API_BASE_URL + msg.fileUrl}
                            download={msg.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-foreground hover:text-blue-400 transition-colors truncate block"
                          >
                            {msg.fileName}
                          </a>
                          <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60">
                            {(msg.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          onClick={() => setReactionMenuOpen(reactionMenuOpen === msg._id ? null : msg._id)}
                          className="absolute -right-2 -top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 bg-background border border-white/10 rounded-full shadow-lg hover:scale-110"
                        >
                          <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    
                    <AnimatePresence>
                      {reactionMenuOpen === msg._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          className="absolute z-50 -top-10 left-0 bg-card border border-white/10 rounded-full p-1 flex gap-1 shadow-2xl"
                        >
                          {emojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg._id, emoji)}
                              className="hover:scale-125 transition-transform p-1 text-base"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <ReactionsDisplay reactions={msg.reactions} />
                    
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tabular-nums">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isLastMyMessage && msg.seen && (
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          <span className="text-[9px] font-black text-blue-500 uppercase">Seen</span>
                        </div>
                      )}
                      <button onClick={() => onSwipeToReply(msg)} className="text-[9px] font-black text-blue-400 uppercase hover:underline">Reply</button>
                    </div>
                  </motion.div>
                );
              } else {
                // Regular text message
                messageContent = (
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 100 }}
                    dragSnapToOrigin={true}
                    dragElastic={0.1}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 50) {
                        onSwipeToReply(msg);
                      }
                    }}
                    className={`flex flex-col group/msg max-w-[85%] mb-4 animate-in fade-in slide-in-from-bottom-1 duration-300 cursor-grab active:cursor-grabbing ${
                      isMyMessage ? "items-end ml-auto" : "items-start mr-auto"
                    }`}
                  >
                    <ReplyBubble replyTo={msg.replyTo} />
                    <div
                      className={`px-4 py-2.5 chat-bubble-shadow transition-all group-hover/msg:shadow-2xl relative ${
                        isMyMessage
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-[#1A1A1A] rounded-[20px] rounded-br-[4px]"
                          : "bg-card/80 backdrop-blur-sm text-foreground border border-white/5 rounded-[20px] rounded-bl-[4px]"
                      }`}
                    >
                      <p className="text-sm font-medium leading-relaxed">{msg.message}</p>
                      
                      <button
                        onClick={() => setReactionMenuOpen(reactionMenuOpen === msg._id ? null : msg._id)}
                        className="absolute -right-2 -top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 bg-background border border-white/10 rounded-full shadow-lg hover:scale-110"
                      >
                        <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>

                      <AnimatePresence>
                        {reactionMenuOpen === msg._id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="absolute z-50 -top-10 left-0 bg-card border border-white/10 rounded-full p-1 flex gap-1 shadow-2xl"
                          >
                            {emojis.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id, emoji)}
                                className="hover:scale-125 transition-transform p-1 text-base"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <ReactionsDisplay reactions={msg.reactions} />
                    
                    <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tabular-nums">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isLastMyMessage && msg.seen && (
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          <span className="text-[9px] font-black text-blue-500 uppercase">Seen</span>
                        </div>
                      )}
                      <button onClick={() => onSwipeToReply(msg)} className="text-[9px] font-black text-blue-400 uppercase hover:underline">Reply</button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <div
                  key={msg._id}
                  id={`msg-${msg._id}`}
                  className="group relative transition-colors duration-500"
                >
                  {/* Date Separator */}
                  {showDateSeparator && (
                    <div className="flex justify-center my-12 relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border opacity-30"></div>
                      </div>
                      <span className="relative text-[10px] font-black text-muted-foreground bg-background px-6 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm ring-1 ring-border/20">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Timestamp removed - integrated back into bubbles for cleaner look */}
                  <div className={`flex items-start ${isMyMessage ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="flex-1">{messageContent}</div>
                    
                    {/* Message Menu */}
                    {!isCallMessage && (
                      <div className={`relative px-2 self-center ${isMyMessage ? "" : "order-last"}`}>
                        <button
                          onClick={() =>
                            setMessageMenuOpen(
                              messageMenuOpen === msg._id ? null : msg._id
                            )
                          }
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-secondary/50 rounded-full transition-all duration-200"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {messageMenuOpen === msg._id && (
                          <div className={`absolute bottom-10 ${isMyMessage ? "right-0" : "left-0"} bg-card border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[160px] z-[30] animate-in zoom-in-95 duration-200`}>
                            <div
                              className="fixed inset-0 z-[-1]"
                              onClick={() => setMessageMenuOpen(null)}
                            />
                            {msg.pinned ? (
                              <button
                                onClick={() => handleUnpin(msg)}
                                className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-white/5 flex items-center gap-3 transition-colors text-yellow-500"
                              >
                                <PinOff className="w-4 h-4" />
                                Unpin
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePinClick(msg)}
                                className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-white/5 flex items-center gap-3 transition-colors text-foreground/80"
                              >
                                <Pin className="w-4 h-4" />
                                Pin
                              </button>
                            )}
                            <button className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 flex items-center gap-3 transition-colors text-red-500">
                                <X className="w-4 h-4" />
                                Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 animate-in fade-in duration-1000">
              <div className="w-16 h-16 rounded-full border border-current flex items-center justify-center mb-4 opacity-20">
                <MessageCircleCode className="w-8 h-8" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.3em]">Quiet as a mouse</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        </div>
      </div>

      {/* Typing indicator - Improved styling */}
      {isTyping && (
        <div className="absolute bottom-32 left-8 z-30 animate-in slide-in-from-left duration-500">
          <div className="bg-card/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-[20px] rounded-bl-none shadow-2xl flex items-center gap-3 group">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
              Typing
            </span>
          </div>
        </div>
      )}

      {/* Pin Message Dialog */}
      {showPinDialog && selectedMessage && (
        <PinMessageDialog
          message={selectedMessage}
          onClose={() => {
            setShowPinDialog(false);
            setSelectedMessage(null);
          }}
          onPinSuccess={handlePinSuccess}
        />
      )}
    </div>
  );
};

Messages.propTypes = {
  selectedUser: PropTypes.object,
  searchQuery: PropTypes.string,
  setSearchQuery: PropTypes.func,
  showSearch: PropTypes.bool,
  setShowSearch: PropTypes.func,
  searchResults: PropTypes.array,
  setSearchResults: PropTypes.func,
};

export default Messages;
