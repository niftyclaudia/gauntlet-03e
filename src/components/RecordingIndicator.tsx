/**
 * Recording Indicator Component
 * 
 * Overlay showing recording status with pulsing red dot, timer, and stop button
 */

import React, { useEffect, useState } from 'react';
import AudioLevelMeter from './AudioLevelMeter';

interface RecordingIndicatorProps {
  /** Current elapsed time in seconds */
  elapsedSeconds: number;
  /** Audio level (0-100) if audio is enabled */
  audioLevel?: number;
  /** Whether audio is enabled */
  audioEnabled: boolean;
  /** Callback when stop button is clicked */
  onStop: () => void;
}

const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  elapsedSeconds,
  audioLevel = 0,
  audioEnabled,
  onStop,
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recording-indicator">
      <div className="recording-indicator-content">
        <div className="recording-dot" />
        <span className="recording-timer">{formatTime(elapsedSeconds)}</span>
        {audioEnabled && (
          <div className="audio-meter-container">
            <AudioLevelMeter level={audioLevel} />
          </div>
        )}
        <button className="recording-stop-button" onClick={onStop} title="Stop Recording">
          ⏹
        </button>
      </div>
    </div>
  );
};

export default RecordingIndicator;
