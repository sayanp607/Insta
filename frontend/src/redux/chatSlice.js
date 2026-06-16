import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
    name:"chat",
    initialState:{
        onlineUsers:[],
        messages:[],
        unreadMessages: {}, // { userId: count }
        replyingTo: null, // The message being replied to
    },
    reducers:{
        // actions
        setOnlineUsers:(state,action) => {
            state.onlineUsers = action.payload;
        },
        setMessages:(state,action) => {
            state.messages = action.payload;
        },
        addUnreadMessage:(state, action) => {
            const { userId } = action.payload;
            if (!state.unreadMessages) {
                state.unreadMessages = {};
            }
            state.unreadMessages[userId] = (state.unreadMessages[userId] || 0) + 1;
            console.log('Added unread message from user:', userId);
            console.log('Updated unreadMessages:', state.unreadMessages);
        },
        markMessagesAsRead:(state, action) => {
            const userId = action.payload;
            if (!state.unreadMessages) {
                state.unreadMessages = {};
                return;
            }
            delete state.unreadMessages[userId];
            console.log('Marked messages as read for user:', userId);
            console.log('Updated unreadMessages:', state.unreadMessages);
        },
        clearUnreadMessages:(state) => {
            state.unreadMessages = {};
        },
        setReplyingTo:(state, action) => {
            state.replyingTo = action.payload;
        },
        updateMessageReactions:(state, action) => {
            const { messageId, reactions } = action.payload;
            const message = state.messages.find(m => m._id === messageId);
            if (message) {
                message.reactions = reactions;
            }
        }
    }
});
export const {
    setOnlineUsers, 
    setMessages, 
    addUnreadMessage, 
    markMessagesAsRead,
    clearUnreadMessages,
    setReplyingTo,
    updateMessageReactions
} = chatSlice.actions;
export default chatSlice.reducer;