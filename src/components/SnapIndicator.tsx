/**
 * Snap Indicator Component
 * 
 * Visual feedback line that appears when trim handle snaps to grid.
 * Shows a highlighted vertical line at the snap point.
 */

import React from 'react';

interface SnapIndicatorProps {
  /** X position in pixels where snap line should appear */
  position: number;
  /** Whether the indicator should be visible */
  visible: boolean;
  /** Height of the timeline in pixels */
  timelineHeight?: number;
  /** CSS class name for styling */
  className?: string;
}

const SnapIndicator: React.FC<SnapIndicatorProps> = ({
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
      className={`snap-indicator ${className}`}
      style={{
        position: 'absolute',
        left: `${position}px`,
        top: '0px',
        width: '2px',
        height: `${timelineHeight}px`,
        backgroundColor: '#00ff00', // Bright green for visibility
        zIndex: 50,
        pointerEvents: 'none',
        boxShadow: '0 0 4px rgba(0, 255, 0, 0.8)',
      }}
    />
  );
};

export default SnapIndicator;
