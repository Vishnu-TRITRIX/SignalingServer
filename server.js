 // WebRTC Signaling Server
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
// Store reverse mapping: socketId -> publicKey
const socketToPublicKey = new Map();
 
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  // Extract public key from connection query
  const publicKey = socket.handshake.query.publicKey;
  if (publicKey) {
    console.log(`User registered with public key: ${publicKey}`);
    // Store both mappings
    users.set(publicKey, socket.id);
    socketToPublicKey.set(socket.id, publicKey);
    // Inform client they are registered
    socket.emit('registered', {
      socketId: socket.id,
      publicKey: publicKey
    });
  } else {
    console.log('User connected without public key');
    socket.disconnect();
    return;
  }
  // Handle call offer
  socket.on('offer', (data) => {
    const { to, sdp } = data;
    const from = socketToPublicKey.get(socket.id);
    console.log(`Offer from ${from} to ${to}`);
    const targetSocketId = users.get(to);
    if (targetSocketId) {
      // Forward the offer to the target user
      io.to(targetSocketId).emit('offer', {
        from: from,
        sdp: sdp
      });
    } else {
      // Target user not found
      socket.emit('user-not-found', { to });
    }
  });
  // Handle call answer
  socket.on('answer', (data) => {
    const { to, sdp } = data;
    const from = socketToPublicKey.get(socket.id);
    console.log(`Answer from ${from} to ${to}`);
    const targetSocketId = users.get(to);
    if (targetSocketId) {
      // Forward the answer to the target user
      io.to(targetSocketId).emit('answer', {
        from: from,
        sdp: sdp
      });
    }
  });
  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;
    const from = socketToPublicKey.get(socket.id);
    const targetSocketId = users.get(to);
    if (targetSocketId) {
      // Forward the ICE candidate to the target user
      io.to(targetSocketId).emit('ice-candidate', {
        from: from,
        candidate: candidate
      });
    }
  });
  // Handle call rejection
  socket.on('call-rejected', (data) => {
    const { to } = data;
    const from = socketToPublicKey.get(socket.id);
    const targetSocketId = users.get(to);
    if (targetSocketId) {
      // Inform the caller that their call was rejected
      io.to(targetSocketId).emit('call-rejected', {
        from: from
      });
    }
  });
  // Handle call ending
  socket.on('call-ended', (data) => {
    const { to } = data;
    const from = socketToPublicKey.get(socket.id);
    const targetSocketId = users.get(to);
    if (targetSocketId) {
      // Inform the other participant that the call has ended
      io.to(targetSocketId).emit('call-ended', {
        from: from
      });
    }
  });
  // Handle disconnection
  socket.on('disconnect', () => {
    const publicKey = socketToPublicKey.get(socket.id);
    console.log(`Client disconnected: ${socket.id}, public key: ${publicKey}`);
    if (publicKey) {
      // Remove user from mappings
      users.delete(publicKey);
      socketToPublicKey.delete(socket.id);
    }
  });
});
 
// Serve a simple status page
app.get('/', (req, res) => {
  res.send('WebRTC Signaling Server is running');
});
 
// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});