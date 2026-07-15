const express = require('express');
const { createPresignedUploadSession } = require('./audio-demo-storage');

const router = express.Router();

router.post('/talent/:talentId/demo-reels', async (request, response, next) => {
    try {
        const { filename, mimeType, category } = request.body || {};
        if (!filename) {
            return response.status(400).json({ error: 'filename is required to create an upload session' });
        }

        const uploadSession = createPresignedUploadSession({
            talentId: request.params.talentId,
            category,
            filename,
            mimeType
        });

        response.status(201).json({
            demoCategory: category || 'general',
            storageKey: uploadSession.key,
            audioUrl: uploadSession.uploadUrl,
            uploadMode: uploadSession.uploadMode,
            method: uploadSession.method,
            headers: uploadSession.headers,
            expiresAt: uploadSession.expiresAt
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
