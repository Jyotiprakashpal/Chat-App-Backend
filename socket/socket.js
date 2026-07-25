// Socket.io Configuration
// This file handles real-time communication using Socket.io

const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendExpoPushNotification } = require('../utils/pushNotifications');

let onlineUsers = new Map();

const getUserId = (user) => user._id.toString();

const getAttachmentsFromMessage = (message) => {
    if (Array.isArray(message.attachments) && message.attachments.length > 0) {
        return message.attachments;
    }

    if (Array.isArray(message.attachment?.images)) {
        return message.attachment.images;
    }

    return [];
};

const emitOnlineUsers = (io) => {
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
};

const addOnlineUser = (userId, socketId) => {
    const socketIds = onlineUsers.get(userId) || new Set();
    socketIds.add(socketId);
    onlineUsers.set(userId, socketIds);

    return socketIds.size === 1;
};

const removeOnlineUser = (userId, socketId) => {
    const socketIds = onlineUsers.get(userId);
    if (!socketIds) return false;

    socketIds.delete(socketId);
    if (socketIds.size > 0) {
        onlineUsers.set(userId, socketIds);
        return false;
    }

    onlineUsers.delete(userId);
    return true;
};

const emitToUser = (io, userId, event, payload) => {
    const socketIds = onlineUsers.get(userId);
    if (!socketIds) return;

    socketIds.forEach((socketId) => {
        io.to(socketId).emit(event, payload);
    });
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
        const userId = getUserId(socket.user);
        const becameOnline = addOnlineUser(userId, socket.id);
        socket.join(userId);

        // Broadcast online status
        if (becameOnline) {
            io.emit('userOnline', userId);
        }
        emitOnlineUsers(io);

        // Handle joining conversation rooms
        socket.on('joinConversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.user.username} joined conversation: ${conversationId}`);
        });

        socket.on('getOnlineUsers', () => {
            socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
        });

        // Handle sending messages
        socket.on('sendMessage', async (data, callback) => {
            try {
                const recipientIdentifier = data.recipientId || data.receiverId || data.recipient || data.receiverEmail;
                const content = data.content || data.message || data.text;
                const attachments = Array.isArray(data.attachments)
                    ? data.attachments
                    : Array.isArray(data.attachment?.images)
                        ? data.attachment.images
                        : [];
                const attachment = data.attachment || (attachments.length > 0 ? { images: attachments } : undefined);

                if (!recipientIdentifier || ((!content || !String(content).trim()) && attachments.length === 0)) {
                    throw new Error('Recipient and message content or attachments are required');
                }

                if (content === 'Sent an attachment' && attachments.length === 0) {
                    throw new Error('Attachment upload response is required for media messages');
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
                    content: content !== undefined && content !== null ? String(content).trim() : '',
                    attachments,
                    attachment
                });

                const messageAttachments = getAttachmentsFromMessage(message);

                const payload = {
                    _id: message._id.toString(),
                    sender: getUserId(socket.user),
                    recipient: recipient._id.toString(),
                    content: message.content,
                    attachments: messageAttachments,
                    attachment: message.attachment || (messageAttachments.length > 0 ? { images: messageAttachments } : undefined),
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
                sendExpoPushNotification({
                    tokens: recipient.expoPushTokens,
                    title: socket.user.username || socket.user.email || 'New message',
                    body: payload.content || 'Sent an attachment',
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
            emitToUser(io, recipientId, 'userTyping', {
                userId: socket.user._id,
                conversationId
            });
        });

        // Handle read receipts
        socket.on('markRead', (data) => {
            const { senderId, conversationId } = data;
            emitToUser(io, senderId, 'messagesRead', {
                conversationId,
                readBy: socket.user._id
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.username}`);
            const userId = getUserId(socket.user);
            const becameOffline = removeOnlineUser(userId, socket.id);
            if (becameOffline) {
                io.emit('userOffline', userId);
            }
            emitOnlineUsers(io);
        });
    });
};

module.exports = initializeSocket;

