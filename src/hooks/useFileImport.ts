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

import { useState } from 'react';
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

  const clearMessages = () => {
    setError(null);
    setWarning(null);
  };

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
          // Validate file extension
          const validation = validateVideoFile(filePath);
          
          if (!validation.valid) {
            setError(validation.error || 'Invalid file');
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
        } catch (fileError) {
          const errorMsg = `Failed to import ${filename}: ${fileError}`;
          setError(errorMsg);
          console.error(`[Import] ${errorMsg}`, fileError);
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


