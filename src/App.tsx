/**
 * Root React component for ollo video editor
 * 
 * Implements three-panel layout:
 * - Library (left, 20% width): Video clip library
 * - Preview (center, ~40% width): Video player/preview
 * - Timeline (bottom, 30% height): Timeline editing interface
 */

import React from 'react';
import Library from './components/Library';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <div className="main-content">
        <Library />
        <VideoPlayer />
      </div>
      <Timeline />
    </div>
  );
};

export default App;

