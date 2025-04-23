// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
 
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});
 
const users = {}; // Maps socket.id -> socket
 
io.on('connection', (socket) => {
  console.log('[Server] New socket connected:', socket.id);
  users[socket.id] = socket;
 
  // Notify existing users about new user
  socket.broadcast.emit('user-joined', socket.id);
 
  // Forward offer
  socket.on('offer', ({ to, sdp }) => {
    console.log(`[Server] Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', { from: socket.id, sdp });
  });
 
  // Forward answer
  socket.on('answer', ({ to, sdp }) => {
    console.log(`[Server] Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', { from: socket.id, sdp });
  });
 
  // Forward ICE candidates
  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`[Server] ICE candidate from ${socket.id} to ${to}`);
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });
 
  socket.on('disconnect', () => {
    console.log(`[Server] Disconnected: ${socket.id}`);
    delete users[socket.id];
  });
 
  // Add to your existing server.js socket handlers
  socket.on('call-rejected', ({ to }) => {
    console.log(`[Server] Call rejected from ${socket.id} to ${to}`);
    io.to(to).emit('call-rejected', { from: socket.id });
  });
 
  socket.on('call-ended', ({ to }) => {
    console.log(`[Server] Call ended by ${socket.id} to ${to}`);
    io.to(to).emit('call-ended', { from: socket.id });
  });
 
  socket.on('request-offer', ({ from }) => {
    console.log(`[Server] Offer requested by ${socket.id} from ${from}`);
    io.to(from).emit('request-offer', { from: socket.id });
  });
});
 
server.listen(3000, () => {
  console.log('[Server] Listening on http://localhost:3000');
});
 
 