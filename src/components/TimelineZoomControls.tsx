/**
 * Timeline Zoom Controls Component
 * 
 * Zoom slider and keyboard shortcuts for timeline zoom
 */

import React, { useEffect } from 'react';

interface TimelineZoomControlsProps {
  /** Current zoom level (1.0 to 10.0) */
  zoom: number;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
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
        const newZoom = Math.min(10.0, zoom + 0.1);
        onZoomChange(newZoom);
      } else if (isModifierPressed && e.key === '-') {
        e.preventDefault();
        const newZoom = Math.max(1.0, zoom - 0.1);
        onZoomChange(newZoom);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, onZoomChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    onZoomChange(newZoom);
  };

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div className="timeline-zoom-controls">
      <input
        type="range"
        min="1"
        max="10"
        step="0.1"
        value={zoom}
        onChange={handleSliderChange}
        className="timeline-zoom-slider"
      />
      <span className="timeline-zoom-indicator">{zoomPercentage}%</span>
    </div>
  );
};

export default TimelineZoomControls;

