// Example signaling server (server.js)


const express = require('express');


const app = express();


const server = require('http').createServer(app);


const io = require('socket.io')(server, {


    cors: {


        origin: '*',


    },


});

const PORT = 3000;

// Map public keys to socket IDs


const users = new Map();

io.on('connection', (socket) => {


    console.log('User connected:', socket.id);

    // Register user based on public key


    const publicKey = socket.handshake.query.publicKey;


    if (publicKey) {


        users.set(publicKey, socket.id);


        socket.emit('registered', { socketId: socket.id });


    }

    socket.on('offer', (data) => {


        console.log('Received offer:', data);


        const targetSocketId = users.get(data.to);


        if (targetSocketId) {


            io.to(targetSocketId).emit('offer', {


                from: publicKey,


                sdp: data.sdp,


                callType: data.callType, // Ensure callType is forwarded


                callerId: data.callerId,


            });


        }


    });

    // Handle other events like 'answer', 'ice-candidate', etc.


    socket.on('answer', (data) => {


        const targetSocketId = users.get(data.to);


        if (targetSocketId) {


            io.to(targetSocketId).emit('answer', {


                from: publicKey,


                sdp: data.sdp,


            });


        }


    });

    socket.on('ice-candidate', (data) => {


        const targetSocketId = users.get(data.to);


        if (targetSocketId) {


            io.to(targetSocketId).emit('ice-candidate', {


                candidate: data.candidate,


            });


        }


    });

    socket.on('call-rejected', (data) => {


        const targetSocketId = users.get(data.to);


        if (targetSocketId) {


            io.to(targetSocketId).emit('call-rejected', { from: publicKey });


        }


    });

    socket.on('call-ended', (data) => {


        const targetSocketId = users.get(data.to);


        if (targetSocketId) {


            io.to(targetSocketId).emit('call-ended', { from: publicKey });


        }


    });

    socket.on('disconnect', () => {


        users.delete(publicKey);


        console.log('User disconnected:', socket.id);


    });


});

server.listen(PORT, () => {


    console.log(`Signaling server running on port ${PORT}`);


});
