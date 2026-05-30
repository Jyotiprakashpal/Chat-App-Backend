// Message Controller
// This file handles message-related logic

const Message = require('../models/Message');
const User = require('../models/User');
const { sendExpoPushNotification } = require('../utils/pushNotifications');

const toMessagePayload = (message) => {
    const senderId = message.sender._id ? message.sender._id.toString() : message.sender.toString();
    const recipientId = message.recipient._id ? message.recipient._id.toString() : message.recipient.toString();

    return {
        _id: message._id.toString(),
        sender: senderId,
        recipient: recipientId,
        content: message.content,
        read: message.read,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        senderUser: message.sender._id ? {
            _id: senderId,
            username: message.sender.username,
            email: message.sender.email
        } : undefined,
        recipientUser: message.recipient._id ? {
            _id: recipientId,
            username: message.recipient.username,
            email: message.recipient.email
        } : undefined
    };
};

const emitMessage = (req, message) => {
    const io = req.app.get('io');
    if (!io) return;

    const payload = toMessagePayload(message);
    io.to(payload.sender).to(payload.recipient).emit('newMessage', payload);
    io.to(payload.sender).to(payload.recipient).emit('receiveMessage', payload);
};

const sendMessagePushNotification = async (recipientUser, senderUser, message) => {
    await sendExpoPushNotification({
        tokens: recipientUser.expoPushTokens,
        title: senderUser.username || senderUser.email || 'New message',
        body: message.content,
        data: {
            type: 'message',
            messageId: message._id.toString(),
            senderId: senderUser._id.toString(),
            senderEmail: senderUser.email
        }
    });
};

// Send a new message
exports.sendMessage = async (req, res) => {
    try {
        const { recipient, content } = req.body;
        const sender = req.user._id;

        // Find recipient by email
        const recipientUser = await User.findOne({ email: recipient });
        if (!recipientUser) {
            return res.status(404).json({ message: "Recipient not found" });
        }
        const senderUser = await User.findById(sender).select('username email');

        const message = await Message.create({
            sender,
            recipient: recipientUser._id,
            content: String(content)
        });

        // Populate sender info
        await message.populate('sender', 'username email');
        await message.populate('recipient', 'username email');

        emitMessage(req, message);
        sendMessagePushNotification(recipientUser, senderUser, message);

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get conversation with another user (by email or userId)
exports.getConversation = async (req, res) => {
    try {
        const { userId, email } = req.params;
        const currentUserId = req.user._id;

        // Determine which identifier to use
        let identifier = userId || email;
        
        // Check if identifier is an email
        let recipientUserId;
        if (identifier && identifier.includes('@')) {
            const recipientUser = await User.findOne({ email: identifier });
            if (!recipientUser) {
                return res.status(404).json({ message: "User not found" });
            }
            recipientUserId = recipientUser._id;
        } else {
            recipientUserId = identifier;
        }

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: recipientUserId },
                { sender: recipientUserId, recipient: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all conversations for current user
exports.getAllConversations = async (req, res) => {
    try {
        const currentUserId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId },
                { recipient: currentUserId }
            ]
        }).sort({ createdAt: -1 });

        // Group by conversation partner
        const conversations = {};
        messages.forEach(msg => {
            const partnerId = msg.sender.toString() === currentUserId.toString() 
                ? msg.recipient.toString() 
                : msg.sender.toString();
            
            if (!conversations[partnerId]) {
                conversations[partnerId] = {
                    partnerId,
                    lastMessage: msg,
                    unreadCount: 0
                };
            }
            
            if (msg.recipient.toString() === currentUserId.toString() && !msg.read) {
                conversations[partnerId].unreadCount++;
            }
        });

        // Populate partner info
        const result = await Promise.all(
            Object.values(conversations).map(async (conv) => {
                const partner = await User.findById(conv.partnerId).select('username email');
                return {
                    ...conv,
                    partner
                };
            })
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { senderId } = req.params;
        const currentUserId = req.user._id;
        let resolvedSenderId = senderId;

        if (senderId && senderId.includes('@')) {
            const senderUser = await User.findOne({ email: senderId }).select('_id');
            if (!senderUser) {
                return res.status(404).json({ message: 'Sender not found' });
            }
            resolvedSenderId = senderUser._id;
        }

        const result = await Message.updateMany(
            { sender: resolvedSenderId, recipient: currentUserId, read: false },
            { $set: { read: true } }
        );

        const io = req.app.get('io');
        if (io && result.modifiedCount > 0) {
            io.to(resolvedSenderId.toString()).emit('messagesRead', {
                readBy: currentUserId.toString(),
                senderId: resolvedSenderId.toString()
            });
        }

        res.json({ message: 'Messages marked as read', modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
