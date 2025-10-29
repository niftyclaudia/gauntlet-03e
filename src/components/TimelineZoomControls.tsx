/**
 * Timeline Zoom Controls Component
 * 
 * Compact button-based zoom controls (like CapCut)
 * - Zoom to Fit Timeline button
 * - Zoom Out (-) button
 * - Zoom In (+) button
 * Supports zoom range from 2% (0.02) to 1000% (10.0)
 */

import React, { useEffect } from 'react';
import { TimelineClip, VideoClip } from '../types/video';
import { calculateAutoFitZoom } from '../utils/timelineCalculations';

interface TimelineZoomControlsProps {
  /** Current zoom level (0.02 to 10.0) - represents 2% to 1000% */
  zoom: number;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Timeline clips for auto-fit calculation */
  timeline: TimelineClip[];
  /** Library clips for auto-fit calculation */
  library: VideoClip[];
  /** Timeline container ref for width measurement */
  timelineContainerRef: React.RefObject<HTMLDivElement>;
}

/** Minimum zoom level (2%) */
const MIN_ZOOM = 0.02;
/** Maximum zoom level (1000%) */
const MAX_ZOOM = 10.0;
/** Zoom step for buttons */
const ZOOM_STEP = 0.15;

/**
 * Convert zoom value to slider position (0-1)
 * Uses non-linear mapping so 100% appears around 65% from left
 * This makes it visually clear that you can zoom out further
 */
function zoomToSliderPosition(zoom: number): number {
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  
  // Split the range into two sections:
  // 0.1-1.0 (10%-100%) maps to 0-0.65 (common zoom range gets most slider space)
  // 1.0-10.0 (100%-1000%) maps to 0.65-1.0 (zoom in range gets remaining space)
  if (clamped <= 1.0) {
    // Map 0.1-1.0 to 0-0.65
    return ((clamped - MIN_ZOOM) / (1.0 - MIN_ZOOM)) * 0.65;
  } else {
    // Map 1.0-10.0 to 0.65-1.0
    return 0.65 + ((clamped - 1.0) / (MAX_ZOOM - 1.0)) * 0.35;
  }
}

/**
 * Convert slider position (0-1) to zoom value
 * Inverse of zoomToSliderPosition
 */
function sliderPositionToZoom(position: number): number {
  const clamped = Math.max(0, Math.min(1, position));
  
  if (clamped <= 0.65) {
    // Map 0-0.65 to 0.1-1.0
    return MIN_ZOOM + (clamped / 0.65) * (1.0 - MIN_ZOOM);
  } else {
    // Map 0.65-1.0 to 1.0-10.0
    return 1.0 + ((clamped - 0.65) / 0.35) * (MAX_ZOOM - 1.0);
  }
}

const TimelineZoomControls: React.FC<TimelineZoomControlsProps> = ({
  zoom,
  onZoomChange,
  timeline,
  library,
  timelineContainerRef,
}) => {
  // Keyboard shortcuts: Cmd+Plus (zoom in), Cmd+Minus (zoom out)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (macOS) or Ctrl (Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;

      if (isModifierPressed && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
        onZoomChange(newZoom);
      } else if (isModifierPressed && e.key === '-') {
        e.preventDefault();
        const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
        onZoomChange(newZoom);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, onZoomChange]);

  const handleZoomOut = () => {
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    onZoomChange(newZoom);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    onZoomChange(newZoom);
  };

  const handleZoomToFit = () => {
    if (!timelineContainerRef.current || timeline.length === 0) {
      return;
    }

    const containerWidth = timelineContainerRef.current.clientWidth;
    const autoFitZoom = calculateAutoFitZoom(timeline, library, containerWidth);
    onZoomChange(autoFitZoom);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Slider uses 0-1 range with non-linear mapping
    const sliderPos = parseFloat(e.target.value);
    const newZoom = sliderPositionToZoom(sliderPos);
    // Clamp when setting new values to prevent out-of-range zooms
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    onZoomChange(clampedZoom);
  };

  // Convert zoom to slider position (0-1) for display
  const sliderPosition = zoomToSliderPosition(zoom);

  return (
    <div className="timeline-zoom-controls">
      <button
        type="button"
        className="timeline-zoom-fit-button"
        onClick={handleZoomToFit}
        title="Zoom to Fit Timeline"
        aria-label="Zoom to Fit Timeline"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ruler with magnifying glass icon */}
          <path d="M2 4h12M2 6h2M2 8h2M2 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="11" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M13 9l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <button
        type="button"
        className="timeline-zoom-out-button"
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step={0.001}
        value={sliderPosition}
        onChange={handleSliderChange}
        className="timeline-zoom-slider"
        aria-label="Timeline zoom level"
        style={{ '--slider-progress': `${sliderPosition * 100}%` } as React.CSSProperties}
      />
      <button
        type="button"
        className="timeline-zoom-in-button"
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        title="Zoom In"
        aria-label="Zoom In"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

export default TimelineZoomControls;

