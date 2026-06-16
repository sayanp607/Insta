import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, default: 'Highlight' },
    cover: { type: String }, // URL to cover image
    stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }]
}, { timestamps: true });

export const Highlight = mongoose.model('Highlight', highlightSchema);
