// Socket.io Configuration
// This file handles real-time communication using Socket.io

const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendExpoPushNotification } = require('../utils/pushNotifications');

let onlineUsers = new Map();

const getUserId = (user) => user._id.toString();

const emitOnlineUsers = (io) => {
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
};

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
        onlineUsers.set(getUserId(socket.user), socket.id);
        socket.join(getUserId(socket.user));

        // Broadcast online status
        io.emit('userOnline', getUserId(socket.user));
        emitOnlineUsers(io);

        // Handle joining conversation rooms
        socket.on('joinConversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.user.username} joined conversation: ${conversationId}`);
        });

        // Handle sending messages
        socket.on('sendMessage', async (data, callback) => {
            try {
                const recipientIdentifier = data.recipientId || data.receiverId || data.recipient || data.receiverEmail;
                const content = data.content || data.message || data.text;

                if (!recipientIdentifier || !content || !String(content).trim()) {
                    throw new Error('Recipient and message content are required');
                }

                const recipientFilters = [{ email: recipientIdentifier }];
                if (recipientIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
                    recipientFilters.push({ _id: recipientIdentifier });
                }

                const recipient = await User.findOne({ $or: recipientFilters }).select('_id username email expoPushTokens');

                if (!recipient) {
                    throw new Error('Recipient not found');
                }

                const message = await Message.create({
                    sender: socket.user._id,
                    recipient: recipient._id,
                    content: String(content).trim()
                });

                const payload = {
                    _id: message._id.toString(),
                    sender: getUserId(socket.user),
                    recipient: recipient._id.toString(),
                    content: message.content,
                    read: message.read,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt,
                    senderUser: {
                        _id: getUserId(socket.user),
                        username: socket.user.username,
                        email: socket.user.email
                    },
                    recipientUser: {
                        _id: recipient._id.toString(),
                        username: recipient.username,
                        email: recipient.email
                    }
                };

                io.to(getUserId(socket.user)).to(recipient._id.toString()).emit('newMessage', payload);
                io.to(getUserId(socket.user)).to(recipient._id.toString()).emit('receiveMessage', payload);
                sendExpoPushNotification({
                    tokens: recipient.expoPushTokens,
                    title: socket.user.username || socket.user.email || 'New message',
                    body: payload.content,
                    data: {
                        type: 'message',
                        messageId: payload._id,
                        senderId: getUserId(socket.user),
                        senderEmail: socket.user.email
                    }
                });

                if (typeof callback === 'function') {
                    callback({ ok: true, message: payload });
                }
            } catch (error) {
                if (typeof callback === 'function') {
                    callback({ ok: false, message: error.message });
                } else {
                    socket.emit('messageError', { message: error.message });
                }
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
            onlineUsers.delete(getUserId(socket.user));
            io.emit('userOffline', getUserId(socket.user));
            emitOnlineUsers(io);
        });
    });
};

module.exports = initializeSocket;
