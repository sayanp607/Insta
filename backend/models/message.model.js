import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    },
  },
  messageType: {
    type: String,
    enum: ['text', 'video_call', 'audio_call', 'file', 'voice'],
    default: 'text',
  },

  // File message fields
  fileName: {
    type: String,
    required: function() {
      return this.messageType === 'file' || this.messageType === 'voice';
    },
  },
  fileUrl: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  fileType: {
    type: String,
  },
  voiceDuration: {
    type: Number, // in seconds
  },
  callDetails: {
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'rejected', 'cancelled'],
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
    },
  },
  seen: {
    type: Boolean,
    default: false,
  },
  seenAt: {
    type: Date,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  pinnedAt: {
    type: Date,
  },
  pinnedUntil: {
    type: Date,
  },
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);
