const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
    uploadImage,
    getImage,
    deleteImage,
    getAllImages,
} = require('../controllers/imageController');

// Use memory storage so we can upload directly to Cloudinary.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        // Allow images, videos, and common documents; Cloudinary will handle via resource_type:'auto'.
        const allowedExt = /\.(jpe?g|png|gif|webp|mp4|mov|m4v|webm|avi|mkv|pdf|doc|docx|txt|ppt|pptx|xls|xlsx)$/i;
        const allowedMime = /^(image|video)\//i.test(file.mimetype) ||
            /^(application\/pdf|text\/plain|application\/msword|application\/vnd\.)/i.test(file.mimetype);
        const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());

        if (allowedMime || extname) return cb(null, true);

        cb(new Error('Only image/video/doc files are allowed!'));
    },
});

router.post('/upload', upload.array('image', 10), uploadImage);


router.get('/', getAllImages);
router.get('/:filename', getImage);
router.delete('/:filename', deleteImage);

module.exports = router;



