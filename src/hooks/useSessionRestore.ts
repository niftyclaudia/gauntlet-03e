/**
 * Session restore hook
 * 
 * Checks for autosave file on mount and prompts user to restore session
 * Handles age checking (24-hour threshold), file validation, and state restoration
 */

import { useEffect, useRef } from 'react';
import { VideoClip, TimelineClip } from '../types/video';
import { deserializeProjectState, filterValidFilePaths } from '../utils/projectStateUtils';

interface RestoredState {
  library: VideoClip[];
  timeline: TimelineClip[];
  selectedClipId: string | null;
  currentPlayheadPosition: number;
  timelineZoom: number;
  timelineScrollPosition: number;
}

interface UseSessionRestoreParams {
  /** Callback to restore state in App component */
  onRestore: (state: RestoredState) => void;
}

/**
 * Session restore hook that checks for autosave file on mount
 * Shows restore dialog if file exists and is recent (< 24 hours)
 * Validates file paths and filters out missing files
 * All errors are handled gracefully (start fresh if restore fails)
 */
export function useSessionRestore({ onRestore }: UseSessionRestoreParams): void {
  // Use ref to prevent multiple restore attempts
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasCheckedRef.current) {
      return;
    }
    hasCheckedRef.current = true;

    // Check for autosave file and restore if needed
    const checkAndRestore = async () => {
      try {
        // Check file age first
        const age = await window.electron.getAutosaveAge();

        // If file doesn't exist, start fresh
        if (age === null) {
          return;
        }

        // If file is >= 24 hours old (86400000 ms), delete and start fresh
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (age >= TWENTY_FOUR_HOURS) {
          console.log('[SessionRestore] Autosave file is too old, deleting');
          await window.electron.deleteAutosave();
          return;
        }

        // File exists and is recent - load it
        const savedState = await window.electron.loadProject();

        // If load failed (null), start fresh
        if (!savedState) {
          console.log('[SessionRestore] Failed to load autosave file, starting fresh');
          return;
        }

        // Deserialize state
        const deserialized = deserializeProjectState(savedState);
        if (!deserialized) {
          console.error('[SessionRestore] Failed to deserialize saved state, deleting and starting fresh');
          await window.electron.deleteAutosave();
          return;
        }

        // Show restore dialog
        const choice = await window.electron.showRestoreDialog(savedState.timestamp);
        
        if (choice === null) {
          // Dialog cancelled - start fresh
          return;
        }

        if (choice === 'fresh') {
          // User chose to start fresh - delete autosave file
          await window.electron.deleteAutosave();
          return;
        }

        // User chose to restore - validate file paths and restore state
        const { validLibrary, validTimeline } = await filterValidFilePaths(
          deserialized.library,
          deserialized.timeline,
          window.electron.validateFileExists
        );

        // Update selectedClipId if clip exists
        let selectedClipId = deserialized.selectedClipId;
        if (selectedClipId) {
          const clipExists = validLibrary.some(clip => clip.id === selectedClipId) ||
                           validTimeline.some(clip => clip.id === selectedClipId);
          if (!clipExists) {
            selectedClipId = null;
          }
        }

        // Restore state via callback
        onRestore({
          library: validLibrary,
          timeline: validTimeline,
          selectedClipId,
          currentPlayheadPosition: deserialized.currentPlayheadPosition,
          timelineZoom: deserialized.timelineZoom,
          timelineScrollPosition: deserialized.timelineScrollPosition,
        });

        console.log('[SessionRestore] Session restored successfully');
      } catch (error) {
        // Any error during restore - start fresh
        console.error('[SessionRestore] Error during restore, starting fresh:', error);
        try {
          await window.electron.deleteAutosave();
        } catch (deleteError) {
          // Ignore delete errors
          console.error('[SessionRestore] Failed to delete autosave file:', deleteError);
        }
      }
    };

    // Run check asynchronously (don't block mount)
    checkAndRestore();
  }, [onRestore]); // onRestore should be stable (useCallback in App)
}

