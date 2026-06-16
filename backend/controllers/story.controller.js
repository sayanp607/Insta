import cloudinary from "../utils/cloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";

export const addNewStory = async (req, res) => {
    try {
        const { song } = req.body;
        const media = req.file;
        const authorId = req.id;

        if (!media) return res.status(400).json({ message: "Media required", success: false });

        // Check if it's a video or image based on mimetype
        const isVideo = media.mimetype.startsWith('video');
        const resourceType = isVideo ? 'video' : 'image';

        // Upload to cloudinary
        // For stories, we use a simple upload. If it's a video, Cloudinary handles it with resource_type
        const fileUri = `data:${media.mimetype};base64,${media.buffer.toString("base64")}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            resource_type: resourceType,
            folder: 'stories'
        });

        let parsedSong = song;
        if (typeof song === 'string' && song !== 'undefined') {
            try {
                parsedSong = JSON.parse(song);
            } catch (e) {
                console.error("Failed to parse song JSON in story:", e);
            }
        }

        const story = await Story.create({
            author: authorId,
            mediaUrl: cloudResponse.secure_url,
            mediaType: resourceType,
            song: parsedSong && typeof parsedSong === 'object' ? parsedSong : null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        await story.populate({ path: 'author', select: 'username profilePicture' });

        return res.status(201).json({
            message: "Story shared!",
            story,
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getAllStories = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        // Get stories from users the current user follows + their own stories
        const following = user.following || [];
        const authorIds = [...following, userId];

        const stories = await Story.find({ 
            author: { $in: authorIds },
            createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        })
        .sort({ createdAt: 1 })
        .populate({ path: 'author', select: 'username profilePicture' });

        // Group stories by author for the story bar
        const groupedStories = stories.reduce((acc, story) => {
            const authorId = story.author._id.toString();
            if (!acc[authorId]) {
                acc[authorId] = {
                    author: story.author,
                    stories: []
                };
            }
            acc[authorId].stories.push(story);
            return acc;
        }, {});

        return res.status(200).json({
            stories: Object.values(groupedStories),
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const viewStory = async (req, res) => {
    try {
        const storyId = req.params.id;
        const userId = req.id;
        console.log(`[viewStory] StoryID: ${storyId}, ViewerID: ${userId}`);
        const story = await Story.findByIdAndUpdate(storyId, { $addToSet: { viewers: userId } }, { new: true });
        if (!story) return res.status(404).json({ message: "Story not found", success: false });
        console.log(`[viewStory] Success. New viewers count: ${story.viewers.length}`);
        return res.status(200).json({ success: true, viewersCount: story.viewers.length });
    } catch (error) {
        console.error("[viewStory] Error:", error);
        return res.status(500).json({ success: false });
    }
};

export const likeOrUnlikeStory = async (req, res) => {
    try {
        const userId = req.id;
        const storyId = req.params.id;
        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found", success: false });

        const isLiked = story.likes.some(id => id.toString() === userId);

        if (isLiked) {
            await Story.findByIdAndUpdate(storyId, { $pull: { likes: userId } });
            return res.status(200).json({ message: 'Story unliked', success: true });
        } else {
            await Story.findByIdAndUpdate(storyId, { $addToSet: { likes: userId } });
            return res.status(200).json({ message: 'Story liked', success: true });
        }
    } catch (error) {
        console.error("[likeOrUnlikeStory] Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getStoryViewers = async (req, res) => {
    try {
        const storyId = req.params.id;
        console.log(`[getStoryViewers] Fetching for StoryID: ${storyId}`);
        const story = await Story.findById(storyId).populate({
            path: 'viewers',
            select: 'username profilePicture'
        });
        if (!story) {
            console.log(`[getStoryViewers] Story ${storyId} not found`);
            return res.status(404).json({ message: "Story not found", success: false });
        }
        console.log(`[getStoryViewers] Found ${story.viewers.length} viewers`);
        return res.status(200).json({ viewers: story.viewers, success: true });
    } catch (error) {
        console.error("[getStoryViewers] Error:", error);
        return res.status(500).json({ success: false });
    }
};
