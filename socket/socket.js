// Socket.io Configuration
// This file handles real-time communication using Socket.io

const jwt = require('jsonwebtoken');
const User = require('../models/User');

let onlineUsers = new Map();

const initializeSocket = (io) => {
    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.username}`);

        // Add user to online users
        onlineUsers.set(socket.user._id.toString(), socket.id);

        // Broadcast online status
        io.emit('userOnline', socket.user._id);

        // Handle joining conversation rooms
        socket.on('joinConversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.user.username} joined conversation: ${conversationId}`);
        });

        // Handle sending messages
        socket.on('sendMessage', async (data) => {
            const { recipientId, content } = data;
            
            // Emit to recipient's socket if online
            const recipientSocket = onlineUsers.get(recipientId);
            if (recipientSocket) {
                io.to(recipientSocket).emit('newMessage', {
                    sender: socket.user._id,
                    content,
                    createdAt: new Date()
                });
            }
        });

        // Handle typing indicator
        socket.on('typing', (data) => {
            const { recipientId, conversationId } = data;
            const recipientSocket = onlineUsers.get(recipientId);
            if (recipientSocket) {
                io.to(recipientSocket).emit('userTyping', {
                    userId: socket.user._id,
                    conversationId
                });
            }
        });

        // Handle read receipts
        socket.on('markRead', (data) => {
            const { senderId, conversationId } = data;
            const senderSocket = onlineUsers.get(senderId);
            if (senderSocket) {
                io.to(senderSocket).emit('messagesRead', {
                    conversationId,
                    readBy: socket.user._id
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.username}`);
            onlineUsers.delete(socket.user._id.toString());
            io.emit('userOffline', socket.user._id);
        });
    });
};

module.exports = initializeSocket;
