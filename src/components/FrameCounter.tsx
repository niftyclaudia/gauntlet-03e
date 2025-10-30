/**
 * Frame Counter Component
 * 
 * Displays timecode in HH:MM:SS:FF format for frame-precise editing.
 * Converts time in seconds to hours:minutes:seconds:frames display.
 */

import React from 'react';

interface FrameCounterProps {
  /** Time in seconds */
  time: number;
  /** Video framerate (default 30fps) */
  framerate?: number;
  /** CSS class name for styling */
  className?: string;
}

const FrameCounter: React.FC<FrameCounterProps> = ({
  time,
  framerate = 30,
  className = ''
}) => {
  // Convert time to hours, minutes, seconds, and frames
  const totalSeconds = Math.floor(time);
  const frames = Math.round((time - totalSeconds) * framerate);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // Format with leading zeros
  const formatNumber = (num: number, digits = 2): string => {
    return num.toString().padStart(digits, '0');
  };
  
  const timecode = `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}:${formatNumber(frames, 2)}`;
  
  return (
    <span className={`frame-counter ${className}`}>
      {timecode}
    </span>
  );
};

export default FrameCounter;
