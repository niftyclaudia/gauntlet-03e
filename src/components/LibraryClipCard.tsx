/**
 * Library Clip Card Component
 * 
 * Displays individual video clip card with thumbnail, filename, and duration
 * Used in Library panel to show imported video clips
 */

import React, { useEffect, useState } from 'react';
import { VideoClip } from '../types/video';
import { formatDuration } from '../utils/formatDuration';

interface LibraryClipCardProps {
  /** Video clip data to display */
  clip: VideoClip;
  /** Callback when clip is selected */
  onSelect?: (clip: VideoClip) => void;
  /** Whether this clip is currently selected */
  isSelected?: boolean;
  /** Callback when clip is deleted */
  onDelete?: (clipId: string) => void;
}

const LibraryClipCard: React.FC<LibraryClipCardProps> = ({ clip, onSelect, isSelected = false, onDelete }) => {
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>('');

  // Load thumbnail as data URL on mount
  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        const dataUrl = await window.electron.getThumbnailDataUrl(clip.thumbnail);
        setThumbnailDataUrl(dataUrl);
      } catch (error) {
        console.error('[LibraryClipCard] Failed to load thumbnail:', error);
      }
    };

    loadThumbnail();
  }, [clip.thumbnail]);

  const handleClick = () => {
    if (onSelect) {
      onSelect(clip);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/library-clip-id', clip.id);
    // Set opacity for dragging feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Restore opacity
    e.currentTarget.style.opacity = '1';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking delete
    if (onDelete) {
      onDelete(clip.id);
    }
  };

  // Format duration as MM:SS
  const durationDisplay = formatDuration(clip.duration);

  // Truncate filename if too long (show first 20 chars + extension)
  const displayFilename = clip.filename.length > 24
    ? clip.filename.substring(0, 21) + '...'
    : clip.filename;

  return (
    <div 
      className={`library-clip-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={clip.filename} // Show full filename on hover
    >
      {/* Delete button */}
      {onDelete && (
        <button
          className="library-clip-delete-button"
          onClick={handleDelete}
          aria-label="Delete clip"
          title="Delete clip from library"
        >
          ×
        </button>
      )}
      
      <div className="clip-thumbnail-container">
        {thumbnailDataUrl ? (
          <img 
            src={thumbnailDataUrl}
            alt={clip.filename}
            className="clip-thumbnail"
          />
        ) : (
          <div className="clip-thumbnail-placeholder">Loading...</div>
        )}
        <div className="clip-duration-overlay">
          {durationDisplay}
        </div>
      </div>
      <div className="clip-filename">
        {displayFilename}
      </div>
    </div>
  );
};

export default LibraryClipCard;

