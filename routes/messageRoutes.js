// Message Routes
// This file handles message-related routes

const express = require('express');
const router = express.Router();
const { 
    sendMessage, 
    updateMessage,
    deleteMessage,
    deleteMessageMedia,
    getConversation, 
    getAllConversations,
    markAsRead 
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getAllConversations);
router.put('/read/:senderId', protect, markAsRead);
router.put('/:messageId/media', protect, deleteMessageMedia);
router.put('/:messageId', protect, updateMessage);
router.delete('/:messageId', protect, deleteMessage);

// Add email-specific route before the :userId route
router.get('/email/:email', protect, getConversation);

// This must come after /email/:email route
router.get('/:userId', protect, getConversation);

module.exports = router;
