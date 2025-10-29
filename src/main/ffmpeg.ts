/**
 * FFmpeg integration for video metadata extraction and thumbnail generation
 * 
 * Uses ffmpeg-static npm package for bundled FFmpeg binary
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { VideoMetadata, TimelineClip, VideoClip, ExportSettings, ExportParams } from '../types/video';
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


/**
 * Convert seconds to HH:MM:SS.mmm format for FFmpeg
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * Generate FFmpeg command to trim a single clip
 * Normalizes to target export settings to ensure concat demuxer works correctly
 */
export function generateTrimCommand(
  sourcePath: string,
  trimStart: number,
  trimEnd: number,
  outputPath: string,
  settings?: ExportSettings
): string[] {
  const duration = trimEnd - trimStart;
  const args: string[] = [
    '-ss', formatTime(trimStart),
    '-i', sourcePath,
    '-t', duration.toFixed(3),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p', // Ensure consistent pixel format
  ];

  // If settings provided, normalize to target resolution and framerate
  // This ensures all segments are identical for concat demuxer
  if (settings) {
    // Scale and pad to exact target resolution
    const videoFilter = `scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2:color=black`;
    args.push('-vf', videoFilter);
    args.push('-r', settings.framerate.toString()); // Set frame rate
  }

  args.push(
    '-avoid_negative_ts', 'make_zero',
    '-y',
    outputPath,
  );

  return args;
}

/**
 * Create FFmpeg concat list file
 */
export function createConcatList(segmentPaths: string[]): string {
  const tempDir = os.tmpdir();
  const concatListPath = path.join(tempDir, `ollo_concat_${Date.now()}.txt`);
  // Verify all segment files exist before creating concat list
  for (let i = 0; i < segmentPaths.length; i++) {
    const segmentPath = segmentPaths[i];
    if (!fs.existsSync(segmentPath)) {
      throw new Error(`Segment ${i + 1} does not exist: ${segmentPath}`);
    }
    const stats = fs.statSync(segmentPath);
    if (stats.size === 0) {
      throw new Error(`Segment ${i + 1} is empty: ${segmentPath}`);
    }
    console.log(`[FFmpeg] Verified segment ${i + 1}: ${segmentPath} (${stats.size} bytes)`);
  }
  // Use absolute paths and escape single quotes properly
  const content = segmentPaths
    .map(p => {
      // Ensure absolute path and escape single quotes for FFmpeg concat
      const absolutePath = path.isAbsolute(p) ? p : path.resolve(p);
      return `file '${absolutePath.replace(/'/g, "'\\''")}'`;
    })
    .join('\n');
  fs.writeFileSync(concatListPath, content, 'utf8');
  console.log(`[FFmpeg] Created concat list with ${segmentPaths.length} segments: ${concatListPath}`);
  return concatListPath;
}

/**
 * Generate FFmpeg command to concatenate and re-encode clips
 */
export function generateConcatCommand(
  concatListPath: string,
  outputPath: string,
  settings: ExportSettings
): string[] {
  const { framerate, videoBitrate, audioBitrate } = settings;
  // Since all segments are already normalized (same resolution, framerate, codec) during trim phase,
  // we can use concat demuxer with copy for faster processing, or re-encode for final bitrate/quality
  // Using re-encode here to apply final bitrate settings and ensure consistent output quality
  const videoBitrateKbps = Math.round(videoBitrate * 1000);
  return [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-r', framerate.toString(), // Ensure frame rate is set
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${videoBitrateKbps}k`,
    '-bufsize', `${videoBitrateKbps * 2}k`,
    '-c:a', 'aac',
    '-b:a', `${audioBitrate}k`,
    '-pix_fmt', 'yuv420p', // Ensure compatible pixel format
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ];
}

/**
 * Parse FFmpeg progress from stderr output
 */
export function parseFFmpegProgress(stderrLine: string, totalDuration: number): number | null {
  const timeMatch = stderrLine.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{3})/);
  if (!timeMatch || totalDuration <= 0) return null;
  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = parseFloat(timeMatch[3]);
  const currentTime = hours * 3600 + minutes * 60 + seconds;
  return Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));
}

/**
 * Execute FFmpeg command with progress tracking
 */
function executeFFmpegCommand(
  command: string[],
  totalDuration: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg binary not found'));
      return;
    }
    console.log('[FFmpeg] Executing:', ffmpegPath, command.join(' '));
    const ffmpeg = spawn(ffmpegPath, command);
    let stderr = '';
    let lastProgress = 0;
    let lastProgressUpdate = 0;
    ffmpeg.stderr.on('data', (data) => {
      const dataStr = data.toString();
      stderr += dataStr;
      if (onProgress) {
        const progress = parseFFmpegProgress(dataStr, totalDuration);
        if (progress !== null) {
          const now = Date.now();
          if (Math.abs(progress - lastProgress) > 1 || (now - lastProgressUpdate) > 2000) {
            onProgress(progress);
            lastProgress = progress;
            lastProgressUpdate = now;
          }
        }
      }
    });
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
    });
    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

/**
 * Calculate export settings from timeline clips
 */
export function calculateExportSettings(
  clips: TimelineClip[],
  libraryClips: VideoClip[]
): ExportSettings {
  if (clips.length === 0) throw new Error('Cannot calculate export settings: no clips');
  const sortedClips = [...clips].sort((a, b) => a.order - b.order);
  let maxWidth = 0;
  let maxHeight = 0;
  for (const clip of sortedClips) {
    const libraryClip = libraryClips.find(lc => lc.id === clip.libraryClipId);
    if (libraryClip) {
      maxWidth = Math.max(maxWidth, libraryClip.metadata.width);
      maxHeight = Math.max(maxHeight, libraryClip.metadata.height);
    }
  }
  if (maxWidth > 1920) {
    maxHeight = Math.round((maxHeight / maxWidth) * 1920);
    maxWidth = 1920;
  }
  if (maxHeight > 1080) {
    maxWidth = Math.round((maxWidth / maxHeight) * 1080);
    maxHeight = 1080;
  }
  const firstClip = sortedClips[0];
  const firstLibraryClip = libraryClips.find(lc => lc.id === firstClip.libraryClipId);
  let targetWidth = maxWidth;
  let targetHeight = maxHeight;
  if (firstLibraryClip) {
    const firstAspectRatio = firstLibraryClip.metadata.width / firstLibraryClip.metadata.height;
    if (maxWidth / maxHeight > firstAspectRatio) {
      targetWidth = Math.round(maxHeight * firstAspectRatio);
      targetHeight = maxHeight;
    } else {
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth / firstAspectRatio);
    }
  }
  const videoBitrate = Math.max(2, Math.min(8, (targetWidth * targetHeight) / 414720));
  return {
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    framerate: 30,
    width: targetWidth,
    height: targetHeight,
    videoBitrate,
    audioBitrate: 128,
    aspectRatioMode: 'letterbox',
  };
}

/**
 * Clean up temporary files
 */
export function cleanupTempFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FFmpeg] Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error(`[FFmpeg] Failed to clean up temp file ${filePath}:`, error);
    }
  }
}

/**
 * Export video sequence - main export orchestrator
 */
export async function exportVideoSequence(
  params: ExportParams,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { clips, libraryClips, outputPath, settings } = params;
  const tempFiles: string[] = [];
  try {
    const sortedClips = [...clips].sort((a, b) => a.order - b.order);
    if (sortedClips.length === 0) throw new Error('Cannot export: timeline is empty');
    for (const clip of sortedClips) {
      const libraryClip = libraryClips.find(lc => lc.id === clip.libraryClipId);
      if (!libraryClip) throw new Error(`Library clip not found for timeline clip ${clip.id}`);
      if (!fs.existsSync(libraryClip.path)) throw new Error(`Source file not found: ${libraryClip.path}`);
    }
    const trimmedSegments: string[] = [];
    const trimProgressWeight = 0.1;
    onProgress?.(0);
    console.log(`[FFmpeg] Starting export with ${sortedClips.length} clip(s)`);
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const libraryClip = libraryClips.find(lc => lc.id === clip.libraryClipId)!;
      const tempDir = os.tmpdir();
      // Use clip index in filename to ensure uniqueness
      const segmentPath = path.join(tempDir, `ollo_segment_${i}_${clip.id}_${Date.now()}.mp4`);
      tempFiles.push(segmentPath);
      console.log(`[FFmpeg] Processing clip ${i + 1}/${sortedClips.length}: ${libraryClip.filename}`);
      console.log(`[FFmpeg] Trim: ${clip.trimStart.toFixed(2)}s to ${clip.trimEnd.toFixed(2)}s, segment: ${segmentPath}`);
      // Pass settings to normalize all segments to same resolution/framerate for concat
      const trimCommand = generateTrimCommand(
        libraryClip.path,
        clip.trimStart,
        clip.trimEnd,
        segmentPath,
        settings // Normalize to target export settings
      );
      await executeFFmpegCommand(trimCommand, clip.trimEnd - clip.trimStart);
      // Verify segment was created
      if (!fs.existsSync(segmentPath)) {
        throw new Error(`Failed to create trimmed segment: ${segmentPath}`);
      }
      const segmentSize = fs.statSync(segmentPath).size;
      console.log(`[FFmpeg] Segment ${i + 1} created: ${segmentPath} (${segmentSize} bytes)`);
      trimmedSegments.push(segmentPath);
      const trimProgress = ((i + 1) / sortedClips.length) * trimProgressWeight * 100;
      onProgress?.(trimProgress);
    }
    console.log(`[FFmpeg] All ${trimmedSegments.length} segments created, creating concat list...`);
    const concatListPath = createConcatList(trimmedSegments);
    tempFiles.push(concatListPath);
    // Log concat list contents for debugging
    const concatListContent = fs.readFileSync(concatListPath, 'utf8');
    console.log(`[FFmpeg] Concat list contents:\n${concatListContent}`);
    onProgress?.(trimProgressWeight * 100 + 5);
    const concatCommand = generateConcatCommand(concatListPath, outputPath, settings);
    const totalDuration = sortedClips.reduce((sum, clip) => sum + (clip.trimEnd - clip.trimStart), 0);
    let concatProgressStart = trimProgressWeight * 100 + 5;
    await executeFFmpegCommand(concatCommand, totalDuration, (progress) => {
      const mappedProgress = concatProgressStart + (progress * (100 - concatProgressStart) / 100);
      onProgress?.(mappedProgress);
    });
    onProgress?.(100);
    console.log(`[FFmpeg] Export completed: ${outputPath}`);
  } catch (error) {
    cleanupTempFiles(tempFiles);
    throw error;
  } finally {
    cleanupTempFiles(tempFiles);
  }
}
