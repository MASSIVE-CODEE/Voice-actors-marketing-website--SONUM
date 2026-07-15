/**
 * SONUM Cloud Audio Storage Adapter.
 *
 * Handles file offloading to AWS S3 or Supabase Storage buckets.
 * For local development, the backend now uses a browser-direct upload pattern
 * with an authenticated signed URL and a safe local fallback directory.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const allowedAudioTypes = new Set([
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav'
]);

const uploadSigningSecret = process.env.SONUM_UPLOAD_TOKEN_SECRET || 'dev-upload-secret';

let s3 = null;
if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
    s3 = new S3Client({ region: process.env.AWS_REGION });
}

function assertValidDemoFile(file) {
    if (!file?.buffer || !file?.originalname || !file?.mimetype) {
        throw new Error('A demo upload requires file buffer, name, and mime type.');
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const hasValidExtension = extension === '.mp3' || extension === '.wav';

    if (!allowedAudioTypes.has(file.mimetype) || !hasValidExtension) {
        throw new Error('Unsupported format. Only .mp3 and .wav audio demos are supported.');
    }
}

function buildDemoObjectKey({ talentId, category, originalName }) {
    const safeCategory = String(category || 'general').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const safeName = path.basename(originalName).toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
    return `talent/${talentId}/demos/${safeCategory}/${Date.now()}-${safeName}`;
}

function createUploadToken(payload) {
    const payloadString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', uploadSigningSecret).update(payloadString).digest('hex');
    return Buffer.from(`${payloadString}.${signature}`).toString('base64url');
}

function verifyPresignedUploadToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const [payloadString, signature] = decoded.split('.');
        if (!payloadString || !signature) return false;

        const payload = JSON.parse(payloadString);
        const expected = crypto.createHmac('sha256', uploadSigningSecret).update(payloadString).digest('hex');
        const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        const isExpired = Date.now() > payload.expiresAt;
        return isValid && !isExpired;
    } catch (error) {
        return false;
    }
}

function createPresignedUploadSession({ talentId, category, filename, mimeType }) {
    const key = buildDemoObjectKey({ talentId, category, originalName: filename });
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const token = createUploadToken({ talentId, category: category || 'general', key, expiresAt });
    const baseUrl = process.env.SONUM_PUBLIC_BASE_URL || 'http://localhost:3001';

    return {
        key,
        uploadMode: 'browser-direct',
        method: 'PUT',
        uploadUrl: `${baseUrl}/api/storage/uploads/${encodeURIComponent(key)}?token=${token}`,
        headers: {
            'Content-Type': mimeType || 'audio/mpeg'
        },
        expiresAt
    };
}

async function uploadDemoReelToS3({ file, talentId, category }) {
    assertValidDemoFile(file);

    const key = buildDemoObjectKey({
        talentId,
        category,
        originalName: file.originalname
    });

    if (s3 && process.env.AUDIO_DEMO_BUCKET && process.env.AUDIO_DEMO_PUBLIC_BASE_URL) {
        console.log(`[SONUM STORAGE] Shipping reel to AWS S3: ${key}`);
        await s3.send(new PutObjectCommand({
            Bucket: process.env.AUDIO_DEMO_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
                talentId: String(talentId),
                category: String(category || 'general')
            }
        }));

        return {
            bucket: process.env.AUDIO_DEMO_BUCKET,
            key,
            url: `${process.env.AUDIO_DEMO_PUBLIC_BASE_URL}/${key}`
        };
    }

    console.log('[AWS/SUPABASE CREDENTIALS MISSING] Falling back to local workspace offload...');
    const localUploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(localUploadDir)) {
        fs.mkdirSync(localUploadDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}-${path.basename(file.originalname).replace(/[^a-z0-9.-]+/g, '-')}`;
    const localPath = path.join(localUploadDir, safeFilename);
    await fs.promises.writeFile(localPath, file.buffer);

    return {
        bucket: 'local-workspace-fallback',
        key: safeFilename,
        url: `/api/storage/uploads/${safeFilename}`
    };
}

module.exports = {
    uploadDemoReelToS3,
    assertValidDemoFile,
    createPresignedUploadSession,
    verifyPresignedUploadToken
};
