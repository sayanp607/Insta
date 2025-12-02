import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authSlice from "./authSlice.js";
import postSlice from "./postSlice.js";
import chatSlice from "./chatSlice.js";
import rtnSlice from "./rtnSlice.js";
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'

const persistConfig = {
  key: 'root',
  version: 3, // Increment version to trigger migration
  storage,
  migrate: (state) => {
    // Ensure allNotifications exists in persisted state
    if (state && state.realTimeNotification && !state.realTimeNotification.allNotifications) {
      state.realTimeNotification.allNotifications = [];
    }
    // Ensure unreadMessages exists in chat state
    if (state && state.chat && state.chat.unreadMessages === undefined) {
      state.chat.unreadMessages = {};
    }
    return Promise.resolve(state);
  }
}


const rootReducer = combineReducers({
  auth: authSlice,
  post: postSlice,
  chat: chatSlice,
  realTimeNotification: rtnSlice
});

const persistedReducer = persistReducer(persistConfig, rootReducer)
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

// Make store accessible globally for socket listeners
if (typeof window !== 'undefined') {
  window.__REDUX_STORE__ = store;
}

export default store;