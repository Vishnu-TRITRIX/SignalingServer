const express = require('express');
 
const http = require('http');
 
const { Server } = require('socket.io');
 
const cors = require('cors');
 
const app = express();
 
app.use(cors());
 
const server = http.createServer(app);
 
const io = new Server(server, {
 
  cors: {
 
    origin: '*',
 
    methods: ['GET', 'POST']
 
  }
 
});
 
// Store connected users: Map publicKey -> socketId
 
const users = new Map();
 
const socketToPublicKey = new Map();
 
io.on('connection', (socket) => {
 
  console.log('New client connected:', socket.id);
 
  const publicKey = socket.handshake.query.publicKey;
 
  if (publicKey) {
 
    console.log(`User registered with public key: ${publicKey}`);
 
    users.set(publicKey, socket.id);
 
    socketToPublicKey.set(socket.id, publicKey);
 
    socket.emit('registered', {
 
      socketId: socket.id,
 
      publicKey: publicKey
 
    });
 
  } else {
 
    console.log('User connected without public key');
 
    socket.disconnect();
 
    return;
 
  }
 
  // Handle offer
 
  socket.on('offer', (data) => {
 
    const { to, sdp, callType } = data;
 
    const from = socketToPublicKey.get(socket.id);
 
    console.log(`Offer from ${from} to ${to}, type: ${callType}`);
 
    const targetSocketId = users.get(to);
 
    if (targetSocketId) {
 
      io.to(targetSocketId).emit('offer', {
 
        from,
 
        sdp,
 
        callType  // ✅ Send callType to receiver
 
      });
 
    } else {
 
      socket.emit('user-not-found', { to });
 
    }
 
  });
 
  // Handle answer
 
  socket.on('answer', (data) => {
 
    const { to, sdp } = data;
 
    const from = socketToPublicKey.get(socket.id);
 
    console.log(`Answer from ${from} to ${to}`);
 
    const targetSocketId = users.get(to);
 
    if (targetSocketId) {
 
      io.to(targetSocketId).emit('answer', {
 
        from,
 
        sdp
 
      });
 
    }
 
  });
 
  // Handle ICE candidate
 
  socket.on('ice-candidate', (data) => {
 
    const { to, candidate } = data;
 
    const from = socketToPublicKey.get(socket.id);
 
    const targetSocketId = users.get(to);
 
    if (targetSocketId) {
 
      io.to(targetSocketId).emit('ice-candidate', {
 
        from,
 
        candidate
 
      });
 
    }
 
  });
 
  // Handle call rejection
 
  socket.on('call-rejected', (data) => {
 
    const { to } = data;
 
    const from = socketToPublicKey.get(socket.id);
 
    const targetSocketId = users.get(to);
 
    if (targetSocketId) {
 
      io.to(targetSocketId).emit('call-rejected', { from });
 
    }
 
  });
 
  // Handle call ended
 
  socket.on('call-ended', (data) => {
 
    const { to } = data;
 
    const from = socketToPublicKey.get(socket.id);
 
    const targetSocketId = users.get(to);
 
    if (targetSocketId) {
 
      io.to(targetSocketId).emit('call-ended', { from });
 
    }
 
  });
 
  // Request resend offer
 
  socket.on('request-offer', (data) => {
 
    const { to } = data;
 
    const from = socketToPublicKey.get(socket.id);
 
    const targetSocketId = users.get(to);
 
    if (targetSocketId) {
 
      io.to(targetSocketId).emit('request-offer', { from });
 
    }
 
  });
 
  // Disconnect handler
 
  socket.on('disconnect', () => {
 
    const publicKey = socketToPublicKey.get(socket.id);
 
    console.log(`Client disconnected: ${socket.id}, public key: ${publicKey}`);
 
    if (publicKey) {
 
      users.delete(publicKey);
 
      socketToPublicKey.delete(socket.id);
 
    }
 
  });
 
});
 
// Simple status route
 
app.get('/', (req, res) => {
 
  res.send('WebRTC Signaling Server is running');
 
});
 
const PORT = process.env.PORT || 3000;
 
server.listen(PORT, () => {
 
  console.log(`Server is running on port ${PORT}`);
 
});
 