/**
 * Player Controls Component
 * 
 * Displays playback controls: Play/Pause button, progress bar, time display
 */

import React, { useRef } from 'react';
import { formatDuration } from '../utils/formatDuration';

interface PlayerControlsProps {
  /** Whether video is currently playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when play/pause button is clicked */
  onPlayPause: () => void;
  /** Callback when user seeks to new time */
  onSeek: (time: number) => void;
  /** Whether controls are disabled (e.g., no video loaded) */
  disabled?: boolean;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  disabled = false,
}) => {
  const progressBarRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  // Calculate progress percentage (0-100)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  /**
   * Handle progress bar change (user dragging)
   */
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * duration;
    onSeek(newTime);
  };

  /**
   * Handle progress bar mouse down (start dragging)
   */
  const handleProgressMouseDown = () => {
    isDraggingRef.current = true;
  };

  /**
   * Handle progress bar mouse up (end dragging)
   */
  const handleProgressMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="player-controls">
      {/* Play/Pause button */}
      <button
        className="player-play-pause-button"
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Progress bar */}
      <input
        ref={progressBarRef}
        type="range"
        className="player-progress-bar"
        min="0"
        max="100"
        step="0.1"
        value={progress}
        onChange={handleProgressChange}
        onMouseDown={handleProgressMouseDown}
        onMouseUp={handleProgressMouseUp}
        disabled={disabled}
        aria-label="Video progress"
      />

      {/* Time display */}
      <div className="player-time-display">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </div>
    </div>
  );
};

export default PlayerControls;

