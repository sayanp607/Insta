import {Server} from "socket.io";
import express from "express";
import http from "http";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://insta-frontend-ehjp.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

const userSocketMap = {} ;// this map stores socket id corresponding the user id; userId -> socketId

export const getReceiverSocketId = (receiverId) => userSocketMap[receiverId];

io.on('connection', (socket)=>{
  const userId = socket.handshake.query.userId;
  if(userId){
    userSocketMap[userId] = socket.id;
    console.log(`user connected : userid= ${userId}, socketid = ${socket.id}`);
  }

  io.emit('getOnlineUsers', Object.keys(userSocketMap));

  // WebRTC Video Call Signaling
  socket.on('call:initiate', ({ to, offer, from }) => {
    console.log(`Call initiated from ${from} to ${to}`);
    const receiverSocketId = getReceiverSocketId(to);
    console.log(`Receiver socket ID: ${receiverSocketId}`);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:incoming', { from, offer });
      console.log(`Emitted call:incoming to ${receiverSocketId}`);
    } else {
      console.log(`Receiver ${to} is not online`);
    }
  });

  socket.on('call:accept', ({ to, answer, from }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:accepted', { answer, from });
    }
    // Also notify the receiver (accepter) that their call was accepted
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
    console.log(`Audio call initiated from ${from} to ${to}`);
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('audio_call:incoming', { from, offer });
      console.log(`Emitted audio_call:incoming to ${receiverSocketId}`);
    } else {
      console.log(`Receiver ${to} is not online`);
    }
  });

  // Typing indicator events
  socket.on('typing', ({ to, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    console.log(`[SOCKET] Received 'typing' from ${from} to ${to}. Receiver socket: ${receiverSocketId}`);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { from });
      console.log(`[SOCKET] Emitted 'typing' to socket ${receiverSocketId}`);
    } else {
      console.log(`[SOCKET] No receiver socket found for user ${to}`);
    }
  });

  socket.on('stop typing', ({ to, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    console.log(`[SOCKET] Received 'stop typing' from ${from} to ${to}. Receiver socket: ${receiverSocketId}`);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('stop typing', { from });
      console.log(`[SOCKET] Emitted 'stop typing' to socket ${receiverSocketId}`);
    } else {
      console.log(`[SOCKET] No receiver socket found for user ${to}`);
    }
  });

  socket.on('audio_call:accept', ({ to, answer, from }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('audio_call:accepted', { answer, from });
    }
    // Also notify the receiver (accepter) that their call was accepted
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