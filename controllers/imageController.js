const { cloudinary } = require('../config/cloudinary');

// @desc    Upload image to Cloudinary
// @route   POST /api/images/upload
// @access  Public
const uploadImage = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const uploadOne = (file) => {
            return new Promise((resolve, reject) => {
                const streamUpload = cloudinary.uploader.upload_stream(
                    {
                        folder: 'chat-app',
                        resource_type: 'auto',
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                streamUpload.end(file.buffer);
            });
        };

        const results = await Promise.all(files.map(uploadOne));

        const responsePayload = results.map((uploadResult) => ({
            message: 'File uploaded successfully',
            publicId: uploadResult.public_id,
            filename: uploadResult.public_id,
            url: uploadResult.secure_url,
            // Cloudinary returns different metadata for images vs raw/documents.
            contentType: uploadResult.format ? `${uploadResult.resource_type}/${uploadResult.format}` : uploadResult.resource_type,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type,
        }));

        res.status(201).json({ images: responsePayload });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
};


// @desc    Get image metadata by public_id
// @route   GET /api/images/:filename
// @access  Public
const getImage = async (req, res) => {
    try {
        const publicId = req.params.filename;

        const details = await cloudinary.api.resource(publicId, {
            resource_type: 'auto',
        });

        if (!details || !details.secure_url) {
            return res.status(404).json({ message: 'Image not found' });
        }

        res.json({
            publicId: details.public_id,
            secureUrl: details.secure_url,
            width: details.width,
            height: details.height,
            format: details.format,
            bytes: details.bytes,
        });
    } catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete image by public_id
// @route   DELETE /api/images/:filename
// @access  Public
const deleteImage = async (req, res) => {
    try {
        const publicId = req.params.filename;

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(
                publicId,
                { resource_type: 'auto' },

                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });

        if (!result || result.result !== 'ok') {
            return res.status(404).json({ message: 'Image not found' });
        }

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all images (from folder chat-app)
// @route   GET /api/images
// @access  Public
const getAllImages = async (req, res) => {
    try {
        const resources = await cloudinary.search
            .expression('folder:chat-app')
            .sort_by('created_at', 'desc')
            .max_results(50)
            .execute();

        const imageFiles = (resources?.resources || []).map(r => ({
            publicId: r.public_id,
            filename: r.public_id,
            contentType: r.format ? `${r.resource_type}/${r.format}` : r.resource_type,
            format: r.format || undefined,

            size: r.bytes,
            uploadDate: r.created_at,
            url: r.secure_url,
        }));

        if (!imageFiles || imageFiles.length === 0) {
            return res.status(404).json({ message: 'No images found' });
        }

        res.json(imageFiles);
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
};



