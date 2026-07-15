const fs = require('fs');
const path = require('path');
const express = require('express');
const audioDemoRoute = require('./storage/audio-demo-route');
const { verifyPresignedUploadToken } = require('./storage/audio-demo-storage');

const app = express();
const port = process.env.PORT || 3001;
const uploadDir = path.join(__dirname, 'storage', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', audioDemoRoute);
app.use('/api/storage/uploads', express.static(uploadDir));

app.put('/api/storage/uploads/:fileName', express.raw({ type: '*/*' }), async (request, response, next) => {
    try {
        const token = request.query.token;
        if (!token || !verifyPresignedUploadToken(token)) {
            return response.status(401).json({ error: 'Invalid or expired upload token' });
        }

        const fileName = path.basename(request.params.fileName);
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, request.body);

        response.status(201).json({
            ok: true,
            key: fileName,
            url: `/api/storage/uploads/${encodeURIComponent(fileName)}`
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/health', (request, response) => {
    response.json({
        status: 'ok',
        stack: 'JavaScript frontend plus Node.js API',
        audioStorage: 'browser direct upload with local fallback'
    });
});

app.use((error, request, response, next) => {
    response.status(400).json({
        error: error.message || 'Unable to process request'
    });
});

app.listen(port, () => {
    console.log(`SONUM API listening on port ${port}`);
});

