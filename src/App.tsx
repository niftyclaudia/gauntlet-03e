/**
 * Root React component for ollo video editor
 * 
 * Implements three-panel layout:
 * - Library (left, 20% width): Video clip library
 * - Preview (center, ~40% width): Video player/preview
 * - Timeline (bottom, 30% height): Timeline editing interface
 */

import React, { useState } from 'react';
import Library from './components/Library';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import { VideoClip, TimelineClip } from './types/video';
import { addClipToTimeline, reorderTimelineClip, removeClipFromTimeline } from './utils/timelineOperations';

const App: React.FC = () => {
  // Library state
  const [library, setLibrary] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
  const [timelineScrollPosition, setTimelineScrollPosition] = useState<number>(0);
  const [currentPlayheadPosition, setCurrentPlayheadPosition] = useState<number>(0);

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
   * Handle clearing all clips from timeline
   * NOTE: This only clears the timeline, NOT the library
   */
  const handleClearAll = () => {
    setTimeline([]);
    setSelectedClipId(null);
    console.log(`[App] Cleared all clips from timeline`);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <Library 
          library={library}
          onImportComplete={handleImportComplete}
          onSelectClip={handleSelectClip}
        />
        <VideoPlayer />
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
      />
    </div>
  );
};

export default App;

