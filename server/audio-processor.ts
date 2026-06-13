import ffmpeg from 'fluent-ffmpeg';
// Dynamically load ffmpeg-static to prevent crashes on Vercel
let ffmpegStatic: string | null = null;
import('ffmpeg-static').then(m => {
    ffmpegStatic = m.default;
    if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
}).catch(e => {
    console.warn("⚠️ ffmpeg-static failed to load:", e);
});
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { randomUUID } from 'node:crypto';



const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function processAudiobook(
    inputPath: string,
    chunkDuration: number = 300 // 5 minutes in seconds
): Promise<{ url: string; title: string; duration: number }[]> {
    const tempDir = path.join(process.cwd(), 'temp', randomUUID());

    if (!fs.existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        // Get total duration first
        ffmpeg.ffprobe(inputPath, async (err: any, metadata: any) => {
            if (err) return reject(err);

            const totalDuration = metadata.format.duration || 0;
            const partCount = Math.ceil(totalDuration / chunkDuration);
            const results: { url: string; title: string; duration: number }[] = [];

            try {
                for (let i = 0; i < partCount; i++) {
                    const startTime = i * chunkDuration;
                    const currentDuration = Math.min(chunkDuration, totalDuration - startTime);
                    const outputPath = path.join(tempDir, `part_${i + 1}.mp3`);

                    // Split part
                    await new Promise((res, rej) => {
                        ffmpeg(inputPath)
                            .setStartTime(startTime)
                            .setDuration(currentDuration)
                            .output(outputPath)
                            .on('end', res)
                            .on('error', rej)
                            .run();
                    });

                    // Upload part to Cloudinary
                    const uploadResult = await cloudinary.uploader.upload(outputPath, {
                        resource_type: 'video',
                        folder: 'audiobooks/parts',
                        access_type: 'authenticated', // For signed URLs
                    });

                    results.push({
                        url: uploadResult.secure_url,
                        title: `Chapter ${i + 1}`,
                        duration: currentDuration,
                    });

                    // Clean up part
                    await unlink(outputPath);
                }

                // Clean up temp dir
                fs.rmSync(tempDir, { recursive: true, force: true });

                resolve(results);
            } catch (error) {
                reject(error);
            }
        });
    });
}

export function generateSignedUrl(url: string): string {
    // Cloudinary signed URL logic if needed, 
    // but usually secure_url with authenticated access_type works if the library handles it.
    // Actually, Cloudinary authenticated assets need a signature.

    const publicId = url.split('/').slice(-3).join('/').split('.')[0];
    // This is a bit fragile, let's use a better way if possible.

    return cloudinary.url(publicId, {
        sign_url: true,
        resource_type: 'video',
        secure: true
    });
}
