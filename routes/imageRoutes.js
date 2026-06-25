const express = require('express');
const router = express.Router();
const multer = require('multer');

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
        const extname = allowedExt.test(require('path').extname(file.originalname).toLowerCase());
        if (extname) return cb(null, true);
        cb(new Error('Only image/video/doc files are allowed!'));
    },
});

router.post('/upload', upload.array('image', 10), uploadImage);


router.get('/', getAllImages);
router.get('/:filename', getImage);
router.delete('/:filename', deleteImage);

module.exports = router;



