const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    updateProfileImage, 
    deleteProfileImage 
} = require('../controllers/authController');

router.put('/me/profile-image', protect, updateProfileImage);
router.delete('/me/profile-image', protect, deleteProfileImage);

module.exports = router;