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
import { VideoClip } from './types/video';

const App: React.FC = () => {
  // Library state
  const [library, setLibrary] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

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
      <Timeline />
    </div>
  );
};

export default App;

