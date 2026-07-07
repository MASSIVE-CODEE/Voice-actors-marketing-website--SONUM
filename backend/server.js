const path = require('path');
const express = require('express');
const audioDemoRoute = require('./storage/audio-demo-route');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use('/api', audioDemoRoute);
app.use('/api/storage/uploads', express.static(path.join(__dirname, 'storage', 'uploads')));

app.get('/api/health', (request, response) => {
    response.json({
        status: 'ok',
        stack: 'JavaScript frontend plus Node.js API',
        audioStorage: 'external object storage / local fallback'
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

