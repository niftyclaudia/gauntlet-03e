/**
 * Timeline Clip Card Component
 * 
 * Displays individual clip card on timeline with thumbnail, filename, and duration
 */

import React, { useEffect, useState } from 'react';
import { TimelineClip, VideoClip } from '../types/video';
import { formatDuration } from '../utils/formatDuration';
import { calculateClipWidth } from '../utils/timelineCalculations';

interface TimelineClipCardProps {
  /** Timeline clip data */
  clip: TimelineClip;
  /** Library clip reference */
  libraryClip: VideoClip;
  /** Timeline zoom level (1.0 to 10.0) */
  zoom: number;
  /** Whether this clip is selected */
  isSelected: boolean;
  /** Callback when clip is clicked */
  onClick: () => void;
  /** Callback when drag starts */
  onDragStart: (e: React.DragEvent, clipIndex: number) => void;
  /** Callback when clip is deleted */
  onDelete: () => void;
  /** Clip index in timeline */
  clipIndex: number;
  /** Callback when trim handle drag starts */
  onTrimStart?: (clipId: string, edge: 'left' | 'right', e: React.MouseEvent) => void;
  /** Callback when hover state changes on trim edge */
  onEdgeHoverChange?: (clipId: string | null, edge: 'left' | 'right' | null) => void;
  /** Which edge is currently hovered (for this clip) */
  hoveredEdge?: 'left' | 'right' | null;
  /** Whether this clip is currently being trimmed */
  isTrimming?: boolean;
  /** Preview inPoint during drag (overrides clip.trimStart if provided) */
  draggedInPoint?: number | null;
  /** Preview outPoint during drag (overrides clip.trimEnd if provided) */
  draggedOutPoint?: number | null;
  /** Fixed inPoint value (when dragging right handle, this is the initial trimStart) */
  fixedInPoint?: number | null;
  /** Fixed outPoint value (when dragging left handle, this is the initial trimEnd) */
  fixedOutPoint?: number | null;
}

/** Base height for timeline clips at 100% zoom */
const BASE_CLIP_HEIGHT = 80;

/** Thumbnail width for tiling (16:9 aspect ratio at BASE_CLIP_HEIGHT) */
const THUMBNAIL_WIDTH = Math.round(BASE_CLIP_HEIGHT * (16 / 9)); // ~142px

const TimelineClipCard: React.FC<TimelineClipCardProps> = ({
  clip,
  libraryClip,
  zoom,
  isSelected,
  onClick,
  onDragStart,
  onDelete,
  clipIndex,
  onTrimStart,
  onEdgeHoverChange,
  hoveredEdge,
  isTrimming,
  draggedInPoint,
  draggedOutPoint,
  fixedInPoint,
  fixedOutPoint,
}) => {
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>('');

  // Load thumbnail as data URL on mount
  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        const dataUrl = await window.electron.getThumbnailDataUrl(libraryClip.thumbnail);
        setThumbnailDataUrl(dataUrl);
      } catch (error) {
        console.error('[TimelineClipCard] Failed to load thumbnail:', error);
      }
    };

    loadThumbnail();
  }, [libraryClip.thumbnail]);

  // Use dragged trim values during drag, with fixed values as fallback
  // When dragging left handle: draggedInPoint changes, fixedOutPoint is used for right edge
  // When dragging right handle: draggedOutPoint changes, fixedInPoint is used for left edge
  const displayTrimStart = draggedInPoint ?? fixedInPoint ?? clip.trimStart;
  const displayTrimEnd = draggedOutPoint ?? fixedOutPoint ?? clip.trimEnd;
  
  const clipDuration = displayTrimEnd - displayTrimStart;
  let clipWidth = calculateClipWidth(
    { ...clip, trimStart: displayTrimStart, trimEnd: displayTrimEnd },
    libraryClip,
    zoom
  );
  // Ensure minimum width for visibility, maximum to prevent overflow
  // These constants must match timelineCalculations.ts MIN/MAX_CLIP_WIDTH
  clipWidth = Math.max(50, Math.min(clipWidth, 5000)); // Min 50px, max 5000px
  const durationDisplay = formatDuration(clipDuration);

  // Truncate filename if too long
  const displayFilename = libraryClip.filename.length > 20
    ? libraryClip.filename.substring(0, 17) + '...'
    : libraryClip.filename;

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, clipIndex);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clip selection when clicking delete
    onDelete();
  };

  // Handle trim handle interactions
  const handleLeftTrimMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent clip drag
    if (onTrimStart) {
      onTrimStart(clip.id, 'left', e);
    }
  };

  const handleRightTrimMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent clip drag
    if (onTrimStart) {
      onTrimStart(clip.id, 'right', e);
    }
  };

  const handleLeftTrimClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clip selection
  };

  const handleRightTrimClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clip selection
  };

  const handleLeftTrimMouseEnter = () => {
    if (onEdgeHoverChange && !isTrimming) {
      onEdgeHoverChange(clip.id, 'left');
    }
  };

  const handleRightTrimMouseEnter = () => {
    if (onEdgeHoverChange && !isTrimming) {
      onEdgeHoverChange(clip.id, 'right');
    }
  };

  const handleTrimMouseLeave = () => {
    if (onEdgeHoverChange && !isTrimming) {
      onEdgeHoverChange(null, null);
    }
  };

  // Determine if any trim handle is hovered or being dragged
  const hasTrimHandleActive = hoveredEdge !== null || isTrimming;

  return (
    <div
      className={`timeline-clip-card ${isSelected ? 'timeline-clip-selected' : ''} ${hasTrimHandleActive ? 'timeline-clip-trimming' : ''}`}
      style={{
        width: `${clipWidth}px`,
        minWidth: '50px', // Minimum width for visibility
      }}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
    >
      <div 
        className="timeline-clip-thumbnail-container"
        style={{
          height: `${BASE_CLIP_HEIGHT}px`, // Fixed height - only width scales with zoom
        }}
      >
        {thumbnailDataUrl ? (
          <div
            className="timeline-clip-thumbnail"
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${thumbnailDataUrl})`,
              backgroundSize: `${THUMBNAIL_WIDTH}px 100%`,
              backgroundRepeat: 'repeat-x',
              backgroundPosition: 'left center',
            }}
            aria-label={libraryClip.filename}
          />
        ) : (
          <div className="timeline-clip-thumbnail-placeholder">Loading...</div>
        )}
        <div className="timeline-clip-duration-overlay">
          {durationDisplay}
        </div>
        {/* Delete button - appears on hover or when selected */}
        <button
          className="timeline-clip-delete-button"
          onClick={handleDeleteClick}
          title="Delete clip"
          aria-label="Delete clip"
        >
          ×
        </button>
        {/* Trim handles */}
        <div
          className={`timeline-clip-trim-handle timeline-clip-trim-handle-left ${
            hoveredEdge === 'left' ? 'trim-handle-hovered' : ''
          } ${isTrimming && hoveredEdge === 'left' ? 'trim-handle-dragging' : ''}`}
          onMouseDown={handleLeftTrimMouseDown}
          onMouseEnter={handleLeftTrimMouseEnter}
          onMouseLeave={handleTrimMouseLeave}
          onClick={handleLeftTrimClick}
          style={{
            cursor: hoveredEdge === 'left' || (isTrimming && hoveredEdge === 'left') ? 'ew-resize' : 'default',
          }}
        />
        <div
          className={`timeline-clip-trim-handle timeline-clip-trim-handle-right ${
            hoveredEdge === 'right' ? 'trim-handle-hovered' : ''
          } ${isTrimming && hoveredEdge === 'right' ? 'trim-handle-dragging' : ''}`}
          onMouseDown={handleRightTrimMouseDown}
          onMouseEnter={handleRightTrimMouseEnter}
          onMouseLeave={handleTrimMouseLeave}
          onClick={handleRightTrimClick}
          style={{
            cursor: hoveredEdge === 'right' || (isTrimming && hoveredEdge === 'right') ? 'ew-resize' : 'default',
          }}
        />
      </div>
      <div className="timeline-clip-filename">
        {displayFilename}
      </div>
    </div>
  );
};

export default TimelineClipCard;

