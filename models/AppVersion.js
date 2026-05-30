const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
    key: {
        type: String,
        default: 'app',
        unique: true
    },
    latestVersion: {
        type: String,
        required: true,
        default: '1.0.0'
    },
    minimumVersion: {
        type: String,
        required: true,
        default: '1.0.0'
    },
    updateTitle: {
        type: String,
        default: 'JyoChat update available'
    },
    updateMessage: {
        type: String,
        default: 'A new version of JyoChat is available. Please update to get the latest features.'
    },
    updateUrl: {
        type: String,
        default: ''
    },
    forceUpdate: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('AppVersion', appVersionSchema);
