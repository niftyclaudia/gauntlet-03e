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
    <div className="flex-shrink-0 flex items-center gap-3 py-2">
      {/* Play/Pause button */}
      <button
        className="bg-[#0066cc] text-white border-none rounded-md w-10 h-10 text-lg cursor-pointer flex items-center justify-center transition-colors hover:bg-[#0052a3] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed flex-shrink-0"
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
        className="flex-1 h-1.5 rounded-sm bg-[#333333] outline-none cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066cc] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-[#0052a3] [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0066cc] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-colors [&::-moz-range-thumb]:hover:bg-[#0052a3] [&::-moz-range-thumb]:hover:scale-125 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="text-xs font-mono text-white min-w-[120px] text-right flex-shrink-0">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </div>
    </div>
  );
};

export default PlayerControls;

