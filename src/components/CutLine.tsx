/**
 * Cut Line Component
 * 
 * Visual indicator that shows exactly where a split will occur.
 * Follows the playhead and only appears when over a clip.
 * CapCut-style red line with subtle animation.
 */

import React from 'react';

interface CutLineProps {
  /** X position in pixels where cut line should appear */
  position: number;
  /** Whether the cut line should be visible */
  visible: boolean;
  /** Height of the timeline in pixels */
  timelineHeight?: number;
  /** CSS class name for styling */
  className?: string;
}

const CutLine: React.FC<CutLineProps> = ({
  position,
  visible,
  timelineHeight = 110,
  className = ''
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={`cut-line ${className}`}
      style={{
        position: 'absolute',
        left: `${position}px`,
        top: '0px',
        width: '2px',
        height: `${timelineHeight}px`,
        background: 'linear-gradient(to bottom, #ff6b6b, #ff5252)',
        zIndex: 100,
        pointerEvents: 'none',
        boxShadow: '0 0 8px rgba(255, 107, 107, 0.6)',
        animation: 'cutLinePulse 1.5s infinite ease-in-out',
      }}
    />
  );
};

export default CutLine;
