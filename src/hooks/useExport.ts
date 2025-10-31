/**
 * Custom hook for managing export state and operations
 * 
 * Handles export initialization, progress tracking, and completion
 */

import { useState, useCallback } from 'react';
import { TimelineClip, VideoClip, SavedProjectState, AdvancedExportSettings } from '../types/video';
import { TimelineDoc } from '../types/timeline';

export interface UseExportReturn {
  /** Whether export is in progress */
  isExporting: boolean;
  /** Export progress percentage (0-100) */
  progress: number;
  /** Export error message (null if no error) */
  error: string | null;
  /** Export output file path (set when export completes) */
  outputPath: string | null;
  /** Start export process */
  startExport: (clips: TimelineClip[], libraryClips: VideoClip[], projectState?: SavedProjectState, advancedSettings?: AdvancedExportSettings, timelineDoc?: TimelineDoc) => Promise<void>;
  /** Reset export state */
  reset: () => void;
}

/**
 * Hook for managing export state and operations
 * 
 * @returns Export state and handlers
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  /**
   * Generate default export filename with timestamp
   */
  const generateDefaultFilename = useCallback((): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `ollo_export_${year}${month}${day}_${hours}${minutes}${seconds}.mp4`;
  }, []);

  /**
   * Start export process
   */
  const startExport = useCallback(async (
    clips: TimelineClip[],
    libraryClips: VideoClip[],
    projectState?: SavedProjectState,
    advancedSettings?: AdvancedExportSettings,
    timelineDoc?: TimelineDoc
  ): Promise<void> => {
    try {
      console.log('[useExport] startExport called with:', {
        clipsCount: clips.length,
        libraryClipsCount: libraryClips.length,
        hasTimelineDoc: !!timelineDoc,
        timelineDocTracks: timelineDoc?.tracks?.length || 0,
        overlayTracks: timelineDoc ? timelineDoc.tracks.filter(t => t.role === 'overlay').length : 0
      });
      
      // Validate inputs
      if (clips.length === 0) {
        throw new Error('Cannot export: timeline is empty');
      }
      if (libraryClips.length === 0) {
        throw new Error('Cannot export: no library clips available');
      }

      // Reset state
      setIsExporting(true);
      setProgress(0);
      setError(null);
      setOutputPath(null);

      // Open save dialog with preset ID if provided
      const defaultFilename = generateDefaultFilename();
      const presetId = advancedSettings?.preset.id;
      const outputPath = await window.electron.showSaveDialog(defaultFilename, presetId);

      if (!outputPath) {
        // User cancelled
        setIsExporting(false);
        setProgress(0);
        return;
      }

      // Set up progress listener
      const removeProgressListener = window.electron.onExportProgress((progressValue) => {
        console.log('[useExport] Progress update:', progressValue);
        setProgress(progressValue);
      });

      try {
        console.log('[useExport] Calling window.electron.exportVideo with timelineDoc:', {
          hasTimelineDoc: !!timelineDoc,
          timelineDocTracks: timelineDoc?.tracks?.length || 0
        });
        // Start export (pass projectState, advancedSettings, and timelineDoc)
        await window.electron.exportVideo(clips, libraryClips, outputPath, projectState, advancedSettings, timelineDoc);

        // Success - set output path
        setOutputPath(outputPath);
        setProgress(100);
      } catch (exportError: any) {
        // Export failed
        const errorMessage = exportError?.message || 'Export failed';
        setError(errorMessage);
        console.error('[useExport] Export failed:', exportError);
      } finally {
        // Clean up progress listener
        removeProgressListener();
        setIsExporting(false);
      }
    } catch (err: any) {
      // General error (save dialog, etc.)
      const errorMessage = err?.message || 'Failed to start export';
      setError(errorMessage);
      setIsExporting(false);
      setProgress(0);
      console.error('[useExport] Failed to start export:', err);
    }
  }, [generateDefaultFilename]);

  /**
   * Reset export state
   */
  const reset = useCallback(() => {
    setIsExporting(false);
    setProgress(0);
    setError(null);
    setOutputPath(null);
  }, []);

  return {
    isExporting,
    progress,
    error,
    outputPath,
    startExport,
    reset,
  };
}

