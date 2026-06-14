const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dj86treej', 
  api_key: process.env.CLOUDINARY_API_KEY || '212342949227724', 
  api_secret: process.env.CLOUDINARY_API_SECRET || '_15BHm2mO9KKD6FZxcxdKpnual4', 
});

module.exports = { cloudinary };

