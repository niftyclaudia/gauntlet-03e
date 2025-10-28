/**
 * Playhead Component
 * 
 * Red vertical line showing current time position on timeline
 */

import React from 'react';

interface PlayheadProps {
  /** Current playhead position in seconds */
  position: number;
  /** Timeline zoom level (1.0 to 10.0) */
  zoom: number;
  /** Height of timeline in pixels */
  timelineHeight: number;
  /** Callback when playhead is dragged */
  onDrag?: (position: number) => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
  /** Total duration for clamping */
  totalDuration?: number;
}

const Playhead: React.FC<PlayheadProps> = ({ 
  position, 
  zoom, 
  timelineHeight, 
  onDrag,
  onDragEnd,
  totalDuration = Infinity,
}) => {
  // Pixels per second at 100% zoom - matches timelineCalculations.ts
  const BASE_PIXELS_PER_SECOND = 10;
  const xPosition = position * zoom * BASE_PIXELS_PER_SECOND;
  const isDraggingRef = React.useRef(false);

  /**
   * Handle mouse down on playhead (start drag)
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDrag) return;
    
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;

    // Find the timeline container (store it once)
    const playheadElement = e.currentTarget as HTMLElement;
    const timelineContainer = playheadElement.closest('.timeline-container') as HTMLElement;
    
    if (!timelineContainer) {
      isDraggingRef.current = false;
      return;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !timelineContainer) return;

      const clipsContainer = timelineContainer.querySelector('.timeline-clips-container') as HTMLElement;
      if (!clipsContainer) return;

      const rect = clipsContainer.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const scrollX = timelineContainer.scrollLeft;
      const absoluteX = x + scrollX;

      // Convert pixels to seconds
      const newPosition = absoluteX / (zoom * BASE_PIXELS_PER_SECOND);
      const clampedPosition = Math.max(0, Math.min(newPosition, totalDuration));
      
      console.log('[Playhead] Dragging to:', clampedPosition, 'seconds');
      onDrag(clampedPosition);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Notify parent that drag ended
      if (onDragEnd) {
        onDragEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="playhead"
      style={{
        position: 'absolute',
        left: `${xPosition}px`,
        top: 0,
        bottom: 0,
        width: onDrag ? '8px' : '2px',
        marginLeft: onDrag ? '-4px' : '-1px',
        backgroundColor: '#ff0000',
        cursor: onDrag ? 'ew-resize' : 'default',
        pointerEvents: onDrag ? 'auto' : 'none',
        zIndex: 100, // Higher z-index to be above clips
        userSelect: 'none', // Prevent text selection during drag
      }}
      onMouseDown={onDrag ? handleMouseDown : undefined}
      onClick={(e) => {
        // Prevent timeline click from interfering
        e.stopPropagation();
      }}
    />
  );
};

export default Playhead;

