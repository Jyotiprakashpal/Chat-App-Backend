const mongoose = require('mongoose');
const multer = require('multer');
const Grid = require('gridfs-stream');
const path = require('path');

// Initialize GridFS
let gfs;
let gridFSBucket;

// Initialize GridFS based on connection state
const connectGridFS = () => {
    const conn = mongoose.connection;
    
    const initGfs = () => {
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('images');
        
        // Also set up GridFSBucket for newer MongoDB driver
        gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, {
            bucketName: 'images'
        });
        
        console.log('GridFS initialized');
    };
    
    if (conn.readyState === 1) {
        // Already connected
        initGfs();
    } else {
        // Wait for connection to open
        conn.once('open', initGfs);
    }
};

// Call this when module loads to set up GridFS
connectGridFS();

// Export gfs getter for use in other modules
const getGfs = () => gfs;
const getGridFSBucket = () => gridFSBucket;

// Custom GridFS Storage Engine for Multer
const GridFsStorage = function(options) {
    this.options = options || {};
};

GridFsStorage.prototype._handleFile = function(req, file, cb) {
    if (!gfs) {
        return cb(new Error('GridFS not initialized. Make sure MongoDB is connected.'));
    }

    // Generate unique filename with timestamp
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    
    // Create write stream to GridFS
    const writeStream = gfs.createWriteStream({
        filename: fileName,
        content_type: file.mimetype,
        metadata: {
            originalName: file.originalname,
            uploadedBy: req.user ? req.user.id : null
        }
    });

    // Pipe the file stream to GridFS
    file.stream.pipe(writeStream);

    writeStream.on('close', function(fileInfo) {
        // Return the file info in the format expected by multer
        cb(null, {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            id: fileInfo._id,
            filename: fileInfo.filename,
            contentType: fileInfo.contentType,
            size: fileInfo.length,
            path: fileInfo.filename // GridFS doesn't have a physical path
        });
    });

    writeStream.on('error', function(error) {
        cb(error);
    });
};

GridFsStorage.prototype._removeFile = function(req, file, cb) {
    if (!gfs) {
        return cb(new Error('GridFS not initialized'));
    }

    // Delete the file from GridFS
    gfs.remove({ _id: file.id, root: 'images' }, function(err) {
        if (err) {
            return cb(err);
        }
        cb(null);
    });
};

// Create storage engine
const storage = new GridFsStorage({
    url: process.env.MONGO_URI || 'mongodb://localhost:27017/RealTimeChattingApp'
});

// Filter to allow only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create multer upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
module.exports.getGfs = getGfs;
module.exports.getGridFSBucket = getGridFSBucket;
