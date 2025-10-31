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
      className={`relative bg-[#2a2a2a] rounded-lg p-2 cursor-pointer transition-all border-2 group ${
        isSelected 
          ? 'border-[#0066cc] bg-[#1e3a5f] hover:border-[#0080ff] hover:bg-[#1e4a6f]' 
          : 'border-transparent hover:border-[#0066cc] hover:-translate-y-0.5'
      }`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={clip.filename}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          className="absolute top-1 right-1 w-5 h-5 border-none rounded-full bg-[rgba(255,107,107,0.9)] text-white text-sm font-bold cursor-pointer flex items-center justify-center opacity-0 transition-all z-10 hover:bg-[rgba(255,107,107,1)] hover:scale-110 group-hover:opacity-100"
          onClick={handleDelete}
          aria-label="Delete clip"
          title="Delete clip from library"
        >
          ×
        </button>
      )}
      
      <div className="relative w-full aspect-video rounded overflow-hidden bg-[#1a1a1a]">
        {thumbnailDataUrl ? (
          <img 
            src={thumbnailDataUrl}
            alt={clip.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#666666] text-xs">Loading...</div>
        )}
        <div className="absolute bottom-1 right-1 bg-[rgba(0,0,0,0.75)] text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
          {durationDisplay}
        </div>
      </div>
      <div className="mt-1.5 text-xs text-white whitespace-nowrap overflow-hidden text-ellipsis">
        {displayFilename}
      </div>
    </div>
  );
};

export default LibraryClipCard;

