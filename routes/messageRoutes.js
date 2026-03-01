// Message Routes
// This file handles message-related routes

const express = require('express');
const router = express.Router();
const { 
    sendMessage, 
    getConversation, 
    getAllConversations,
    markAsRead 
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getAllConversations);
router.get('/:userId', protect, getConversation);
router.put('/read/:senderId', protect, markAsRead);

module.exports = router;
