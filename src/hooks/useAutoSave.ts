/**
 * Auto-save hook
 * 
 * Automatically saves project state every 30 seconds when timeline has clips
 * Completely transparent operation - no UI indication
 */

import { useEffect, useRef } from 'react';
import { VideoClip, TimelineClip } from '../types/video';
import { serializeProjectState } from '../utils/projectStateUtils';

interface UseAutoSaveParams {
  /** Array of imported video clips */
  library: VideoClip[];
  /** Array of timeline clips */
  timeline: TimelineClip[];
  /** Currently selected clip ID or null */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Timeline zoom level (1.0 to 10.0) */
  timelineZoom: number;
  /** Timeline horizontal scroll position in pixels */
  timelineScrollPosition: number;
  /** Whether export is in progress (skip save during export) */
  isExporting: boolean;
  /** Callback called when auto-save completes successfully */
  onSaveComplete?: () => void;
}

/**
 * Auto-save hook that saves project state every 30 seconds
 * Only saves when timeline has clips
 * Skips save during export
 * All errors are handled silently (logged to console only)
 */
export function useAutoSave({
  library,
  timeline,
  selectedClipId,
  currentPlayheadPosition,
  timelineZoom,
  timelineScrollPosition,
  isExporting,
  onSaveComplete,
}: UseAutoSaveParams): void {
  // Use ref to track latest values without causing re-renders
  const stateRef = useRef({
    library,
    timeline,
    selectedClipId,
    currentPlayheadPosition,
    timelineZoom,
    timelineScrollPosition,
    isExporting,
    onSaveComplete,
  });

  // Update ref when values change
  useEffect(() => {
    stateRef.current = {
      library,
      timeline,
      selectedClipId,
      currentPlayheadPosition,
      timelineZoom,
      timelineScrollPosition,
      isExporting,
      onSaveComplete,
    };
  }, [library, timeline, selectedClipId, currentPlayheadPosition, timelineZoom, timelineScrollPosition, isExporting, onSaveComplete]);

  useEffect(() => {
    // Only set up interval if timeline has clips
    if (timeline.length === 0) {
      console.log('[AutoSave] Timeline empty, skipping auto-save setup');
      return;
    }

    console.log(`[AutoSave] Setting up auto-save interval (timeline has ${timeline.length} clips)`);

    // DEBUG: For testing, use 5 seconds instead of 30. Change back to 30000 for production
    const AUTOSAVE_INTERVAL = 30000; // 30 seconds (change to 5000 for quick testing)

    // Set up interval to save every 30 seconds (30000 ms)
    const intervalId = setInterval(() => {
      // Get latest state from ref
      const currentState = stateRef.current;

      console.log('[AutoSave] Interval triggered, checking conditions...');

      // Skip save if timeline is empty
      if (currentState.timeline.length === 0) {
        console.log('[AutoSave] Timeline empty, skipping save');
        return;
      }

      // Skip save during export
      if (currentState.isExporting) {
        console.log('[AutoSave] Export in progress, skipping save');
        return;
      }

      console.log('[AutoSave] Saving project state...', {
        libraryClips: currentState.library.length,
        timelineClips: currentState.timeline.length,
        selectedClipId: currentState.selectedClipId,
      });

      // Serialize current state
      const savedState = serializeProjectState(
        currentState.library,
        currentState.timeline,
        currentState.selectedClipId,
        currentState.currentPlayheadPosition,
        currentState.timelineZoom,
        currentState.timelineScrollPosition
      );

      // Save to file via IPC (errors handled silently)
      window.electron.saveProject(savedState)
        .then(() => {
          console.log('[AutoSave] Project state saved successfully');
          // Notify that save completed (for UI indicator)
          if (stateRef.current.onSaveComplete) {
            stateRef.current.onSaveComplete();
          }
        })
        .catch((error) => {
          // Log error but don't interrupt workflow
          console.error('[AutoSave] Failed to save project state:', error);
        });
    }, AUTOSAVE_INTERVAL);

    // Cleanup: clear interval on unmount
    return () => {
      console.log('[AutoSave] Cleaning up auto-save interval');
      clearInterval(intervalId);
    };
  }, [timeline.length]); // Only re-run if timeline length changes

  // Note: We don't save on initial mount - only on interval
  // This prevents saving empty state when app first loads
}

