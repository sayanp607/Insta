// Voice message upload controller
export const sendVoiceMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const file = req.file;
    // Accept voiceDuration from form-data (as string, convert to number)
    const voiceDuration = req.body.voiceDuration ? Number(req.body.voiceDuration) : undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: "No audio uploaded" });
    }

    // Enforce daily voice message send limit (10 per user per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sentToday = await Message.countDocuments({
      senderId,
      messageType: "voice",
      createdAt: { $gte: today },
    });
    if (sentToday >= 10) {
      return res.status(429).json({ success: false, message: "Daily voice message limit reached (10 per day)" });
    }

    // Save audio file to disk (uploads/voice/)
    const uploadsDir = path.join("uploads", "voice");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = Date.now() + "_" + file.originalname;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Save voice message
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }
    const voiceMessage = await Message.create({
      senderId,
      receiverId,
      messageType: "voice",
      fileName: file.originalname,
      fileUrl: `/api/v1/message/voice/${fileName}`,
      fileSize: file.size,
      fileType: file.mimetype,
      voiceDuration,
    });
    if (voiceMessage) conversation.messages.push(voiceMessage._id);
    await Promise.all([conversation.save(), voiceMessage.save()]);

    // Emit to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", voiceMessage);
    }

    return res.status(201).json({ success: true, newMessage: voiceMessage });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Voice message upload failed" });
  }
};

// Voice message download controller
export const downloadVoice = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join("uploads", "voice", fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Voice file not found" });
  }
  res.download(filePath, fileName, (err) => {
    if (err) {
      if (err.status === 416) { // 416 = Range Not Satisfiable
        return res.status(416).json({ success: false, message: "Requested range not satisfiable" });
      }
      return res.status(500).json({ success: false, message: "Failed to download voice file" });
    }
  });
};
// File sharing controller
import path from "path";
import fs from "fs";

export const sendFileMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Enforce daily file send limit (10 per user per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sentToday = await Message.countDocuments({
      senderId,
      messageType: "file",
      createdAt: { $gte: today },
    });
    if (sentToday >= 10) {
      return res.status(429).json({ success: false, message: "Daily file send limit reached (10 files per day)" });
    }

    // Save file to disk (uploads/chat/)
    const uploadsDir = path.join("uploads", "chat");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = Date.now() + "_" + file.originalname;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Save file message
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }
    const fileMessage = await Message.create({
      senderId,
      receiverId,
      messageType: "file",
      fileName: file.originalname,
      fileUrl: `/api/v1/message/file/${fileName}`,
      fileSize: file.size,
      fileType: file.mimetype,
    });
    if (fileMessage) conversation.messages.push(fileMessage._id);
    await Promise.all([conversation.save(), fileMessage.save()]);

    // Emit to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", fileMessage);
    }

    return res.status(201).json({ success: true, newMessage: fileMessage });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "File upload failed" });
  }
};

// File download controller
export const downloadFile = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join("uploads", "chat", fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }
  res.download(filePath, fileName, (err) => {
    if (err) {
      if (err.status === 416) { // 416 = Range Not Satisfiable
        return res.status(416).json({ success: false, message: "Requested range not satisfiable" });
      }
      return res.status(500).json({ success: false, message: "Failed to download file" });
    }
  });
};
import { Conversation } from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { Message } from "../models/message.model.js";
// for chatting
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { textMessage: message } = req.body;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });
    // establish the conversation if not started yet.
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
    });
    if (newMessage) conversation.messages.push(newMessage._id);

    await Promise.all([conversation.save(), newMessage.save()]);

    // implement socket io for real time data transfer
    const receiverSocketId = getReceiverSocketId(receiverId);
    console.log('Sending message to receiver:', receiverId);
    console.log('Receiver socket ID:', receiverSocketId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      console.log('Message emitted to socket:', receiverSocketId);
    } else {
      console.log('Receiver is offline or socket not found');
    }

    return res.status(201).json({
      success: true,
      newMessage,
    });
  } catch (error) {
    console.log(error);
  }
};
export const getMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate("messages");
    if (!conversation)
      return res.status(200).json({ success: true, messages: [] });

    return res
      .status(200)
      .json({ success: true, messages: conversation?.messages });
  } catch (error) {
    console.log(error);
  }
};

// Save call history
export const saveCallHistory = async (req, res) => {
  try {
    const senderId = req.id;
    const { receiverId, duration, status, callType } = req.body;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    // establish the conversation if not started yet.
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    const callMessage = await Message.create({
      senderId,
      receiverId,
      messageType: callType === 'video' ? 'video_call' : 'audio_call',
      message: `${callType} call`,
      callDetails: {
        duration,
        status,
        callType,
      },
    });

    if (callMessage) conversation.messages.push(callMessage._id);
    await Promise.all([conversation.save(), callMessage.save()]);

    // Emit to both users
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", callMessage);
    }
    
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", callMessage);
    }

    return res.status(201).json({
      success: true,
      message: callMessage,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to save call history",
    });
  }
};

// Mark messages as seen
export const markMessagesAsSeen = async (req, res) => {
  try {
    const currentUserId = req.id;
    const { senderId } = req.body;

    // Update all unseen messages from senderId to currentUserId as seen
    const result = await Message.updateMany(
      {
        senderId: senderId,
        receiverId: currentUserId,
        seen: false,
      },
      {
        $set: {
          seen: true,
          seenAt: new Date(),
        },
      }
    );

    // Emit to sender that messages have been seen
    const senderSocketId = getReceiverSocketId(senderId);
    console.log("=== Mark Messages As Seen ===");
    console.log("Sender ID:", senderId);
    console.log("Receiver ID (who saw the messages):", currentUserId);
    console.log("Sender socket ID:", senderSocketId);
    console.log("Messages marked as seen:", result.modifiedCount);
    
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", {
        receiverId: currentUserId,
        count: result.modifiedCount,
      });
      console.log("messagesSeen event emitted to sender");
    } else {
      console.log("Sender is not online, skipping socket emission");
    }

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as seen",
    });
  }
};

// Pin message
export const pinMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { messageId, days } = req.body;

    if (!messageId || !days) {
      return res.status(400).json({
        success: false,
        message: "Message ID and days are required",
      });
    }

    if (![7, 15, 30].includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Days must be 7, 15, or 30",
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only sender or receiver can pin
    if (message.senderId.toString() !== userId && message.receiverId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to pin this message",
      });
    }

    const pinnedUntil = new Date();
    pinnedUntil.setDate(pinnedUntil.getDate() + days);

    message.pinned = true;
    message.pinnedBy = userId;
    message.pinnedAt = new Date();
    message.pinnedUntil = pinnedUntil;
    await message.save();

    // Emit to both users
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messagePinned", message);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagePinned", message);
    }

    return res.status(200).json({
      success: true,
      message: "Message pinned successfully",
      pinnedMessage: message,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to pin message",
    });
  }
};

// Unpin message
export const unpinMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: "Message ID is required",
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only sender or receiver can unpin
    if (message.senderId.toString() !== userId && message.receiverId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to unpin this message",
      });
    }

    message.pinned = false;
    message.pinnedBy = null;
    message.pinnedAt = null;
    message.pinnedUntil = null;
    await message.save();

    // Emit to both users
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageUnpinned", message);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageUnpinned", message);
    }

    return res.status(200).json({
      success: true,
      message: "Message unpinned successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to unpin message",
    });
  }
};
