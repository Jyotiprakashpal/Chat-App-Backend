const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, savePushToken } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, getAllUsers);
router.post('/push-token', protect, savePushToken);

module.exports = router;
