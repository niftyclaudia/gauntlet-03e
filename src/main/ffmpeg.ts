/**
 * FFmpeg integration for video metadata extraction and thumbnail generation
 * 
 * Uses ffmpeg-static npm package for bundled FFmpeg binary
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { VideoMetadata } from '../types/video';
import { getThumbnailDirectory } from './fileSystem';

// Import ffmpeg-static with require for better compatibility
const ffmpegStatic = require('ffmpeg-static');
const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');

/**
 * Extract video metadata using FFmpeg
 * 
 * @param filePath - Absolute path to video file
 * @returns Video metadata (duration, resolution, framerate, codec)
 * @throws Error if FFmpeg fails or file unreadable
 */
export function extractMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg binary not found'));
      return;
    }

    // Run FFmpeg with -i flag to get file info
    // FFmpeg outputs metadata to stderr
    const ffmpeg = spawn(ffmpegPath, ['-i', filePath]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      try {
        // FFmpeg returns non-zero exit code when using -i without output
        // This is expected behavior, we just need to parse stderr
        
        // Extract duration (format: Duration: HH:MM:SS.ms)
        const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (!durationMatch) {
          reject(new Error('Could not extract duration from video file'));
          return;
        }
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseFloat(durationMatch[3]);
        const duration = hours * 3600 + minutes * 60 + seconds;

        // Extract resolution and codec (format: Stream #0:0: Video: h264, 1920x1080)
        const videoStreamMatch = stderr.match(/Stream #\d+:\d+.*Video: (\w+).*?(\d{2,5})x(\d{2,5})/);
        if (!videoStreamMatch) {
          reject(new Error('Could not extract video stream information'));
          return;
        }
        const codec = videoStreamMatch[1];
        const width = parseInt(videoStreamMatch[2], 10);
        const height = parseInt(videoStreamMatch[3], 10);

        // Extract framerate (format: 30 fps or 29.97 fps)
        const framerateMatch = stderr.match(/(\d+(?:\.\d+)?)\s*fps/);
        if (!framerateMatch) {
          reject(new Error('Could not extract framerate from video file'));
          return;
        }
        const framerate = parseFloat(framerateMatch[1]);

        const metadata: VideoMetadata = {
          duration,
          width,
          height,
          framerate,
          codec,
        };

        console.log(`[FFmpeg] Extracted metadata for ${path.basename(filePath)}:`, metadata);
        resolve(metadata);
      } catch (error) {
        reject(new Error(`Failed to parse FFmpeg output: ${error}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

/**
 * Generate thumbnail from video file using FFmpeg
 * 
 * Extracts frame at 0.1 seconds, scales to 320x180px (16:9)
 * 
 * @param filePath - Absolute path to video file
 * @param clipId - UUID for thumbnail filename
 * @returns Absolute path to generated thumbnail JPEG
 * @throws Error if FFmpeg fails or directory not writable
 */
export function generateThumbnail(
  filePath: string,
  clipId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg binary not found'));
      return;
    }

    const thumbnailDir = getThumbnailDirectory();
    const thumbnailPath = path.join(thumbnailDir, `${clipId}.jpg`);

    // FFmpeg command to extract thumbnail:
    // -ss 00:00:00.1 = seek to 0.1 seconds (near beginning, usually I-frame)
    // -i = input file
    // -vframes 1 = extract only 1 frame
    // -vf scale=320:180 = scale to 320x180px (16:9 aspect ratio)
    // -q:v 2 = JPEG quality (2 = high quality)
    const ffmpeg = spawn(ffmpegPath, [
      '-ss', '00:00:00.1',
      '-i', filePath,
      '-vframes', '1',
      '-vf', 'scale=320:180',
      '-q:v', '2',
      thumbnailPath,
      '-y' // Overwrite output file if exists
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`[FFmpeg] Generated thumbnail: ${thumbnailPath}`);
        resolve(thumbnailPath);
      } else {
        reject(new Error(`FFmpeg thumbnail generation failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

