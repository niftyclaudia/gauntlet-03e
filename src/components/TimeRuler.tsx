/**
 * Time Ruler Component
 * 
 * Displays timecode (HH:MM:SS.mmm) above timeline
 */

import React from 'react';

interface TimeRulerProps {
  /** Current playhead position in seconds */
  currentTime: number;
  /** Timeline zoom level (1.0 to 10.0) */
  zoom: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Width of timeline viewport in pixels */
  timelineWidth: number;
}

const TimeRuler: React.FC<TimeRulerProps> = ({
  currentTime,
  zoom,
  totalDuration,
  timelineWidth,
}) => {
  /**
   * Format time in seconds to HH:MM:SS.mmm
   */
  const formatTimecode = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');
    const msStr = String(milliseconds).padStart(3, '0');

    return `${hoursStr}:${minutesStr}:${secsStr}.${msStr}`;
  };

  return (
    <div className="time-ruler">
      <div className="time-ruler-current-time">
        {formatTimecode(currentTime)}
      </div>
    </div>
  );
};

export default TimeRuler;

