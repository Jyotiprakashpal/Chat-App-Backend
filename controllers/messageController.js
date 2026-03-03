// Message Controller
// This file handles message-related logic

const Message = require('../models/Message');
const User = require('../models/User');

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

        const message = await Message.create({
            sender,
            recipient: recipientUser._id,
            content: String(content)
        });

        // Populate sender info
        await message.populate('sender', 'username email');
        await message.populate('recipient', 'username email');

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

        await Message.updateMany(
            { sender: senderId, recipient: currentUserId, read: false },
            { $set: { read: true } }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
