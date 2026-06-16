import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    song: {
        title: String,
        artist: String,
        url: String,
        thumbnail: String
    },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { 
        type: Date, 
        required: true, 
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
        index: { expires: 0 } // TTL index: documents expire at the 'expiresAt' time
    }
}, { timestamps: true });

export const Story = mongoose.model('Story', storySchema);
