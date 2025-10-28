/**
 * Video Player / Preview Panel Component
 * 
 * Displays video preview in center panel (~40% width).
 * For PR-1, shows gray placeholder.
 * Video playback functionality will be added in PR-4.
 */

import React from 'react';

const VideoPlayer: React.FC = () => {
  return (
    <div className="preview-panel">
      <div className="preview-placeholder">
        <div className="video-icon">▶</div>
      </div>
    </div>
  );
};

export default VideoPlayer;

