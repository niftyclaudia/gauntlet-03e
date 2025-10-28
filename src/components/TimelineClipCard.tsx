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

  const clipDuration = clip.trimEnd - clip.trimStart;
  let clipWidth = calculateClipWidth(clip, libraryClip, zoom);
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

  return (
    <div
      className={`timeline-clip-card ${isSelected ? 'timeline-clip-selected' : ''}`}
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
        {/* Trim handles (visual only, non-functional for PR-3) */}
        <div className="timeline-clip-trim-handle timeline-clip-trim-handle-left" />
        <div className="timeline-clip-trim-handle timeline-clip-trim-handle-right" />
      </div>
      <div className="timeline-clip-filename">
        {displayFilename}
      </div>
    </div>
  );
};

export default TimelineClipCard;

