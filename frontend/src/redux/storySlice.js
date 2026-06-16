import { createSlice } from "@reduxjs/toolkit";

const storySlice = createSlice({
    name: 'story',
    initialState: {
        stories: [], // Array of grouped stories [{author, stories: []}]
    },
    reducers: {
        setStories: (state, action) => {
            state.stories = action.payload;
        },
        addStoryToAuthor: (state, action) => {
            const newStory = action.payload;
            const authorId = newStory.author._id;
            const existingAuthorIndex = state.stories.findIndex(group => group.author._id === authorId);
            
            if (existingAuthorIndex !== -1) {
                // Add to existing group
                state.stories[existingAuthorIndex].stories.push(newStory);
            } else {
                // Create new group
                state.stories.unshift({
                    author: newStory.author,
                    stories: [newStory]
                });
            }
        },
        likeStory: (state, action) => {
            const { storyId, userId } = action.payload;
            state.stories.forEach(group => {
                const story = group.stories.find(s => s._id === storyId);
                if (story) {
                    if (!story.likes) story.likes = [];
                    if (story.likes.includes(userId)) {
                        story.likes = story.likes.filter(id => id !== userId);
                    } else {
                        story.likes.push(userId);
                    }
                }
            });
        },
        markStoryAsViewed: (state, action) => {
            const { storyId, userId } = action.payload;
            state.stories.forEach(group => {
                const story = group.stories.find(s => s._id === storyId);
                if (story) {
                    if (!story.viewers) story.viewers = [];
                    if (!story.viewers.includes(userId)) {
                        story.viewers.push(userId);
                    }
                }
            });
        }
    }
});

export const { setStories, addStoryToAuthor, likeStory, markStoryAsViewed } = storySlice.actions;
export default storySlice.reducer;
