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
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(require('path').extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only image files are allowed!'));
    },
});

router.post('/upload', upload.array('image', 10), uploadImage);

router.get('/', getAllImages);
router.get('/:filename', getImage);
router.delete('/:filename', deleteImage);

module.exports = router;

