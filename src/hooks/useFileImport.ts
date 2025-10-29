/**
 * Custom hook for file import logic
 * 
 * Handles video file import process including:
 * - File validation
 * - Metadata extraction via FFmpeg
 * - Thumbnail generation
 * - Progress tracking
 * - Error handling
 */

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { VideoClip } from '../types/video';
import { validateVideoFile, getFilename } from '../utils/fileValidation';

export interface UseFileImportResult {
  /** Whether import is in progress */
  isImporting: boolean;
  /** Import progress message */
  importProgress: string;
  /** Handle file import from file paths */
  handleFileImport: (filePaths: string[]) => Promise<VideoClip[]>;
  /** Error message if import failed */
  error: string | null;
  /** Warning message (non-blocking) */
  warning: string | null;
  /** Clear error/warning messages */
  clearMessages: () => void;
}

export function useFileImport(): UseFileImportResult {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  // Refs to store timeout IDs for clearing timers
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearMessages = () => {
    // Clear any existing timeouts
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    
    setError(null);
    setWarning(null);
  };

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (error) {
      // Clear any existing timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      // Set new timeout
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, 5000); // 5 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  // Auto-dismiss warning messages after 3 seconds
  useEffect(() => {
    if (warning) {
      // Clear any existing timeout
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      
      // Set new timeout
      warningTimeoutRef.current = setTimeout(() => {
        setWarning(null);
        warningTimeoutRef.current = null;
      }, 3000); // 3 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [warning]);

  const handleFileImport = async (filePaths: string[]): Promise<VideoClip[]> => {
    if (filePaths.length === 0) {
      return [];
    }

    clearMessages();
    setIsImporting(true);
    const importedClips: VideoClip[] = [];

    try {
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const filename = getFilename(filePath);

        // Update progress
        setImportProgress(
          `Importing ${i + 1} of ${filePaths.length}: ${filename}...`
        );

        try {
          // Get file size for validation
          let fileSize: number = 0;
          try {
            fileSize = await window.electron.getFileSize(filePath);
          } catch (sizeError) {
            // If getting file size fails, skip size validation but log warning
            console.warn(`[Import] Could not get file size for ${filename}, skipping size check:`, sizeError);
          }
          
          // Validate file extension and size (if we got file size)
          const validation = validateVideoFile(filePath, fileSize > 0 ? fileSize : undefined);
          
          if (!validation.valid) {
            // Show user-friendly error message
            const userErrorMessage = validation.error || 'Invalid file format. Please use MP4 or MOV files.';
            setError(userErrorMessage);
            console.error(`[Import] Validation failed for ${filename}:`, validation.error);
            continue; // Skip this file, continue with others
          }

          // Show warning if large file (but continue)
          if (validation.warning) {
            setWarning(validation.warning);
            console.warn(`[Import] ${validation.warning}`);
          }

          // Generate UUID for clip
          const clipId = uuidv4();

          // Extract metadata with FFmpeg
          console.log(`[Import] Extracting metadata for ${filename}...`);
          const metadata = await window.electron.getMetadata(filePath);

          // Generate thumbnail with FFmpeg
          console.log(`[Import] Generating thumbnail for ${filename}...`);
          const thumbnailPath = await window.electron.getThumbnail(filePath, clipId);

          // Create VideoClip object
          const clip: VideoClip = {
            id: clipId,
            path: filePath,
            filename,
            duration: metadata.duration,
            thumbnail: thumbnailPath,
            metadata,
            importedAt: Date.now(),
          };

          importedClips.push(clip);
          console.log(`[Import] Successfully imported ${filename}`, clip);
        } catch (fileError: any) {
          // Extract user-friendly error message
          let userErrorMessage = `Failed to import ${filename}`;
          
          // Check for specific error types and provide friendly messages
          if (fileError?.message) {
            const errorMsg = fileError.message.toLowerCase();
            if (errorMsg.includes('file not found') || errorMsg.includes('not readable')) {
              userErrorMessage = `Cannot read file: ${filename}. Please check the file exists and you have permission to access it.`;
            } else if (errorMsg.includes('metadata')) {
              userErrorMessage = `Could not read video information from ${filename}. The file may be corrupted or in an unsupported format.`;
            } else if (errorMsg.includes('thumbnail')) {
              userErrorMessage = `Could not create thumbnail for ${filename}. The file may be corrupted.`;
            } else if (errorMsg.includes('too large') || errorMsg.includes('4gb')) {
              userErrorMessage = `File too large: ${filename}. Maximum file size is 4GB.`;
            } else if (errorMsg.includes('handler')) {
              // This is a technical error - probably app needs restart
              userErrorMessage = `Import temporarily unavailable. Please restart the app and try again.`;
            } else {
              // Generic error - still better than raw error
              userErrorMessage = `Could not import ${filename}. Please check the file is a valid MP4 or MOV video.`;
            }
          }
          
          setError(userErrorMessage);
          console.error(`[Import] ${userErrorMessage}`, fileError);
          // Continue with remaining files
        }
      }

      setImportProgress('');
      return importedClips;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    importProgress,
    handleFileImport,
    error,
    warning,
    clearMessages,
  };
}


