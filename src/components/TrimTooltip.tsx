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
  /** Whether the new duration is at the minimum constraint */
  isAtMinimum?: boolean;
  /** Whether the new duration violates minimum constraint */
  isBelowMinimum?: boolean;
}

const TrimTooltip: React.FC<TrimTooltipProps> = ({
  originalDuration,
  newDuration,
  position,
  visible,
  isExpanding,
  isAtMinimum = false,
  isBelowMinimum = false,
}) => {
  if (!visible) {
    return null;
  }

  const durationChange = newDuration - originalDuration;
  const isPositive = isExpanding || durationChange > 0;
  
  // Determine if we should show warning state
  const showWarning = isAtMinimum || isBelowMinimum;

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
      <div className={`trim-tooltip-content ${showWarning ? 'trim-tooltip-warning' : ''}`}>
        <div className="trim-tooltip-label">
          Duration
          {showWarning && <span className="trim-tooltip-warning-icon">⚠️</span>}
        </div>
        <div className="trim-tooltip-durations">
          <span className="trim-tooltip-original">{formatDuration(originalDuration)}</span>
          <span className="trim-tooltip-arrow">→</span>
          <span className={`trim-tooltip-new ${showWarning ? 'trim-tooltip-warning-text' : (isPositive ? 'trim-tooltip-positive' : 'trim-tooltip-negative')}`}>
            {formatDuration(newDuration)}
            {isAtMinimum && <span className="trim-tooltip-minimum-label"> (minimum)</span>}
            {isBelowMinimum && <span className="trim-tooltip-violation-label"> (too short)</span>}
          </span>
        </div>
        {Math.abs(durationChange) > 0.01 && !showWarning && (
          <div className={`trim-tooltip-change ${isPositive ? 'trim-tooltip-positive' : 'trim-tooltip-negative'}`}>
            {isPositive ? '+' : ''}{formatDuration(Math.abs(durationChange))}
          </div>
        )}
        {showWarning && (
          <div className="trim-tooltip-warning-message">
            {isAtMinimum ? 'Minimum duration reached' : 'Duration too short - minimum 1.0s'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrimTooltip;

