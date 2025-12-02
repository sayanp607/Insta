import { createSlice } from "@reduxjs/toolkit";

const rtnSlice = createSlice({
  name: 'realTimeNotification',
  initialState: {
    likeNotification: [],
    commentNotification: [],
    allNotifications: [], // History of all notifications
  },
  reducers: {
    setLikeNotification: (state, action) => {
      if (action.payload.type === 'like') {
        const notification = { ...action.payload, read: false, timestamp: Date.now() };
        state.likeNotification.push(notification);
        state.allNotifications.unshift(notification); // Add to history at the beginning
      } else if (action.payload.type === 'dislike') {
        state.likeNotification = state.likeNotification.filter(
          (item) => item.userId !== action.payload.userId
        );
        // Mark as read in history instead of removing
        state.allNotifications = state.allNotifications.map(item => 
          item.userId === action.payload.userId && item.type === 'like'
            ? { ...item, read: true }
            : item
        );
      }
    },
    setCommentNotification: (state, action) => {
      const notification = { ...action.payload, read: false, timestamp: Date.now() };
      state.commentNotification.push(notification);
      state.allNotifications.unshift(notification); // Add to history at the beginning
    },
    markNotificationsAsRead: (state) => {
      // Clear unread counts but keep history
      state.likeNotification = [];
      state.commentNotification = [];
      // Mark all in history as read
      state.allNotifications = state.allNotifications.map(notif => ({ ...notif, read: true }));
    },
    clearLikeNotifications: (state) => {
      state.likeNotification = [];
    },
    clearCommentNotifications: (state) => {
      state.commentNotification = [];
    },
    clearAllNotifications: (state) => {
      state.likeNotification = [];
      state.commentNotification = [];
      state.allNotifications = [];
    }
  }
});

export const { 
  setLikeNotification, 
  setCommentNotification,
  markNotificationsAsRead,
  clearLikeNotifications,
  clearCommentNotifications,
  clearAllNotifications
} = rtnSlice.actions;
export default rtnSlice.reducer;
