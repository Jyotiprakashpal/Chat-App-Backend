const express = require('express');
const router = express.Router();
const { 
    uploadImage, 
    getImage, 
    deleteImage, 
    getAllImages 
} = require('../controllers/imageController');
const upload = require('../config/gridfs');

router.post('/upload', upload.single('image'), uploadImage);

router.get('/', getAllImages);

router.get('/:filename', getImage);

router.delete('/:filename', deleteImage);

module.exports = router;
