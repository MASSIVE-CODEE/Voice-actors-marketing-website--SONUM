const express = require('express');
const multer = require('multer');
const { uploadDemoReelToS3 } = require('./audio-demo-storage');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

router.post('/talent/:talentId/demo-reels', upload.single('demoReel'), async (request, response, next) => {
    try {
        const uploadedDemo = await uploadDemoReelToS3({
            file: request.file,
            talentId: request.params.talentId,
            category: request.body.category
        });

        response.status(201).json({
            demoCategory: request.body.category || 'general',
            storageKey: uploadedDemo.key,
            audioUrl: uploadedDemo.url
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
