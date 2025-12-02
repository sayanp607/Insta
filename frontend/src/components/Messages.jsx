import { useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import useGetAllMessage from "@/hooks/useGetAllMessage";
import { Pin, MoreVertical, PinOff, Search, X } from "lucide-react";
import PinMessageDialog from "./PinMessageDialog";
import axios from "axios";
import { setMessages } from "@/redux/chatSlice";

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

import { API_BASE_URL } from "@/main";
import { Phone, Video, PhoneIncoming, PhoneOutgoing } from "lucide-react";

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
  const { messages } = useSelector((store) => store.chat);
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
    <div className="h-full flex flex-col bg-white">
      {/* Pinned Messages Section - Fixed at top */}
      {pinnedMessages.length > 0 && (
        <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 shadow-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-800">
              Pinned {pinnedMessages.length === 1 ? "Message" : "Messages"}
            </span>
          </div>
          <div className="space-y-2">
            {pinnedMessages.map((msg) => (
              <div key={msg._id} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-gray-700 line-clamp-2 flex-1">
                    {msg.message || "Voice/File message"}
                  </p>
                  <button
                    onClick={() => handleUnpin(msg)}
                    className="ml-2 p-1 hover:bg-gray-100 rounded-full"
                    title="Unpin"
                  >
                    <PinOff className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Until {new Date(msg.pinnedUntil).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar - Only show when search is active */}
      {showSearch && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center w-full gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearchToggle}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Close search"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <span className="text-sm text-gray-500">
                {searchResults.length} result
                {searchResults.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
              {searchResults.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => scrollToMessage(msg._id)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <p className="text-sm text-gray-700 truncate">
                    {msg.message || msg.fileName || "Voice message"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateAndTime(msg.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {/* User Profile Section */}
        <div className="flex flex-col items-center justify-center mb-6 pt-4">
          <Avatar className="h-20 w-20 mb-3">
            <AvatarImage src={selectedUser?.profilePicture} alt="profile" />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl">
              {selectedUser?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-base">{selectedUser?.username}</h3>
          <p className="text-gray-500 text-sm mb-3">
            {selectedUser?.bio || "Instagram user"}
          </p>
          <Link to={`/profile/${selectedUser?._id}`}>
            <Button
              className="rounded-lg px-4 py-1 text-sm font-medium"
              variant="secondary"
            >
              View Profile
            </Button>
          </Link>
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
                  <div className="flex flex-col items-center my-2">
                    <span className="text-xs text-gray-400 mb-1">
                      {formatTime(msg.createdAt)}
                    </span>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                      {msg.messageType === "video_call" ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                      {msg.callDetails?.status === "completed" ? (
                        <>
                          {isMyMessage ? (
                            <PhoneOutgoing className="w-4 h-4 text-green-600" />
                          ) : (
                            <PhoneIncoming className="w-4 h-4 text-blue-600" />
                          )}
                          <span>
                            {msg.messageType === "video_call"
                              ? "Video"
                              : "Audio"}{" "}
                            call (
                            {Math.floor((msg.callDetails?.duration || 0) / 60)}:
                            {((msg.callDetails?.duration || 0) % 60)
                              .toString()
                              .padStart(2, "0")}
                            )
                          </span>
                        </>
                      ) : (
                        <>
                          {isMyMessage ? (
                            <PhoneOutgoing className="w-4 h-4 text-red-500" />
                          ) : (
                            <PhoneIncoming className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-red-500">
                            Missed{" "}
                            {msg.messageType === "video_call"
                              ? "video"
                              : "audio"}{" "}
                            call
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
                  <div
                    className={`flex flex-col ${
                      isMyMessage ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Preview for images or voice */}
                    {msg.messageType === "voice" ? (
                      <div className="flex items-center gap-2 mb-2">
                        <audio
                          controls
                          src={API_BASE_URL + msg.fileUrl}
                          className="h-10"
                        />
                        {typeof msg.voiceDuration === "number" && (
                          <span className="text-xs text-gray-500">
                            {Math.floor(msg.voiceDuration / 60)}:
                            {(msg.voiceDuration % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    ) : msg.fileType && msg.fileType.startsWith("image/") ? (
                      <a
                        href={API_BASE_URL + msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={API_BASE_URL + msg.fileUrl}
                          alt={msg.fileName}
                          className="max-h-60 object-contain mb-2"
                          style={{
                            background: "none",
                            boxShadow: "none",
                            padding: 0,
                            borderRadius: 0,
                          }}
                        />
                      </a>
                    ) : msg.fileType && msg.fileType.startsWith("video/") ? (
                      <video
                        controls
                        className="max-h-60 object-contain mb-2"
                        style={{
                          background: "none",
                          boxShadow: "none",
                          padding: 0,
                          borderRadius: 0,
                        }}
                      >
                        <source
                          src={API_BASE_URL + msg.fileUrl}
                          type={msg.fileType}
                        />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <a
                          href={API_BASE_URL + msg.fileUrl}
                          download={msg.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm font-medium"
                        >
                          {msg.fileName}
                        </a>
                        <span className="text-xs text-gray-400">
                          ({(msg.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(msg.createdAt)}
                    </div>
                    {/* Seen status - only show for the last sent message */}
                    {isLastMyMessage && msg.seen && (
                      <span className="text-xs text-gray-400 mt-1 mr-2">
                        Seen
                      </span>
                    )}
                  </div>
                );
              } else {
                // Regular text message
                messageContent = (
                  <div
                    className={`flex flex-col ${
                      isMyMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] sm:max-w-xs px-4 py-2 rounded-3xl break-words ${
                        isMyMessage
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                    </div>
                    {/* Seen status - only show for the last sent message */}
                    {isLastMyMessage && msg.seen && (
                      <span className="text-xs text-gray-400 mt-1 mr-2">
                        Seen
                      </span>
                    )}
                  </div>
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
                    <div className="flex justify-center my-6">
                      <span className="text-xs font-medium text-gray-600 bg-gray-200 px-4 py-1.5 rounded-full shadow-sm">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  {showTimestamp && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="flex-1">{messageContent}</div>
                    {/* Message Menu */}
                    {!isCallMessage && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setMessageMenuOpen(
                              messageMenuOpen === msg._id ? null : msg._id
                            )
                          }
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-full transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {messageMenuOpen === msg._id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMessageMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px] z-20">
                              {msg.pinned ? (
                                <button
                                  onClick={() => handleUnpin(msg)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <PinOff className="w-4 h-4" />
                                  Unpin Message
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePinClick(msg)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Pin className="w-4 h-4" />
                                  Pin Message
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">
                Send a message to start the conversation
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Typing indicator - Fixed position above input */}
      {isTyping && (
        <div className="border-t border-gray-200 bg-white px-6 py-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            <span
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            />
            <span className="text-xs text-gray-500 ml-1">Typing...</span>
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
