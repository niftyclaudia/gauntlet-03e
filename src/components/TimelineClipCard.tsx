/**
 * Timeline Clip Card Component
 * 
 * Displays individual clip card on timeline with thumbnail, filename, and duration
 */

import React, { useEffect, useState, useRef } from 'react';
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
  /** Whether the left trim handle is at minimum constraint */
  leftHandleAtMinimum?: boolean;
  /** Whether the right trim handle is at minimum constraint */
  rightHandleAtMinimum?: boolean;
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
  leftHandleAtMinimum = false,
  rightHandleAtMinimum = false,
}) => {
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false); // Track if currently dragging for visual feedback
  const hasDraggedRef = useRef(false); // Track if drag occurred to prevent click
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null); // Track mouse down position
  const isDraggingRef = useRef(false); // Track if currently dragging

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

  // Log when selection state changes
  useEffect(() => {
    console.log(`[TimelineClipCard] Clip ${clip.id} (${libraryClip.filename}) selection changed: isSelected=${isSelected}`);
  }, [isSelected, clip.id, libraryClip.filename]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Track mouse down position and reset drag flags
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    isDraggingRef.current = false;
    
    // Add global mouse move and mouse up listeners to detect drag
    const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (mouseDownPosRef.current) {
        const dx = Math.abs(moveEvent.clientX - mouseDownPosRef.current.x);
        const dy = Math.abs(moveEvent.clientY - mouseDownPosRef.current.y);
        // If mouse moved more than 5 pixels, consider it a drag
        if (dx > 5 || dy > 5) {
          isDraggingRef.current = true;
        }
      }
    };

    const handleGlobalMouseUp = () => {
      // If we were dragging, mark it so click won't fire
      if (isDraggingRef.current) {
        hasDraggedRef.current = true;
        // Reset after a delay
        setTimeout(() => {
          hasDraggedRef.current = false;
          isDraggingRef.current = false;
        }, 100);
      }
      mouseDownPosRef.current = null;
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleDragStart = (e: React.DragEvent) => {
    console.log('[TimelineClipCard] Drag start for clip index:', clipIndex);
    hasDraggedRef.current = true;
    isDraggingRef.current = true;
    setIsDragging(true);
    // Set drag image to empty (default drag image can interfere)
    const emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    // Ensure drag effect is set
    e.dataTransfer.effectAllowed = 'move';
    // Prevent click from firing
    e.stopPropagation();
    onDragStart(e, clipIndex);
  };

  const handleDragEnd = () => {
    console.log('[TimelineClipCard] Drag end for clip index:', clipIndex);
    setIsDragging(false);
    // Reset drag flag after a delay to allow click handling
    setTimeout(() => {
      hasDraggedRef.current = false;
      isDraggingRef.current = false;
      mouseDownPosRef.current = null;
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if drag occurred
    if (hasDraggedRef.current || isDraggingRef.current) {
      console.log('[TimelineClipCard] Preventing click (drag occurred)');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Delay click slightly to allow drag to start if user is dragging
    const clickTime = Date.now();
    setTimeout(() => {
      // Only fire click if no drag occurred in the meantime
      if (!hasDraggedRef.current && !isDraggingRef.current) {
        console.log('[TimelineClipCard] Click handler firing (no drag after delay)');
        onClick();
      }
    }, 50); // Small delay to allow drag to register
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
      className={`bg-[#1a1a1a] cursor-move transition-all z-[50] border-2 border-transparent select-none pointer-events-auto relative ${
        isSelected ? 'border-[#0066cc] shadow-[0_0_0_2px_rgba(0,102,204,0.3)]' : ''
      } ${hasTrimHandleActive ? 'z-[100]' : ''} ${isDragging ? '' : ''} hover:border-[#666666]`}
      style={{
        width: `${clipWidth}px`,
        minWidth: '50px',
        opacity: isDragging ? 0.7 : 1,
        height: `${BASE_CLIP_HEIGHT}px`, // Match track height exactly - 80px
        padding: 0, // No padding to fill full height
        margin: 0, // No margin
        boxSizing: 'border-box', // Include border in height calculation so total height stays 80px
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="relative w-full h-full overflow-hidden bg-[#1a1a1a] group"
        style={{
          height: '100%', // Fill full height of parent (accounts for border-box)
          margin: 0,
          padding: 0,
        }}
      >
        {thumbnailDataUrl ? (
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${thumbnailDataUrl})`,
              backgroundSize: `${THUMBNAIL_WIDTH}px 100%`,
              backgroundRepeat: 'repeat-x',
              backgroundPosition: 'left center',
            }}
            aria-label={libraryClip.filename}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#666666] text-[11px]">Loading...</div>
        )}
        {/* Duration badge - bottom-left corner */}
        <div className="absolute bottom-1 left-1 bg-[rgba(0,0,0,0.75)] text-white text-[10px] font-medium px-1 py-0.5 rounded">
          {durationDisplay}
        </div>
        {/* Delete button - appears on hover or when selected */}
        <button
          className="absolute top-1 right-1 w-5 h-5 bg-[rgba(220,53,69,0.9)] text-white border-none rounded-full cursor-pointer text-base font-bold leading-none flex items-center justify-center opacity-0 transition-all z-10 p-0 select-none hover:bg-[rgba(220,53,69,1)] hover:scale-110 active:scale-95 group-hover:opacity-100"
          onClick={handleDeleteClick}
          title="Delete clip"
          aria-label="Delete clip"
        >
          ×
        </button>
        {/* Trim handles */}
        <div
          className={`absolute top-0 bottom-0 w-1 bg-[rgba(0,102,204,0.5)] cursor-default opacity-0 transition-all z-[101] pointer-events-auto left-0 rounded-l-sm ${
            hoveredEdge === 'left' ? 'opacity-100 w-1.5 bg-[rgba(0,102,204,0.8)] cursor-ew-resize' : ''
          } ${isTrimming && hoveredEdge === 'left' ? 'opacity-100 w-1.5 bg-[rgba(0,102,204,1)] cursor-grabbing' : ''} ${
            leftHandleAtMinimum ? 'bg-[rgba(255,107,107,0.8)] border border-[#ff6b6b] shadow-[0_0_4px_rgba(255,107,107,0.5)] hover:bg-[rgba(255,107,107,1)] hover:shadow-[0_0_6px_rgba(255,107,107,0.7)]' : ''
          } group-hover:opacity-50`}
          onMouseDown={handleLeftTrimMouseDown}
          onMouseEnter={handleLeftTrimMouseEnter}
          onMouseLeave={handleTrimMouseLeave}
          onClick={handleLeftTrimClick}
          style={{
            cursor: hoveredEdge === 'left' || isTrimming ? 'ew-resize' : 'default',
          }}
        />
        <div
          className={`absolute top-0 bottom-0 w-1 bg-[rgba(0,102,204,0.5)] cursor-default opacity-0 transition-all z-[101] pointer-events-auto right-0 rounded-r-sm ${
            hoveredEdge === 'right' ? 'opacity-100 w-1.5 bg-[rgba(0,102,204,0.8)] cursor-ew-resize' : ''
          } ${isTrimming && hoveredEdge === 'right' ? 'opacity-100 w-1.5 bg-[rgba(0,102,204,1)] cursor-grabbing' : ''} ${
            rightHandleAtMinimum ? 'bg-[rgba(255,107,107,0.8)] border border-[#ff6b6b] shadow-[0_0_4px_rgba(255,107,107,0.5)] hover:bg-[rgba(255,107,107,1)] hover:shadow-[0_0_6px_rgba(255,107,107,0.7)]' : ''
          } group-hover:opacity-50`}
          onMouseDown={handleRightTrimMouseDown}
          onMouseEnter={handleRightTrimMouseEnter}
          onMouseLeave={handleTrimMouseLeave}
          onClick={handleRightTrimClick}
          style={{
            cursor: hoveredEdge === 'right' || isTrimming ? 'ew-resize' : 'default',
          }}
        />
      </div>
      <div className="mt-1 text-[11px] text-white whitespace-nowrap overflow-hidden text-ellipsis">
        {displayFilename}
      </div>
    </div>
  );
};

export default TimelineClipCard;

