/**
 * Timeline Panel Component
 * 
 * Displays video clips on timeline for editing (bottom panel, 30% height).
 * Supports drag-and-drop from Library, reordering, zoom, selection, and deletion.
 */

import React, { useRef, useEffect, useState } from 'react';
import { TimelineClip, VideoClip } from '../types/video';
import TimelineClipCard from './TimelineClipCard';
import TimelineZoomControls from './TimelineZoomControls';
import Playhead from './Playhead';
import TimeRuler from './TimeRuler';
import { calculateClipPosition, calculateTotalDuration, calculateAutoFitZoom, calculateClipWidth, applyClipWidthConstraints } from '../utils/timelineCalculations';
import { formatDuration } from '../utils/formatDuration';

interface TimelineProps {
  /** Array of timeline clips */
  timeline: TimelineClip[];
  /** Array of library clips */
  library: VideoClip[];
  /** Currently selected clip ID */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Timeline zoom level (1.0 to 10.0) */
  timelineZoom: number;
  /** Timeline scroll position in pixels */
  timelineScrollPosition: number;
  /** Callback when clip is added to timeline */
  onAddClip: (libraryClipId: string, insertionIndex?: number) => void;
  /** Callback when clip is reordered */
  onReorderClip: (dragIndex: number, hoverIndex: number) => void;
  /** Callback when clip is selected */
  onSelectClip: (clipId: string | null) => void;
  /** Callback when clip is deleted */
  onDeleteClip: (clipId: string) => void;
  /** Callback when all clips are cleared */
  onClearAll: () => void;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Callback when scroll position changes */
  onScrollChange: (scrollPosition: number) => void;
  /** Callback when playhead position changes (from dragging) */
  onPlayheadChange?: (position: number) => void;
  /** Total duration for playhead dragging */
  totalDuration?: number;
}

const Timeline: React.FC<TimelineProps> = ({
  timeline,
  library,
  selectedClipId,
  currentPlayheadPosition,
  timelineZoom,
  timelineScrollPosition,
  onAddClip,
  onReorderClip,
  onSelectClip,
  onDeleteClip,
  onClearAll,
  onZoomChange,
  onScrollChange,
  onPlayheadChange,
}) => {
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const clipsContainerRef = useRef<HTMLDivElement>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);
  const [libraryInsertIndex, setLibraryInsertIndex] = useState<number | null>(null);
  const hasAutoFittedRef = useRef(false); // Track if auto-fit has been applied
  const previousTimelineLengthRef = useRef(0);
  const isDraggingPlayheadRef = useRef(false); // Track if playhead is being dragged
  const dragEndTimeRef = useRef(0); // Track when drag ended to prevent click after drag

  // Sort timeline clips by order (needed for calculations)
  const sortedTimeline = [...timeline].sort((a, b) => a.order - b.order);

  // Calculate total duration
  const totalDuration = calculateTotalDuration(timeline, library);

  // Auto-fit zoom only once when first clip is added, or when timeline goes from 0 to N clips
  // This prevents clips from resizing when dragging multiple clips in quick succession
  useEffect(() => {
    const previousLength = previousTimelineLengthRef.current;
    const currentLength = timeline.length;
    previousTimelineLengthRef.current = currentLength;

    // Only auto-fit if:
    // 1. Going from 0 clips to having clips (first clip added)
    // 2. OR if zoom is still at default (1.0) and we haven't auto-fitted yet
    const isFirstClip = previousLength === 0 && currentLength > 0;
    const isAtDefaultZoom = timelineZoom >= 0.9 && timelineZoom <= 1.1;
    const shouldAutoFit = isFirstClip || (isAtDefaultZoom && !hasAutoFittedRef.current && currentLength > 0);

    if (shouldAutoFit && timelineContainerRef.current) {
      const containerWidth = timelineContainerRef.current.clientWidth;
      const autoFitZoom = calculateAutoFitZoom(timeline, library, containerWidth);
      
      // Only update if difference is significant (avoid unnecessary updates)
      if (Math.abs(autoFitZoom - timelineZoom) > 0.05) {
        onZoomChange(autoFitZoom);
        hasAutoFittedRef.current = true;
      }
    }
    
    // Reset auto-fit flag when timeline is cleared
    if (currentLength === 0) {
      hasAutoFittedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.length]); // Only recalculate when clip count changes

  // Restore scroll position only when externally changed (not during user scroll)
  const isUserScrollingRef = useRef(false);
  
  useEffect(() => {
    if (timelineContainerRef.current && !isUserScrollingRef.current) {
      timelineContainerRef.current.scrollLeft = timelineScrollPosition;
    }
  }, [timelineScrollPosition]);

  // Track user scrolling
  const handleScroll = () => {
    isUserScrollingRef.current = true;
    if (timelineContainerRef.current) {
      onScrollChange(timelineContainerRef.current.scrollLeft);
    }
    // Reset flag after a short delay
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 100);
  };

  // Handle drag from Library
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('application/library-clip-id')) {
      setIsDraggingFromLibrary(true);
      
      // Calculate insertion index based on mouse position
      if (clipsContainerRef.current && timelineContainerRef.current) {
        const rect = clipsContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        // Account for scroll position when comparing with clip positions
        const scrollX = timelineContainerRef.current.scrollLeft;
        const absoluteMouseX = mouseX + scrollX;
        
        // Find which index to insert at based on X position
        let insertIndex = timeline.length; // Default to end
        
        for (let i = 0; i < sortedTimeline.length; i++) {
          const clip = sortedTimeline[i];
          const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
          if (!libraryClip) continue;
          
          const clipPosition = calculateClipPosition(i, sortedTimeline, library, timelineZoom);
          const clipWidth = applyClipWidthConstraints(calculateClipWidth(clip, libraryClip, timelineZoom));
          
          // Check if mouse is before this clip (insert before)
          if (absoluteMouseX < clipPosition) {
            insertIndex = i;
            break;
          }
          // Check if mouse is in the first half of this clip (insert before)
          else if (absoluteMouseX < clipPosition + clipWidth / 2) {
            insertIndex = i;
            break;
          }
          // Otherwise, insert after (continue to next iteration)
          else if (i === sortedTimeline.length - 1) {
            insertIndex = timeline.length;
          }
        }
        
        setLibraryInsertIndex(insertIndex);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if leaving the timeline container
    if (!timelineContainerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingFromLibrary(false);
      setDragOverIndex(null);
      setLibraryInsertIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFromLibrary(false);
    setDragOverIndex(null);

    // Check if dropping from Library
    const libraryClipId = e.dataTransfer.getData('application/library-clip-id');
    if (libraryClipId) {
      // Use the calculated insert index, or append to end if not calculated
      const insertIndex = libraryInsertIndex !== null ? libraryInsertIndex : timeline.length;
      onAddClip(libraryClipId, insertIndex);
      setLibraryInsertIndex(null);
      return;
    }

    // Check if reordering
    const dragIndexStr = e.dataTransfer.getData('application/timeline-clip-index');
    const hoverIndexStr = e.dataTransfer.getData('application/timeline-hover-index');
    
    if (dragIndexStr !== '' && hoverIndexStr !== '') {
      const dragIndex = parseInt(dragIndexStr, 10);
      let hoverIndex = parseInt(hoverIndexStr, 10);
      
      // Handle dropping at the end (hoverIndex === timeline.length)
      if (hoverIndex >= timeline.length) {
        hoverIndex = timeline.length - 1;
      }
      
      if (!isNaN(dragIndex) && !isNaN(hoverIndex) && dragIndex !== hoverIndex && dragIndex >= 0 && hoverIndex >= 0) {
        onReorderClip(dragIndex, hoverIndex);
      }
    }

    setIsReordering(false);
    setDraggedClipIndex(null);
  };

  // Handle reorder drag over
  const handleReorderDragOver = (e: React.DragEvent, hoverIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('application/timeline-clip-index')) {
      setIsReordering(true);
      setDragOverIndex(hoverIndex);
      e.dataTransfer.dropEffect = 'move';
      
      // Store hover index for drop
      e.dataTransfer.setData('application/timeline-hover-index', String(hoverIndex));
    }
  };

  // Handle clip drag start (for reordering)
  const handleClipDragStart = (e: React.DragEvent, clipIndex: number) => {
    setDraggedClipIndex(clipIndex);
    setIsReordering(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/timeline-clip-index', String(clipIndex));
  };

  // Handle click on timeline to seek playhead
  const handleTimelineClick = (e: React.MouseEvent) => {
    // Don't handle if we just finished dragging playhead (prevent click after drag)
    const timeSinceDragEnd = Date.now() - dragEndTimeRef.current;
    if (timeSinceDragEnd < 200) { // 200ms threshold to prevent click after drag
      console.log('[Timeline] Ignoring click (too soon after drag)');
      return;
    }
    
    // Don't handle if currently dragging playhead
    if (isDraggingPlayheadRef.current) {
      console.log('[Timeline] Ignoring click (playhead is being dragged)');
      return;
    }
    
    // Don't handle if clicking on playhead (let playhead handle its own drag)
    if ((e.target as HTMLElement).classList.contains('playhead')) {
      return;
    }
    
    // Only handle if clicking directly on timeline container or clips container
    if (e.target === timelineContainerRef.current || e.target === clipsContainerRef.current || (e.target as HTMLElement).classList.contains('timeline-clips-container')) {
      if (onPlayheadChange && clipsContainerRef.current && timelineContainerRef.current) {
        const rect = clipsContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Account for scroll position
        const scrollX = timelineContainerRef.current.scrollLeft;
        const absoluteX = x + scrollX;
        
        // Convert pixels to seconds
        const BASE_PIXELS_PER_SECOND = 10;
        const newPosition = absoluteX / (timelineZoom * BASE_PIXELS_PER_SECOND);
        
        // Clamp to valid range
        const clampedPosition = Math.max(0, Math.min(newPosition, totalDuration));
        console.log('[Timeline] Click seek to:', clampedPosition, 'seconds');
        onPlayheadChange(clampedPosition);
      } else {
        // Just deselect if no playhead change handler
        onSelectClip(null);
      }
    }
  };

  // Wrapper for playhead change that tracks drag state
  const handlePlayheadDragChange = (position: number) => {
    isDraggingPlayheadRef.current = true;
    if (onPlayheadChange) {
      onPlayheadChange(position);
    }
  };

  // Handle playhead drag end
  const handlePlayheadDragEnd = () => {
    isDraggingPlayheadRef.current = false;
    dragEndTimeRef.current = Date.now();
  };

  // Handle Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedClipId) {
        onDeleteClip(selectedClipId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onDeleteClip]);

  // Handle Clear All with confirmation
  const handleClearAllClick = () => {
    if (timeline.length === 0) return;
    
    const confirmed = window.confirm('Remove all clips from timeline?');
    if (confirmed) {
      onClearAll();
    }
  };

  return (
    <div className="timeline-panel">
      {/* Header with total duration and Clear All button */}
      <div className="timeline-header">
        <div className="timeline-header-left">
          <TimeRuler
            currentTime={currentPlayheadPosition}
            zoom={timelineZoom}
            totalDuration={totalDuration}
            timelineWidth={timelineContainerRef.current?.clientWidth || 0}
          />
        </div>
        <div className="timeline-header-right">
          <span className="timeline-total-duration">
            Total: {formatDuration(totalDuration)}
          </span>
          <button
            className="timeline-clear-all-button"
            onClick={handleClearAllClick}
            disabled={timeline.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Timeline container with clips */}
      <div
        ref={timelineContainerRef}
        className={`timeline-container ${isDraggingFromLibrary ? 'timeline-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTimelineClick}
        onScroll={handleScroll}
      >
        {/* Clips container */}
        <div
          ref={clipsContainerRef}
          className="timeline-clips-container"
          style={{
            position: 'relative',
            minHeight: '110px', // Fixed height: 80px clip + 30px for filename/padding
            minWidth: `${totalDuration * timelineZoom * 10}px`, // 10 pixels per second at 100% zoom - width scales with zoom
          }}
        >
          {/* Playhead */}
          <Playhead
            position={currentPlayheadPosition}
            zoom={timelineZoom}
            timelineHeight={110}
            onDrag={handlePlayheadDragChange}
            onDragEnd={handlePlayheadDragEnd}
            totalDuration={totalDuration}
          />

          {/* Drop zone before first clip (for library drag) */}
          {isDraggingFromLibrary && libraryInsertIndex === 0 && (
            <div
              style={{
                position: 'absolute',
                left: '0px',
                top: '20px',
                width: '30px',
                height: '110px',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <div className="timeline-drop-indicator" />
            </div>
          )}

          {/* Clip cards */}
          {sortedTimeline.map((clip, index) => {
            const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
            if (!libraryClip) return null;

            const clipPosition = calculateClipPosition(index, sortedTimeline, library, timelineZoom);
            const clipWidth = applyClipWidthConstraints(calculateClipWidth(clip, libraryClip, timelineZoom));

            return (
              <React.Fragment key={clip.id}>
                {/* Drop zone before this clip (for reordering or library drag) */}
                {((isReordering && draggedClipIndex !== null && draggedClipIndex !== index) ||
                  (isDraggingFromLibrary && libraryInsertIndex === index)) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${clipPosition - 15}px`,
                      top: '20px',
                      width: '30px',
                      height: '110px',
                      zIndex: 20,
                      pointerEvents: isDraggingFromLibrary ? 'none' : 'auto',
                    }}
                    onDragOver={(e) => {
                      if (isReordering) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverIndex(index);
                        e.dataTransfer.setData('application/timeline-hover-index', String(index));
                      }
                    }}
                  >
                    {(isDraggingFromLibrary && libraryInsertIndex === index) && (
                      <div className="timeline-drop-indicator" />
                    )}
                  </div>
                )}
                
                {/* The clip card */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${clipPosition}px`,
                    top: '20px',
                  }}
                  onDragOver={(e) => {
                    if (isReordering) {
                      handleReorderDragOver(e, index);
                    }
                  }}
                >
                  {dragOverIndex === index && isReordering && draggedClipIndex !== index && (
                    <div className="timeline-drop-indicator" />
                  )}
                  <TimelineClipCard
                    clip={clip}
                    libraryClip={libraryClip}
                    zoom={timelineZoom}
                    isSelected={selectedClipId === clip.id}
                    onClick={() => onSelectClip(clip.id)}
                    onDragStart={handleClipDragStart}
                    onDelete={() => onDeleteClip(clip.id)}
                    clipIndex={index}
                  />
                </div>

                {/* Drop zone after the last clip (for reordering or library drag) */}
                {index === sortedTimeline.length - 1 && (
                  <>
                    {/* Reordering drop zone */}
                    {isReordering && draggedClipIndex !== null && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${clipPosition + clipWidth - 15}px`,
                          top: '20px',
                          width: '30px',
                          height: '110px',
                          zIndex: 20,
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverIndex(sortedTimeline.length);
                          e.dataTransfer.setData('application/timeline-hover-index', String(sortedTimeline.length));
                        }}
                      />
                    )}
                    {/* Library drag drop zone (at end) */}
                    {isDraggingFromLibrary && libraryInsertIndex === sortedTimeline.length && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${clipPosition + clipWidth + 5}px`,
                          top: '20px',
                          width: '30px',
                          height: '110px',
                          zIndex: 20,
                          pointerEvents: 'none',
                        }}
                      >
                        <div className="timeline-drop-indicator" />
                      </div>
                    )}
                  </>
                )}
              </React.Fragment>
            );
          })}

          {/* Drop zone at end when timeline is empty or for library drag at end */}
          {timeline.length === 0 && isDraggingFromLibrary && (
            <div
              style={{
                position: 'absolute',
                left: '0px',
                top: '20px',
                width: '30px',
                height: '110px',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <div className="timeline-drop-indicator" />
            </div>
          )}

          {/* Empty state */}
          {timeline.length === 0 && (
            <div className="timeline-empty-state">
              <p>Drag video files here or click to import</p>
            </div>
          )}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="timeline-footer">
        <TimelineZoomControls
          zoom={timelineZoom}
          onZoomChange={onZoomChange}
          timeline={timeline}
          library={library}
          timelineContainerRef={timelineContainerRef}
        />
      </div>
    </div>
  );
};

export default Timeline;

