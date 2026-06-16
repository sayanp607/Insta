import { Highlight } from "../models/highlight.model.js";
import { Story } from "../models/story.model.js";

export const createHighlight = async (req, res) => {
    try {
        const { name, storyIds } = req.body;
        const authorId = req.id;

        if (!storyIds || storyIds.length === 0) {
            return res.status(400).json({ message: "At least one story is required", success: false });
        }

        // Get the first story's mediaUrl as default cover if not provided
        const firstStory = await Story.findById(storyIds[0]);
        const cover = firstStory ? firstStory.mediaUrl : null;

        const highlight = await Highlight.create({
            author: authorId,
            name: name || 'Highlight',
            stories: storyIds,
            cover: cover
        });

        // Make these stories permanent by removing expiration
        await Story.updateMany({ _id: { $in: storyIds } }, { $unset: { expiresAt: "" } });

        return res.status(201).json({
            message: "Highlight created!",
            highlight,
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getUserHighlights = async (req, res) => {
    try {
        const userId = req.params.userId;
        const highlights = await Highlight.find({ author: userId })
            .populate('stories')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            highlights,
            success: true
        });

    } catch (error) {
        return res.status(500).json({ success: false });
    }
};

export const addStoryToExistingHighlight = async (req, res) => {
    try {
        const { highlightId, storyId } = req.body;
        const highlight = await Highlight.findById(highlightId);
        
        if (!highlight) return res.status(404).json({ message: "Highlight not found", success: false });
        
        if (!highlight.stories.includes(storyId)) {
            highlight.stories.push(storyId);
            await highlight.save();
            
            // Make the story permanent
            await Story.findByIdAndUpdate(storyId, { $unset: { expiresAt: "" } });
        }

        return res.status(200).json({
            message: "Added to highlight!",
            success: true
        });
    } catch (error) {
        return res.status(500).json({ success: false });
    }
};
