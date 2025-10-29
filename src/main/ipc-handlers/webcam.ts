import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'ffmpeg-static';

// Types for webcam recording
export interface EncodedRecording {
  filePath: string;
  duration: number;
  width: number;
  height: number;
  thumbnailPath?: string;
}

export interface WebcamRecordingParams {
  recordedBlob: ArrayBuffer | Buffer; // Accept both ArrayBuffer (from renderer) and Buffer
  outputPath: string;
  mimeType: string;
  videoDimensions: { width: number; height: number };
}

// Ensure recordings directory exists
function ensureRecordingsDir(): string {
  const userDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' ? 
      path.join(os.homedir(), 'Library', 'Application Support', 'ollo') : 
      path.join(os.homedir(), '.config', 'ollo'));
  
  const recordingsDir = path.join(userDataPath, 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
  return recordingsDir;
}

// Generate unique filename for recording
function generateRecordingFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `Webcam_${timestamp}.mp4`;
}

// Extract video metadata using FFmpeg (since ffprobe may not be available)
async function extractVideoMetadata(filePath: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) {
      reject(new Error('FFmpeg binary not found'));
      return;
    }

    // Run FFmpeg with -i flag to get file info
    // FFmpeg outputs metadata to stderr
    const ffmpegProcess = spawn(ffmpeg as string, ['-i', filePath]);
    let stderr = '';

    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', (code) => {
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

        // Extract resolution (format: Stream #0:0: Video: ... 1920x1080)
        const videoStreamMatch = stderr.match(/Stream #\d+:\d+.*Video: .*?(\d{2,5})x(\d{2,5})/);
        if (!videoStreamMatch) {
          reject(new Error('Could not extract video stream information'));
          return;
        }
        const width = parseInt(videoStreamMatch[1], 10);
        const height = parseInt(videoStreamMatch[2], 10);

        resolve({ duration, width, height });
      } catch (error) {
        reject(new Error(`Failed to parse FFmpeg output: ${error}`));
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

// Encode webcam recording using FFmpeg
async function encodeWebcamRecording(params: WebcamRecordingParams): Promise<EncodedRecording> {
  const { recordedBlob, outputPath, mimeType } = params;
  
  // Create temporary input file
  const tempDir = os.tmpdir();
  const inputExt = mimeType.includes('webm') ? 'webm' : 'mp4';
  const tempInputPath = path.join(tempDir, `webcam-input-${Date.now()}.${inputExt}`);
  const tempThumbnailPath = path.join(tempDir, `webcam-thumb-${Date.now()}.jpg`);

  console.log('[Webcam] encodeWebcamRecording called', {
    blobType: typeof recordedBlob,
    blobSize: recordedBlob instanceof ArrayBuffer ? recordedBlob.byteLength : recordedBlob.length,
    outputPath,
    mimeType
  });
  
  try {
    // Convert ArrayBuffer to Buffer if needed
    const buffer = recordedBlob instanceof Buffer ? recordedBlob : Buffer.from(recordedBlob);
    
    console.log('[Webcam] Writing recording blob to temp file:', {
      size: buffer.length,
      tempPath: tempInputPath,
      tempDir: tempDir,
      mimeType,
      inputExt,
      outputPath
    });
    
    // Write blob to temporary file
    fs.writeFileSync(tempInputPath, buffer);
    console.log('[Webcam] File write complete, verifying...');
    
    // Verify file was written
    if (!fs.existsSync(tempInputPath)) {
      throw new Error(`Temp file was not created at ${tempInputPath}`);
    }
    
    const stats = fs.statSync(tempInputPath);
    console.log('[Webcam] Temp file verified:', {
      path: tempInputPath,
      size: stats.size,
      exists: fs.existsSync(tempInputPath)
    });
    
    if (stats.size === 0) {
      throw new Error('Recorded blob is empty');
    }
    
    // Additional validation for WebM files
    if (inputExt === 'webm' && stats.size < 1000) {
      console.warn('[Webcam] WebM file is very small, might be corrupted:', stats.size, 'bytes');
    }

    // Verify FFmpeg binary exists
    if (!ffmpeg) {
      throw new Error('FFmpeg binary not found');
    }
    
    console.log('[Webcam] FFmpeg binary path:', ffmpeg);
    console.log('[Webcam] FFmpeg binary exists:', fs.existsSync(ffmpeg));
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      console.log('[Webcam] Creating output directory:', outputDir);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('[Webcam] Output path will be:', outputPath);
    console.log('[Webcam] Output directory exists:', fs.existsSync(outputDir));

    // FFmpeg command for encoding with better error handling
    const ffmpegArgs = [
      '-i', tempInputPath,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-r', '30',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-avoid_negative_ts', 'make_zero', // Handle timestamp issues
      '-fflags', '+genpts', // Generate presentation timestamps
      '-y', // Overwrite output file
      outputPath
    ];

    // Execute FFmpeg encoding
    await new Promise<void>((resolve, reject) => {
      console.log('[Webcam] Starting FFmpeg encoding');
      console.log('[Webcam] FFmpeg binary:', ffmpeg);
      console.log('[Webcam] FFmpeg args:', ffmpegArgs.join(' '));
      
      const ffmpegProcess = spawn(ffmpeg as string, ffmpegArgs);
      
      let stderr = '';
      let stdout = '';
      
      ffmpegProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        console.log('[Webcam] FFmpeg encoding finished with code:', code);
        console.log('[Webcam] Output file exists after encoding:', fs.existsSync(outputPath));
        
        if (code !== 0) {
          console.error('[Webcam] FFmpeg stderr:', stderr);
          console.error('[Webcam] FFmpeg stdout:', stdout);
          console.error('[Webcam] Input file still exists:', fs.existsSync(tempInputPath));
          console.error('[Webcam] Output file exists:', fs.existsSync(outputPath));
          
          // Provide more specific error messages
          let errorMessage = `FFmpeg encoding failed: ${stderr}`;
          if (stderr.includes('End of file')) {
            errorMessage = 'Recording file is corrupted or incomplete. Please try recording again.';
          } else if (stderr.includes('invalid as first byte')) {
            errorMessage = 'Recording file format is invalid. Please try recording again.';
          } else if (stderr.includes('No such file')) {
            errorMessage = 'Recording file not found. Please try recording again.';
          }
          
          reject(new Error(errorMessage));
        } else {
          // Verify output file was created
          if (!fs.existsSync(outputPath)) {
            reject(new Error('FFmpeg succeeded but output file was not created'));
            return;
          }
          
          const outputStats = fs.statSync(outputPath);
          console.log('[Webcam] Output file created successfully:', {
            path: outputPath,
            size: outputStats.size
          });
          resolve();
        }
      });
      
      ffmpegProcess.on('error', (error) => {
        console.error('[Webcam] FFmpeg process error:', error);
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });

    // Generate thumbnail
    await new Promise<void>((resolve, reject) => {
      const thumbnailArgs = [
        '-i', outputPath,
        '-ss', '0',
        '-vframes', '1',
        '-y',
        tempThumbnailPath
      ];

      const thumbnailProcess = spawn(ffmpeg as string, thumbnailArgs);
      
      let stderr = '';
      thumbnailProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      thumbnailProcess.on('close', (code) => {
        if (code !== 0) {
          console.warn(`Thumbnail generation failed: ${stderr}`);
          resolve(); // Don't fail the whole process for thumbnail
        } else {
          resolve();
        }
      });
    });

    // Extract metadata
    const metadata = await extractVideoMetadata(outputPath);
    
    // Move thumbnail to recordings directory if it exists
    let finalThumbnailPath: string | undefined;
    if (fs.existsSync(tempThumbnailPath)) {
      const thumbnailExt = path.extname(tempThumbnailPath);
      const thumbnailName = path.basename(outputPath, '.mp4') + thumbnailExt;
      finalThumbnailPath = path.join(path.dirname(outputPath), thumbnailName);
      fs.renameSync(tempThumbnailPath, finalThumbnailPath);
    }

    return {
      filePath: outputPath,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      thumbnailPath: finalThumbnailPath
    };

  } finally {
    // Clean up temporary files
    if (fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    }
    if (fs.existsSync(tempThumbnailPath)) {
      fs.unlinkSync(tempThumbnailPath);
    }
  }
}

// IPC Handler: encode-webcam-recording
async function handleEncodeWebcamRecording(_event: Electron.IpcMainInvokeEvent, params: WebcamRecordingParams): Promise<EncodedRecording> {
  try {
    console.log('[Webcam IPC] handleEncodeWebcamRecording called with params:', {
      blobSize: params.recordedBlob instanceof ArrayBuffer ? params.recordedBlob.byteLength : params.recordedBlob.length,
      outputPath: params.outputPath,
      mimeType: params.mimeType,
      videoDimensions: params.videoDimensions
    });
    
    const recordingsDir = ensureRecordingsDir();
    console.log('[Webcam IPC] Recordings directory:', recordingsDir);
    
    // Use provided outputPath or generate one
    const outputPath = params.outputPath 
      ? path.join(recordingsDir, params.outputPath)
      : path.join(recordingsDir, generateRecordingFilename());
    
    console.log('[Webcam IPC] Full output path will be:', outputPath);

    const result = await encodeWebcamRecording({
      ...params,
      outputPath
    });

    console.log('[Webcam IPC] Encoding complete, result:', result);
    return result;
  } catch (error) {
    console.error('[Webcam IPC] Webcam recording encoding failed:', error);
    throw new Error(`Failed to encode webcam recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// IPC Handler: check-camera-permission
async function handleCheckCameraPermission(): Promise<boolean> {
  // In Electron, camera permission is handled by the browser's getUserMedia API
  // This is a placeholder that always returns true
  // The actual permission check happens in the renderer process
  return true;
}

// IPC Handler: check-microphone-permission
async function handleCheckMicrophonePermission(): Promise<boolean> {
  // In Electron, microphone permission is handled by the browser's getUserMedia API
  // This is a placeholder that always returns true
  // The actual permission check happens in the renderer process
  return true;
}

// Register all webcam IPC handlers
export function registerWebcamHandlers(): void {
  console.log('[Webcam IPC] Registering webcam handlers...');
  
  ipcMain.handle('encode-webcam-recording', handleEncodeWebcamRecording);
  ipcMain.handle('check-camera-permission', handleCheckCameraPermission);
  ipcMain.handle('check-microphone-permission', handleCheckMicrophonePermission);
  
  console.log('[Webcam IPC] Webcam handlers registered successfully');
}
