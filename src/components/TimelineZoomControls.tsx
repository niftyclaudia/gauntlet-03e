/**
 * Timeline Zoom Controls Component
 * 
 * Zoom slider and keyboard shortcuts for timeline zoom
 * Supports zoom range from 20% (0.2) to 1000% (10.0)
 * Displays labels (xs to 3xl) instead of percentages
 */

import React, { useEffect } from 'react';

interface TimelineZoomControlsProps {
  /** Current zoom level (0.2 to 10.0) - represents 20% to 1000% */
  zoom: number;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
}

/** Minimum zoom level (20%) */
const MIN_ZOOM = 0.2;
/** Maximum zoom level (1000%) */
const MAX_ZOOM = 10.0;
/** Zoom step for slider */
const ZOOM_STEP = 0.1;

/**
 * Convert zoom level to label (xs to 3xl)
 */
function getZoomLabel(zoom: number): string {
  if (zoom < 0.35) return 'xs';
  if (zoom < 0.55) return 's';
  if (zoom < 0.85) return 'm';
  if (zoom < 1.5) return 'l';
  if (zoom < 3.0) return 'xl';
  if (zoom < 6.0) return '2xl';
  return '3xl';
}

const TimelineZoomControls: React.FC<TimelineZoomControlsProps> = ({
  zoom,
  onZoomChange,
}) => {
  // Keyboard shortcuts: Cmd+Plus (zoom in), Cmd+Minus (zoom out)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (macOS) or Ctrl (Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;

      if (isModifierPressed && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const newZoom = Math.min(MAX_ZOOM, zoom + 0.1);
        onZoomChange(newZoom);
      } else if (isModifierPressed && e.key === '-') {
        e.preventDefault();
        const newZoom = Math.max(MIN_ZOOM, zoom - 0.1);
        onZoomChange(newZoom);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, onZoomChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    // Clamp when setting new values to prevent out-of-range zooms
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    onZoomChange(clampedZoom);
  };

  // Clamp zoom for display (but allow restoring any value from session)
  // This ensures slider works correctly even if zoom is outside normal range
  const displayZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const zoomLabel = getZoomLabel(displayZoom);
  const zoomPercentage = Math.round(zoom * 100); // Use actual zoom for percentage

  return (
    <div className="timeline-zoom-controls">
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={ZOOM_STEP}
        value={displayZoom}
        onChange={handleSliderChange}
        className="timeline-zoom-slider"
        aria-label={`Zoom level: ${zoomLabel} (${zoomPercentage}%)`}
      />
      <span 
        className="timeline-zoom-indicator"
        title={`${zoomPercentage}%`}
      >
        {zoomLabel}
      </span>
    </div>
  );
};

export default TimelineZoomControls;

