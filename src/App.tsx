/**
 * Root React component for ollo video editor
 * 
 * Implements three-panel layout:
 * - Library (left, 20% width): Video clip library
 * - Preview (center, ~40% width): Video player/preview
 * - Timeline (bottom, 30% height): Timeline editing interface
 */

import React, { useState, useCallback } from 'react';
import Library from './components/Library';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import { VideoClip, TimelineClip } from './types/video';
import { addClipToTimeline, reorderTimelineClip, removeClipFromTimeline } from './utils/timelineOperations';
import { useAutoSave } from './hooks/useAutoSave';
import { useSessionRestore } from './hooks/useSessionRestore';
import { serializeProjectState } from './utils/projectStateUtils';

const App: React.FC = () => {
  // Library state
  const [library, setLibrary] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
  const [timelineScrollPosition, setTimelineScrollPosition] = useState<number>(0);
  const [currentPlayheadPosition, setCurrentPlayheadPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  /**
   * Handle completion of video import
   * Adds newly imported clips to library
   */
  const handleImportComplete = (newClips: VideoClip[]) => {
    setLibrary(prev => [...newClips, ...prev]); // Add new clips at top (most recent first)
    console.log(`[App] Imported ${newClips.length} clip(s). Library now has ${library.length + newClips.length} clips.`);
  };

  /**
   * Handle clip selection in Library
   * Will be used for preview in future PRs
   */
  const handleSelectClip = (clip: VideoClip) => {
    setSelectedClipId(clip.id);
    console.log(`[App] Selected clip: ${clip.filename}`);
  };

  /**
   * Handle adding clip from Library to Timeline
   */
  const handleAddClipToTimeline = (libraryClipId: string, insertionIndex?: number) => {
    setTimeline(prev => {
      const newTimeline = addClipToTimeline(libraryClipId, prev, library, insertionIndex);
      console.log(`[App] Added clip ${libraryClipId} to timeline at index ${insertionIndex ?? prev.length}. Timeline now has ${newTimeline.length} clip(s).`);
      return newTimeline;
    });
  };

  /**
   * Handle reordering clip on timeline
   */
  const handleReorderClip = (dragIndex: number, hoverIndex: number) => {
    setTimeline(prev => {
      const newTimeline = reorderTimelineClip(dragIndex, hoverIndex, prev);
      console.log(`[App] Reordered clip from index ${dragIndex} to ${hoverIndex}`);
      return newTimeline;
    });
  };

  /**
   * Handle clip selection on timeline
   */
  const handleTimelineSelectClip = (clipId: string | null) => {
    setSelectedClipId(clipId);
    if (clipId) {
      console.log(`[App] Selected timeline clip: ${clipId}`);
    } else {
      console.log(`[App] Deselected clip`);
    }
  };

  /**
   * Handle deleting clip from timeline
   */
  const handleDeleteClip = (clipId: string) => {
    setTimeline(prev => {
      const newTimeline = removeClipFromTimeline(clipId, prev);
      // Clear selection if deleted clip was selected
      if (selectedClipId === clipId) {
        setSelectedClipId(null);
      }
      console.log(`[App] Deleted clip ${clipId} from timeline. Timeline now has ${newTimeline.length} clip(s).`);
      return newTimeline;
    });
  };

  /**
   * Handle deleting clip from library
   * Also removes the clip from timeline if it's being used there
   */
  const handleDeleteLibraryClip = (clipId: string) => {
    setLibrary(prev => {
      const newLibrary = prev.filter(clip => clip.id !== clipId);
      console.log(`[App] Deleted clip ${clipId} from library. Library now has ${newLibrary.length} clip(s).`);
      return newLibrary;
    });

    // Also remove from timeline if it's being used there
    setTimeline(prev => {
      const newTimeline = removeClipFromTimeline(clipId, prev);
      if (newTimeline.length !== prev.length) {
        console.log(`[App] Also removed clip ${clipId} from timeline. Timeline now has ${newTimeline.length} clip(s).`);
      }
      return newTimeline;
    });

    // Clear selection if deleted clip was selected
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };

  /**
   * Handle clearing all clips from timeline
   * NOTE: This only clears the timeline, NOT the library
   */
  const handleClearAll = () => {
    setTimeline([]);
    setSelectedClipId(null);
    console.log(`[App] Cleared all clips from timeline`);
  };

  /**
   * Handle trim update - called after trim operation completes via IPC
   */
  const handleTrimUpdate = (clipId: string, trimStart: number, trimEnd: number) => {
    setTimeline(prev => {
      return prev.map(clip => {
        if (clip.id === clipId) {
          console.log(`[App] Updated trim for clip ${clipId}: trimStart=${trimStart.toFixed(2)}s, trimEnd=${trimEnd.toFixed(2)}s`);
          return {
            ...clip,
            trimStart,
            trimEnd,
          };
        }
        return clip;
      });
    });
  };

  /**
   * Handle restoring state from autosave
   * Called by useSessionRestore hook when user chooses to restore
   */
  const handleRestoreState = useCallback((restoredState: {
    library: VideoClip[];
    timeline: TimelineClip[];
    selectedClipId: string | null;
    currentPlayheadPosition: number;
    timelineZoom: number;
    timelineScrollPosition: number;
  }) => {
    console.log('[App] Restoring state from autosave:', {
      clips: restoredState.library.length,
      timeline: restoredState.timeline.length,
      playheadPosition: restoredState.currentPlayheadPosition,
      selectedClipId: restoredState.selectedClipId,
    });
    
    // Restore library and timeline first
    setLibrary(restoredState.library);
    setTimeline(restoredState.timeline);
    
    // Restore other state
    setTimelineZoom(restoredState.timelineZoom);
    setTimelineScrollPosition(restoredState.timelineScrollPosition);
    
    // Restore selected clip (this triggers video loading)
    setSelectedClipId(restoredState.selectedClipId);
    
    // Restore playhead position LAST (after clips are loaded)
    // Use setTimeout to ensure clips have time to load first
    setTimeout(() => {
      console.log('[App] Setting restored playhead position:', restoredState.currentPlayheadPosition);
      setCurrentPlayheadPosition(restoredState.currentPlayheadPosition);
    }, 100);
    
    console.log('[App] State restored from autosave');
  }, []);

  /**
   * Save project state before export starts
   * Called by export handler (PR-8) before starting export
   * Only saves if timeline has clips
   * Errors are handled silently (logged only)
   */
  const handleBeforeExport = useCallback(async () => {
    // Only save if timeline has clips
    if (timeline.length === 0) {
      return;
    }

    try {
      const savedState = serializeProjectState(
        library,
        timeline,
        selectedClipId,
        currentPlayheadPosition,
        timelineZoom,
        timelineScrollPosition
      );

      await window.electron.saveProject(savedState);
      console.log('[App] Project state saved before export');
    } catch (error) {
      // Log error but don't interrupt export
      console.error('[App] Failed to save project state before export:', error);
    }
  }, [library, timeline, selectedClipId, currentPlayheadPosition, timelineZoom, timelineScrollPosition]);

  /**
   * Handle auto-save completion - update timestamp in status bar
   */
  const handleAutoSaveComplete = useCallback(() => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLastSavedTime(timeString);
  }, []);

  // Auto-save hook: saves state every 30 seconds when timeline has clips
  useAutoSave({
    library,
    timeline,
    selectedClipId,
    currentPlayheadPosition,
    timelineZoom,
    timelineScrollPosition,
    isExporting,
    onSaveComplete: handleAutoSaveComplete,
  });

  // Session restore hook: checks for autosave file on mount and prompts to restore
  useSessionRestore({
    onRestore: handleRestoreState,
  });

  return (
    <div className="app-container">
      {/* Auto-save status bar (top of app, below title bar) */}
      {lastSavedTime && (
        <div className="autosave-status-bar">
          <span className="autosave-status-text">Auto saved: {lastSavedTime}</span>
        </div>
      )}
      <div className="main-content" style={{ marginTop: lastSavedTime ? '22px' : '0' }}>
        <Library 
          library={library}
          onImportComplete={handleImportComplete}
          onSelectClip={handleSelectClip}
          selectedClipId={selectedClipId}
          onDeleteClip={handleDeleteLibraryClip}
        />
        <VideoPlayer
          selectedClipId={selectedClipId}
          library={library}
          timeline={timeline}
          currentPlayheadPosition={currentPlayheadPosition}
          onPlayheadChange={setCurrentPlayheadPosition}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          onSelectClip={handleTimelineSelectClip}
          onBeforeExport={handleBeforeExport}
        />
      </div>
      <Timeline
        timeline={timeline}
        library={library}
        selectedClipId={selectedClipId}
        currentPlayheadPosition={currentPlayheadPosition}
        timelineZoom={timelineZoom}
        timelineScrollPosition={timelineScrollPosition}
        onAddClip={handleAddClipToTimeline}
        onReorderClip={handleReorderClip}
        onSelectClip={handleTimelineSelectClip}
        onDeleteClip={handleDeleteClip}
        onClearAll={handleClearAll}
        onZoomChange={setTimelineZoom}
        onScrollChange={setTimelineScrollPosition}
        onPlayheadChange={setCurrentPlayheadPosition}
        onTrimUpdate={handleTrimUpdate}
      />
    </div>
  );
};

export default App;

