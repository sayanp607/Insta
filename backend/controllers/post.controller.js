import sharp from "sharp";
import { sendNotificationEvent } from "../config/kafka.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const addNewPost = async (req, res) => {
  try {
    const { caption, song, songStart } = req.body;
    const media = req.file;
    const authorId = req.id;

    if (!media) return res.status(400).json({ message: "Media required" });

    const isVideo = media.mimetype.startsWith("video/");
    let cloudResponse;

    if (isVideo) {
      // For videos, we use a different upload approach
      const fileUri = `data:${media.mimetype};base64,${media.buffer.toString("base64")}`;
      cloudResponse = await cloudinary.uploader.upload(fileUri, {
        resource_type: "video",
        folder: "instagram_reels"
      });
    } else {
      // image upload
      const optimizedImageBuffer = await sharp(media.buffer)
        .resize({ width: 1080, height: 1080, fit: "inside" })
        .toFormat("webp", { quality: 80 })
        .toBuffer();

      const fileUri = `data:image/webp;base64,${optimizedImageBuffer.toString("base64")}`;
      cloudResponse = await cloudinary.uploader.upload(fileUri);
    }
    
    // Parse song from string if it was sent as JSON string in FormData
    let parsedSong = song;
    if (typeof song === 'string' && song !== "undefined") {
      try {
        parsedSong = JSON.parse(song);
      } catch (e) {
        console.error("Failed to parse song JSON:", e);
      }
    }

    const post = await Post.create({
      caption,
      image: cloudResponse.secure_url,
      mediaType: isVideo ? "video" : "image",
      author: authorId,
      song: parsedSong,
      songStart: songStart ? Number(songStart) : 0,
    });
    
    const user = await User.findById(authorId);
    if (user) {
      user.posts.push(post._id);
      await user.save();
    }

    // AI Auto-Tagging (runs async, doesn't block response)
    if (!isVideo && process.env.OPENAI_API_KEY) {
      autoTagPost(post._id, cloudResponse.secure_url).catch(err => 
        console.log("Auto-tag background error:", err.message)
      );
    }

    await post.populate({ path: "author", select: "-password" });

    return res.status(201).json({
      message: "New post added",
      post,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getReelsPost = async (req, res) => {
  try {
    const posts = await Post.find({ mediaType: "video" })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: [
          { path: "author", select: "username profilePicture" },
          { 
            path: "replies", 
            populate: [
              { path: "author", select: "username profilePicture" },
              {
                path: "replies",
                populate: { path: "author", select: "username profilePicture" }
              }
            ] 
          }
        ],
      });
    return res.status(200).json({ posts, success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const getAllPost = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: [
          { path: "author", select: "username profilePicture" },
          { 
            path: "replies", 
            populate: [
              { path: "author", select: "username profilePicture" },
              {
                path: "replies",
                populate: { path: "author", select: "username profilePicture" }
              }
            ] 
          }
        ],
      });
    
    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};
export const getUserPost = async (req, res) => {
  try {
    const authorId = req.id;
    const posts = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: [
          { path: "author", select: "username profilePicture" },
          { 
            path: "replies", 
            populate: [
              { path: "author", select: "username profilePicture" },
              {
                path: "replies",
                populate: { path: "author", select: "username profilePicture" }
              }
            ] 
          }
        ],
      });
    return res.status(200).json({ posts, success: true });
  } catch (error) {
    console.log(error);
  }
};
export const getExplorePost = async (req, res) => {
  try {
    const userId = req.id;
    const publicUsers = await User.find({ isPrivate: false, _id: { $ne: userId } }).select('_id');
    const publicUserIds = publicUsers.map(u => u._id);

    const posts = await Post.find({ author: { $in: publicUserIds } })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture isPrivate" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: [
          { path: "author", select: "username profilePicture" },
          { 
            path: "replies", 
            populate: [
              { path: "author", select: "username profilePicture" },
              {
                path: "replies",
                populate: { path: "author", select: "username profilePicture" }
              }
            ] 
          }
        ],
      });
    return res.status(200).json({ posts, success: true });
  } catch (error) {
    console.log(error);
  }
};
export const likePost = async (req, res) => {
  try {
    const likeKrneWalaUserKiId = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    // like logic started
    await post.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });
    await post.save();

    // implement socket io for real time notification
    const user = await User.findById(likeKrneWalaUserKiId).select(
      "username profilePicture"
    );

    const postOwnerId = post.author.toString();
    if (postOwnerId !== likeKrneWalaUserKiId) {
      await sendNotificationEvent('LIKE', {
        receiver: postOwnerId,
        sender: likeKrneWalaUserKiId,
        type: 'like',
        post: postId,
        message: "liked your post"
      });
    }

    return res.status(200).json({ message: "Post liked", success: true });
  } catch (error) {}
};
export const dislikePost = async (req, res) => {
  try {
    const likeKrneWalaUserKiId = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    // like logic started
    await post.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
    await post.save();

    // implement socket io for real time notification
    const user = await User.findById(likeKrneWalaUserKiId).select(
      "username profilePicture"
    );
    const postOwnerId = post.author.toString();
    if (postOwnerId !== likeKrneWalaUserKiId) {
      // emit a notification event
      const notification = {
        type: "dislike",
        userId: likeKrneWalaUserKiId,
        userDetails: user,
        postId,
        message: "Your post was liked",
      };
      const postOwnerSocketId = getReceiverSocketId(postOwnerId);
      io.to(postOwnerSocketId).emit("notification", notification);
    }

    return res.status(200).json({ message: "Post disliked", success: true });
  } catch (error) {}
};
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const commentKrneWalaUserKiId = req.id;

    const { text } = req.body;

    const post = await Post.findById(postId).populate('author', '_id');

    if (!text)
      return res
        .status(400)
        .json({ message: "text is required", success: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    const comment = await Comment.create({
      text,
      author: commentKrneWalaUserKiId,
      post: postId,
    });

    await comment.populate({
      path: "author",
      select: "username profilePicture",
    });

    post.comments.push(comment._id);
    await post.save();

    // Send notification to post author
    const postAuthor = post.author._id.toString();
    const commenterIdStr = commentKrneWalaUserKiId.toString();
    
    console.log('Post Author ID:', postAuthor);
    console.log('Commenter ID:', commenterIdStr);
    console.log('Are they different?', postAuthor !== commenterIdStr);
    
    // Use Kafka for async notification delivery
    if (postAuthor !== commenterIdStr) {
      await sendNotificationEvent('COMMENT', {
        receiver: postAuthor,
        sender: commentKrneWalaUserKiId,
        type: 'comment',
        post: postId,
        comment: comment._id,
        message: 'commented on your post'
      });
    } else {
      console.log('Commenter is the post author, no notification sent');
    }

    return res.status(201).json({
      message: "Comment Added",
      comment,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getCommentsOfPost = async (req, res) => {
  try {
    const postId = req.params.id;
    // Fetch all comments belonging to this post
    const comments = await Comment.find({ post: postId })
      .populate("author", "username profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      comments
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to fetch comments", success: false });
  }
};
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    // check if the logged-in user is the owner of the post
    if (post.author.toString() !== authorId)
      return res.status(403).json({ message: "Unauthorized" });

    // delete post
    await Post.findByIdAndDelete(postId);

    // remove the post id from the user's post
    let user = await User.findById(authorId);
    user.posts = user.posts.filter((id) => id.toString() !== postId);
    await user.save();

    // delete associated comments
    await Comment.deleteMany({ post: postId });

    return res.status(200).json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    console.log(error);
  }
};
export const bookmarkPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    const user = await User.findById(authorId);
    if (user.bookmarks.includes(post._id)) {
      // already bookmarked -> remove from the bookmark
      await user.updateOne({ $pull: { bookmarks: post._id } });
      await user.save();
      return res
        .status(200)
        .json({
          type: "unsaved",
          message: "Post removed from bookmark",
          success: true,
        });
    } else {
      // bookmark krna pdega
      await user.updateOne({ $addToSet: { bookmarks: post._id } });
      await user.save();
      return res
        .status(200)
        .json({ type: "saved", message: "Post bookmarked", success: true });
    }
  } catch (error) {
    console.log(error);
  }
};

export const generateAIContent = async (req, res) => {
  try {
    const image = req.file;
    if (!image) return res.status(400).json({ message: "Image required for AI analysis", success: false });

    // Convert image buffer to base64 for OpenAI Vision
    const base64Image = image.buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image and suggest 3 creative, short Instagram captions with relevant hashtags. Format the response as a JSON array of objects, each with 'text' and 'hashtags' fields." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(response.choices[0].message.content);
    
    // Some models might return the array directly or inside a key
    const suggestions = content.suggestions || content.captions || Object.values(content)[0];

    return res.status(200).json({
      success: true,
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : []
    });
  } catch (error) {
    console.log("OpenAI Error:", error);
    return res.status(500).json({ message: "AI generation failed", success: false });
  }
};

export const likeComment = async (req, res) => {
  try {
    const userId = req.id;
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId).populate('author', '_id');
    if (!comment) return res.status(404).json({ message: "Comment not found", success: false });
    
    await comment.updateOne({ $addToSet: { likes: userId } });

    // Notification logic
    const commentOwnerId = comment.author._id.toString();
    if (commentOwnerId !== userId) {
      const notification = await Notification.create({
        receiver: commentOwnerId,
        sender: userId,
        type: 'like',
        post: comment.post,
        message: 'liked your comment'
      });

      const commentOwnerSocketId = getReceiverSocketId(commentOwnerId);
      if (commentOwnerSocketId) {
        const populatedNotification = await Notification.findById(notification._id).populate('sender', 'username profilePicture');
        io.to(commentOwnerSocketId).emit('notification', populatedNotification);
      }
    }

    return res.status(200).json({ message: "Comment liked", success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false });
  }
};

export const dislikeComment = async (req, res) => {
  try {
    const userId = req.id;
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found", success: false });
    
    await comment.updateOne({ $pull: { likes: userId } });
    return res.status(200).json({ message: "Comment disliked", success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false });
  }
};

export const addReply = async (req, res) => {
  try {
    const userId = req.id;
    const commentId = req.params.id;
    const { text } = req.body;
    
    const parentComment = await Comment.findById(commentId).populate('author', 'username profilePicture');
    if (!parentComment) return res.status(404).json({ message: "Comment not found", success: false });

    const reply = await Comment.create({
      text,
      author: userId,
      post: parentComment.post,
    });

    await reply.populate("author", "username profilePicture");
    
    parentComment.replies.push(reply._id);
    await parentComment.save();

    // Notification logic
    const commentOwnerId = parentComment.author._id.toString();
    if (commentOwnerId !== userId) {
      const notification = await Notification.create({
        receiver: commentOwnerId,
        sender: userId,
        type: 'comment', 
        post: parentComment.post,
        comment: reply._id,
        message: 'replied to your comment'
      });

      const commentOwnerSocketId = getReceiverSocketId(commentOwnerId);
      if (commentOwnerSocketId) {
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'username profilePicture')
          .populate('post', 'image mediaType');
        io.to(commentOwnerSocketId).emit('notification', populatedNotification);
      }
    }

    return res.status(201).json({ message: "Reply added", success: true, reply });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false });
  }
};

export const translateComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text required", success: false });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a translator. Translate the given Instagram comment to English. Only provide the translated text, nothing else."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    const translatedText = response.choices[0].message.content;

    return res.status(200).json({
      success: true,
      translatedText
    });
  } catch (error) {
    console.log("Translation Error:", error);
    return res.status(500).json({ message: "Translation failed", success: false });
  }
};

// ============================================================
// GEN AI FEATURES
// ============================================================

/**
 * AI Auto-Tagging (Background Process)
 * Called after post creation — sends the image to OpenAI Vision
 * to extract semantic tags like "sunset", "beach", "food", etc.
 * These tags power search and ML-based recommendations later.
 */
const autoTagPost = async (postId, imageUrl) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this image and return a JSON object with a single key 'tags' containing an array of 5-10 single-word lowercase tags that describe the content, mood, objects, colors, and setting of this image. Example: {\"tags\": [\"sunset\", \"beach\", \"golden\", \"peaceful\", \"ocean\"]}" 
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(response.choices[0].message.content);
    const tags = content.tags || [];

    if (tags.length > 0) {
      await Post.findByIdAndUpdate(postId, { aiTags: tags });
      console.log(`✨ Auto-tagged post ${postId} with: [${tags.join(", ")}]`);
    }
  } catch (error) {
    console.log("Auto-tagging error:", error.message);
  }
};

/**
 * Smart Reply Suggestions (Gen AI)
 * Takes the last few messages from a conversation and suggests
 * 3 short, contextual quick-replies using GPT.
 */
// Conversation and Message imported at top of file

export const getSmartReplies = async (req, res) => {
  try {
    const userId = req.id;
    const { conversationUserId } = req.params;

    // Get the conversation between these two users
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, conversationUserId] },
    }).populate({
      path: "messages",
      options: { sort: { createdAt: -1 }, limit: 8 },
      populate: { path: "senderId", select: "username" }
    });

    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      return res.status(200).json({
        success: true,
        replies: ["Hey! 👋", "What's up?", "How are you? 😊"]
      });
    }

    // Build conversation context for GPT
    const recentMessages = conversation.messages
      .reverse()
      .filter(m => m.message) // Only text messages
      .slice(-5)
      .map(m => `${m.senderId?.username || "User"}: ${m.message}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a smart reply suggestion engine for an Instagram-like chat app. 
Given the recent conversation, suggest exactly 3 short, casual, contextually appropriate replies that the current user could send next.
Keep each reply under 6 words. Use emojis when natural. Match the conversation's tone and language.
Return a JSON object with a key "replies" containing an array of 3 strings.
Example: {"replies": ["Sounds great! 🔥", "I'm down!", "Let me check 😄"]}`
        },
        {
          role: "user",
          content: `Recent conversation:\n${recentMessages}\n\nSuggest 3 quick replies for the user.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(response.choices[0].message.content);
    const replies = content.replies || ["Sure!", "Got it 👍", "Nice! 🔥"];

    return res.status(200).json({
      success: true,
      replies: replies.slice(0, 3)
    });
  } catch (error) {
    console.log("Smart Reply Error:", error);
    return res.status(200).json({
      success: true,
      replies: ["Sure!", "Got it 👍", "Nice! 🔥"]
    });
  }
};
