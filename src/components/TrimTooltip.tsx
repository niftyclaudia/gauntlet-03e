/**
 * Trim Tooltip Component
 * 
 * Displays duration change during trim drag operation.
 * Shows original → new duration with change indicator.
 */

import React from 'react';
import { formatDuration } from '../utils/formatDuration';

interface TrimTooltipProps {
  /** Original duration before trim (seconds) */
  originalDuration: number;
  /** New duration after trim (seconds) */
  newDuration: number;
  /** Tooltip position in pixels */
  position: { x: number; y: number };
  /** Whether tooltip is visible */
  visible: boolean;
  /** Whether clip is expanding (trimStart decreased or trimEnd increased) */
  isExpanding: boolean;
}

const TrimTooltip: React.FC<TrimTooltipProps> = ({
  originalDuration,
  newDuration,
  position,
  visible,
  isExpanding,
}) => {
  if (!visible) {
    return null;
  }

  const durationChange = newDuration - originalDuration;
  const isPositive = isExpanding || durationChange > 0;

  return (
    <div
      className="trim-tooltip"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div className="trim-tooltip-content">
        <div className="trim-tooltip-label">Duration</div>
        <div className="trim-tooltip-durations">
          <span className="trim-tooltip-original">{formatDuration(originalDuration)}</span>
          <span className="trim-tooltip-arrow">→</span>
          <span className={`trim-tooltip-new ${isPositive ? 'trim-tooltip-positive' : 'trim-tooltip-negative'}`}>
            {formatDuration(newDuration)}
          </span>
        </div>
        {Math.abs(durationChange) > 0.01 && (
          <div className={`trim-tooltip-change ${isPositive ? 'trim-tooltip-positive' : 'trim-tooltip-negative'}`}>
            {isPositive ? '+' : ''}{formatDuration(Math.abs(durationChange))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrimTooltip;

