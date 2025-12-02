// useGetRTM.js
import { setMessages } from "@/redux/chatSlice";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../socketInstance,";
import axios from "axios";
import { API_BASE_URL } from "@/main";

const useGetRTM = () => {
  const dispatch = useDispatch();
  const { messages } = useSelector((store) => store.chat);
  const { selectedUser, user } = useSelector((store) => store.auth);
  const socket = getSocket();

  // Use refs to always have access to latest values
  const messagesRef = useRef(messages);
  const selectedUserRef = useRef(selectedUser);
  const userRef = useRef(user);

  // Update refs whenever values change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    console.log("Socket connected, setting up listeners");

    const handleNewMessage = async (newMessage) => {
      console.log("=== handleNewMessage triggered ===");
      console.log("New message received:", newMessage);

      const currentMessages = messagesRef.current;
      const currentSelectedUser = selectedUserRef.current;

      console.log("Current selected user:", currentSelectedUser);
      console.log("Message senderId:", newMessage.senderId);
      console.log("Selected user ID:", currentSelectedUser?._id);

      dispatch(setMessages([...currentMessages, newMessage]));

      // If the message is from the currently selected user in an active chat, mark it as seen immediately
      if (
        currentSelectedUser &&
        newMessage.senderId === currentSelectedUser._id
      ) {
        console.log(
          "✓ Condition met: New message from active chat user, marking as seen"
        );
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/v1/message/mark-seen`,
            { senderId: currentSelectedUser._id },
            {
              headers: {
                "Content-Type": "application/json",
              },
              withCredentials: true,
            }
          );
          console.log("✓ Message marked as seen in real-time:", response.data);
        } catch (error) {
          console.error("✗ Failed to mark message as seen:", error);
        }
      } else {
        console.log("✗ Condition NOT met:");
        console.log("  - Has selected user:", !!currentSelectedUser);
        console.log(
          "  - SenderId matches:",
          newMessage.senderId === currentSelectedUser?._id
        );
      }
    };

    const handleMessagePinned = (pinnedMessage) => {
      const currentMessages = messagesRef.current;
      const updatedMessages = currentMessages.map((msg) =>
        msg._id === pinnedMessage._id ? pinnedMessage : msg
      );
      dispatch(setMessages(updatedMessages));
    };

    const handleMessageUnpinned = (unpinnedMessage) => {
      const currentMessages = messagesRef.current;
      const updatedMessages = currentMessages.map((msg) =>
        msg._id === unpinnedMessage._id ? unpinnedMessage : msg
      );
      dispatch(setMessages(updatedMessages));
    };

    const handleMessagesSeen = ({ receiverId, count }) => {
      console.log("=== messagesSeen event received ===");
      console.log("Messages seen by receiverId:", receiverId);
      console.log("Count from backend:", count);

      const currentMessages = messagesRef.current;
      const currentUser = userRef.current;

      console.log("Current user ID:", currentUser?._id);
      console.log("Current messages count:", currentMessages.length);

      // Log all messages for debugging
      currentMessages.forEach((msg, idx) => {
        const msgSenderId =
          typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
        const msgReceiverId =
          typeof msg.receiverId === "object"
            ? msg.receiverId?._id
            : msg.receiverId;
        console.log(
          `Message ${idx}: id=${msg._id}, senderId=${msgSenderId}, receiverId=${msgReceiverId}, seen=${msg.seen}`
        );
      });

      // Get current messages from ref and update them
      const updatedMessages = currentMessages.map((msg) => {
        // Get the actual IDs (handling both direct IDs and populated objects)
        const msgSenderId =
          typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
        const msgReceiverId =
          typeof msg.receiverId === "object"
            ? msg.receiverId?._id
            : msg.receiverId;
        const currentUserId = currentUser?._id;

        // Check if this message was sent by me (current user) to the receiver who saw it
        const isSentByMe = msgSenderId === currentUserId;
        const isToReceiver = msgReceiverId === receiverId;

        if (isSentByMe && isToReceiver && !msg.seen) {
          console.log("✓ Marking message as seen:", msg._id);
          return { ...msg, seen: true, seenAt: new Date().toISOString() };
        }
        return msg;
      });

      const changedCount = updatedMessages.filter(
        (msg, i) => msg.seen !== currentMessages[i].seen
      ).length;
      console.log(`Updated ${changedCount} messages to seen status`);

      if (changedCount > 0) {
        console.log("Dispatching updated messages to Redux");
        dispatch(setMessages(updatedMessages));
      } else {
        console.log(
          "No messages updated - checking if messages match criteria"
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagePinned", handleMessagePinned);
    socket.on("messageUnpinned", handleMessageUnpinned);
    socket.on("messagesSeen", handleMessagesSeen);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagePinned", handleMessagePinned);
      socket.off("messageUnpinned", handleMessageUnpinned);
      socket.off("messagesSeen", handleMessagesSeen);
    };
  }, [socket, dispatch]);
};

export default useGetRTM;
