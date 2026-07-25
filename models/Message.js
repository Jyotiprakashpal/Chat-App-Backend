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
            message: { type: String, required: false },
            publicId: { type: String, required: false },
            filename: { type: String, required: false },
            url: { type: String, required: false },
            contentType: { type: String, required: false },
            bytes: { type: Number, required: false },
            width: { type: Number, required: false },
            height: { type: Number, required: false },
            format: { type: String, required: false },
            resourceType: { type: String, required: false },
        },
    ],
    attachment: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    read: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        required: false
    },
    deletedAt: {
        type: Date,
        required: false
    },
    mediaDeletedAt: {
        type: Date,
        required: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isMediaDeleted: {
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
