import { Server } from "socket.io";
import express from "express";
import http from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://insta-frontend-ehjp.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Setup Redis Adapter for multi-process scalability (PAUSED)
/*
const pubClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT)
    }
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.io Redis Adapter connected");
}).catch(err => {
    console.error("Socket.io Redis Adapter error:", err);
});
*/

const userSocketMap = {} ;// this map stores socket id corresponding the user id; userId -> socketId

export const getReceiverSocketId = (receiverId) => userSocketMap[receiverId];

io.on('connection', (socket)=>{
  const userId = socket.handshake.query.userId;
  if(userId){
    userSocketMap[userId] = socket.id;
    socket.join(`user:${userId}`); // Join private room for notifications
    console.log(`user connected : userid= ${userId}, socketid = ${socket.id}, joined room user:${userId}`);
  }

  io.emit('getOnlineUsers', Object.keys(userSocketMap));

  // WebRTC Video Call Signaling
  socket.on('call:initiate', ({ to, offer, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:incoming', { from, offer });
    }
  });

  socket.on('call:accept', ({ to, answer, from }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:accepted', { answer, from });
    }
    if (from) {
      const receiverSocketId = getReceiverSocketId(from);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:accepted', { answer, from });
      }
    }
  });

  socket.on('call:reject', ({ to }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:rejected');
    }
  });

  socket.on('call:end', ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:ended');
    }
  });

  socket.on('ice:candidate', ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('ice:candidate', { candidate });
    }
  });

  // Audio Call Signaling
  socket.on('audio_call:initiate', ({ to, offer, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('audio_call:incoming', { from, offer });
    }
  });

  // Typing indicator events
  socket.on('typing', ({ to, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { from });
    }
  });

  socket.on('stop typing', ({ to, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('stop typing', { from });
    }
  });

  socket.on('audio_call:accept', ({ to, answer, from }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('audio_call:accepted', { answer, from });
    }
    if (from) {
      const receiverSocketId = getReceiverSocketId(from);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('audio_call:accepted', { answer, from });
      }
    }
  });

  socket.on('audio_call:reject', ({ to }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('audio_call:rejected');
    }
  });

  socket.on('audio_call:end', ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('audio_call:ended');
    }
  });

  socket.on('disconnect', ()=>{
    if(userId){
      delete userSocketMap[userId];
      console.log(`user disconnected : userid= ${userId}, socketid = ${socket.id}`);
    }
    io.emit ('getOnlineUsers',Object.keys(userSocketMap))
  })
})

export{app,server,io};