const { getGfs } = require('../config/gridfs');

// Get gfs instance
let gfs;

const setupGridFS = () => {
    gfs = getGfs();
};

// @desc    Upload image to MongoDB
// @route   POST /api/images/upload
// @access  Public
const uploadImage = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.status(201).json({
            message: 'Image uploaded successfully',
            fileId: req.file.id,
            filename: req.file.filename,
            url: `/api/images/${req.file.filename}`,
            contentType: req.file.contentType
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
};

// @desc    Get image by filename
// @route   GET /api/images/:filename
// @access  Public
const getImage = (req, res) => {
    try {
        gfs = getGfs();
        
        if (!gfs) {
            return res.status(500).json({ message: 'GridFS not initialized' });
        }

        const filename = req.params.filename;

        gfs.files.findOne({ filename: filename }, (err, file) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!file) {
                return res.status(404).json({ message: 'Image not found' });
            }

            // Check if it's an image
            if (file.contentType && file.contentType.startsWith('image/')) {
                const readStream = gfs.createReadStream(file.filename);
                res.set('Content-Type', file.contentType);
                readStream.pipe(res);
            } else {
                res.status(400).json({ message: 'Not an image file' });
            }
        });
    } catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete image by filename
// @route   DELETE /api/images/:filename
// @access  Public
const deleteImage = (req, res) => {
    try {
        gfs = getGfs();
        
        if (!gfs) {
            return res.status(500).json({ message: 'GridFS not initialized' });
        }

        const filename = req.params.filename;

        gfs.files.findOneAndDelete({ filename: filename }, (err, file) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!file) {
                return res.status(404).json({ message: 'Image not found' });
            }

            res.json({ message: 'Image deleted successfully' });
        });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all images
// @route   GET /api/images
// @access  Public
const getAllImages = (req, res) => {
    try {
        gfs = getGfs();
        
        if (!gfs) {
            return res.status(500).json({ message: 'GridFS not initialized' });
        }

        gfs.files.find().toArray((err, files) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!files || files.length === 0) {
                return res.status(404).json({ message: 'No images found' });
            }

            // Return only file metadata (not the actual files)
            const imageFiles = files.map(file => ({
                filename: file.filename,
                contentType: file.contentType,
                size: file.length,
                uploadDate: file.uploadDate,
                url: `/api/images/${file.filename}`
            }));

            res.json(imageFiles);
        });
    } catch (error) {
        console.error('Get all images error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadImage,
    getImage,
    deleteImage,
    getAllImages,
    setupGridFS
};
