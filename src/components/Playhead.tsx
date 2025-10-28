/**
 * Playhead Component
 * 
 * Red vertical line showing current time position on timeline
 */

import React from 'react';

interface PlayheadProps {
  /** Current playhead position in seconds */
  position: number;
  /** Timeline zoom level (1.0 to 10.0) */
  zoom: number;
  /** Height of timeline in pixels */
  timelineHeight: number;
}

const Playhead: React.FC<PlayheadProps> = ({ position, zoom, timelineHeight }) => {
  // Pixels per second at 100% zoom - matches timelineCalculations.ts
  const BASE_PIXELS_PER_SECOND = 10;
  const xPosition = position * zoom * BASE_PIXELS_PER_SECOND;

  return (
    <div
      className="playhead"
      style={{
        position: 'absolute',
        left: `${xPosition}px`,
        top: 0,
        bottom: 0,
        width: '2px',
        backgroundColor: '#ff0000',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

export default Playhead;

