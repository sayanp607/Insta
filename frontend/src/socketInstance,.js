// socketInstance.js
import { io } from "socket.io-client";
import { API_BASE_URL } from "./main";

let socket = null;

export const initializeSocket = (userId) => {
  socket = io(API_BASE_URL, {
    query: {
      userId,
    },
    transports: ["websocket"],
    withCredentials: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
