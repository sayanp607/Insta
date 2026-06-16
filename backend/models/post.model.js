import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
  caption: { type: String, default: "" },
  image: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  mediaType: { type: String, enum: ["image", "video"], default: "image" },
  song: {
    title: { type: String },
    artist: { type: String },
    url: { type: String },
    thumbnail: { type: String },
  },
  songStart: { type: Number, default: 0 },
  aiTags: [{ type: String }],
}, { timestamps: true });
export const Post = mongoose.model("Post", postSchema);
