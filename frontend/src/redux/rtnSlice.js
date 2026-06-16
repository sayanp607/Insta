import { createSlice } from "@reduxjs/toolkit";

const rtnSlice = createSlice({
  name: 'realTimeNotification',
  initialState: {
    likeNotification: [],
    commentNotification: [],
    allNotifications: [], // History of all notifications
    isFetched: false,
    unreadCount: 0,
  },
  reducers: {
    setNotifications: (state, action) => {
      // Handle both old format (array) and new format (object with notifications and unreadCount)
      const data = action.payload.notifications !== undefined ? action.payload.notifications : action.payload;
      const count = action.payload.unreadCount !== undefined ? action.payload.unreadCount : 0;
      
      state.allNotifications = data;
      state.unreadCount = count;
      state.isFetched = true;
      
      // Sync unread counts for specific types if needed
      state.likeNotification = data.filter(n => n.type === 'like' && !n.isRead);
      state.commentNotification = data.filter(n => n.type === 'comment' && !n.isRead);
    },
    setUnreadCount: (state, action) => {
        state.unreadCount = action.payload;
    },
    addNotification: (state, action) => {
      const newNotif = { ...action.payload, isRead: false };
      state.allNotifications.unshift(newNotif);
      if (newNotif.type === 'like') {
        state.likeNotification.push(newNotif);
      } else if (newNotif.type === 'comment') {
        state.commentNotification.push(newNotif);
      }
    },
    markNotificationsAsRead: (state) => {
      state.likeNotification = [];
      state.commentNotification = [];
      state.unreadCount = 0;
      state.allNotifications = state.allNotifications.map(notif => ({ ...notif, isRead: true }));
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
      state.isFetched = false;
    }
  }
});

export const { 
  setNotifications,
  addNotification,
  setLikeNotification, 
  setCommentNotification,
  markNotificationsAsRead,
  clearLikeNotifications,
  clearCommentNotifications,
  clearAllNotifications,
  setUnreadCount
} = rtnSlice.actions;
export default rtnSlice.reducer;
