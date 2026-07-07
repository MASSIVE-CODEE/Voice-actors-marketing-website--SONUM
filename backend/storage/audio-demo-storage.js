/**
 * SONUM Cloud Audio Storage Adapter.
 *
 * Handles file offloading to AWS S3 or Supabase Storage buckets.
 * To keep local testing seamless, it falls back to saving files in a local
 * workspace directory when environment credentials are not configured.
 */

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

// Initialize S3 client dynamically to prevent crashes when env variables are not loaded
let s3 = null;
if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
    s3 = new S3Client({
        region: process.env.AWS_REGION
    });
}

/**
 * SUPABASE STORAGE SDK INTEGRATION BLUEPRINT:
 *
 * Below pattern outlines how to write the storage controller using Supabase Client SDK.
 * Enable this by installing '@supabase/supabase-js' and loading keys.
 * 
 * const { createClient } = require('@supabase/supabase-js');
 * const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
 *
 * async function uploadToSupabaseBucket({ file, key }) {
 *     const { data, error } = await supabase.storage
 *         .from(process.env.SUPABASE_AUDIO_BUCKET || 'audio-demo-reels')
 *         .upload(key, file.buffer, {
 *             contentType: file.mimetype,
 *             upsert: true
 *         });
 *     if (error) throw error;
 *     const { data: publicUrlData } = supabase.storage
 *         .from(process.env.SUPABASE_AUDIO_BUCKET || 'audio-demo-reels')
 *         .getPublicUrl(key);
 *     return publicUrlData.publicUrl;
 * }
 */

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

async function uploadDemoReelToS3({ file, talentId, category }) {
    assertValidDemoFile(file);
    
    const key = buildDemoObjectKey({
        talentId,
        category,
        originalName: file.originalname
    });

    // Check if S3 / AWS credentials are configured
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
    } else {
        // Fallback: Safe Local Storage to ensure local tests never crash
        console.log('[AWS/SUPABASE CREDENTIALS MISSING] Falling back to local workspace offload...');
        
        // Define local upload directory inside workspace
        const localUploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(localUploadDir)) {
            fs.mkdirSync(localUploadDir, { recursive: true });
        }

        const safeFilename = `${Date.now()}-${path.basename(file.originalname).replace(/[^a-z0-9.-]+/g, '-')}`;
        const localPath = path.join(localUploadDir, safeFilename);

        // Write buffer to local folder
        fs.writeFileSync(localPath, file.buffer);

        // Return a mock local API server url path
        return {
            bucket: 'local-workspace-fallback',
            key: safeFilename,
            url: `/api/storage/uploads/${safeFilename}`
        };
    }
}

module.exports = {
    uploadDemoReelToS3,
    assertValidDemoFile
};
