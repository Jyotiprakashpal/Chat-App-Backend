// Message Model
// This file defines the Message schema for the database

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: false,
        trim: true,
    },
    attachments: [
        {
            filename: { type: String, required: false },
            url: { type: String, required: false },
            contentType: { type: String, required: false },
            format: { type: String, required: false },
            resourceType: { type: String, required: false },
        },
    ],
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
