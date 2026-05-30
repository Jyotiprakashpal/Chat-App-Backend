const express = require('express');
const AppVersion = require('../models/AppVersion');

const router = express.Router();

const defaultVersionInfo = () => ({
    key: 'app',
    latestVersion: process.env.APP_LATEST_VERSION || '1.0.0',
    minimumVersion: process.env.APP_MINIMUM_VERSION || '1.0.0',
    updateTitle: process.env.APP_UPDATE_TITLE || 'JyoChat update available',
    updateMessage: process.env.APP_UPDATE_MESSAGE || 'A new version of JyoChat is available. Please update to get the latest features.',
    updateUrl: process.env.APP_UPDATE_URL || '',
    forceUpdate: process.env.APP_FORCE_UPDATE === 'true'
});

const requireAdminKey = (req, res, next) => {
    if (!process.env.APP_ADMIN_KEY) {
        return next();
    }

    if (req.headers['x-admin-key'] !== process.env.APP_ADMIN_KEY) {
        return res.status(403).json({ message: 'Invalid admin key' });
    }

    next();
};

const toResponse = (versionInfo) => ({
    latestVersion: versionInfo.latestVersion,
    minimumVersion: versionInfo.minimumVersion,
    updateTitle: versionInfo.updateTitle,
    updateMessage: versionInfo.updateMessage,
    updateUrl: versionInfo.updateUrl,
    forceUpdate: versionInfo.forceUpdate,
    updatedAt: versionInfo.updatedAt
});

const allowedUpdateFields = [
    'latestVersion',
    'minimumVersion',
    'updateTitle',
    'updateMessage',
    'updateUrl',
    'forceUpdate'
];

const pickVersionUpdate = (body) => {
    const update = {};
    allowedUpdateFields.forEach((field) => {
        if (body[field] !== undefined) {
            update[field] = body[field];
        }
    });
    return update;
};

const getOrCreateVersionInfo = async () => {
    let versionInfo = await AppVersion.findOne({ key: 'app' });

    if (!versionInfo) {
        versionInfo = await AppVersion.create(defaultVersionInfo());
    }

    return versionInfo;
};

router.get('/version', async (req, res) => {
    try {
        const versionInfo = await getOrCreateVersionInfo();
        res.json(toResponse(versionInfo));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/version', requireAdminKey, async (req, res) => {
    try {
        const update = pickVersionUpdate(req.body);
        const existingVersionInfo = await getOrCreateVersionInfo();

        const versionInfo = await AppVersion.findOneAndUpdate(
            { _id: existingVersionInfo._id },
            { $set: update },
            { new: true, upsert: true, runValidators: true }
        );

        res.json(toResponse(versionInfo));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/version', requireAdminKey, async (req, res) => {
    try {
        const update = pickVersionUpdate(req.body);
        const existingVersionInfo = await getOrCreateVersionInfo();

        const versionInfo = await AppVersion.findOneAndUpdate(
            { _id: existingVersionInfo._id },
            { $set: update },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(201).json(toResponse(versionInfo));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/version/defaults', (req, res) => {
    const { key, ...defaults } = defaultVersionInfo();
    res.json(defaults);
});

module.exports = router;
