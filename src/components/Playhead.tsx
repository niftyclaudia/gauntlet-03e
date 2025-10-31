/**
 * Playhead Component
 * 
 * White vertical line showing current time position on timeline
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
  /** Callback when playhead is clicked (not dragged) */
  onClick?: (position: number) => void;
  /** Total duration for clamping */
  totalDuration?: number;
}

const Playhead: React.FC<PlayheadProps> = ({ 
  position, 
  zoom, 
  timelineHeight, 
  onDrag,
  onDragEnd,
  onClick,
  totalDuration = Infinity,
}) => {
  // Pixels per second at 100% zoom - matches timelineCalculations.ts
  const BASE_PIXELS_PER_SECOND = 10;
  const xPosition = position * zoom * BASE_PIXELS_PER_SECOND;
  const isDraggingRef = React.useRef(false);
  const mouseDownPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = React.useRef(false);

  /**
   * Handle mouse down on playhead (start drag)
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDrag && !onClick) return;
    
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    mouseDownPositionRef.current = { x: e.clientX, y: e.clientY };

    // Find the timeline container (store it once)
    const playheadElement = e.currentTarget as HTMLElement;
    const timelineContainer = playheadElement.closest('.timeline-container') as HTMLElement;
    
    if (!timelineContainer) {
      isDraggingRef.current = false;
      return;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !timelineContainer) return;

      // Track if mouse has moved (to distinguish click from drag)
      if (mouseDownPositionRef.current) {
        const deltaX = Math.abs(moveEvent.clientX - mouseDownPositionRef.current.x);
        const deltaY = Math.abs(moveEvent.clientY - mouseDownPositionRef.current.y);
        // Consider it a drag if moved more than 3 pixels in any direction
        if (deltaX > 3 || deltaY > 3) {
          hasMovedRef.current = true;
        }
      }

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
      if (onDrag) {
        onDrag(clampedPosition);
      }
    };

    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current;
      const didMove = hasMovedRef.current;
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // If mouse didn't move significantly, treat as click
      if (wasDragging && !didMove && onClick) {
        console.log('[Playhead] Click detected (no drag), seeking to position:', position);
        onClick(position);
      }
      
      // Notify parent that drag ended
      if (onDragEnd) {
        onDragEnd();
      }
      
      mouseDownPositionRef.current = null;
      hasMovedRef.current = false;
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
        top: '-40px', // Extend up into the ruler area (40px ruler height)
        bottom: 0,
        width: '12px', // Wider hit area for easier grabbing
        marginLeft: '-6px', // Center the hit area
        cursor: onDrag ? 'ew-resize' : 'default',
        pointerEvents: onDrag ? 'auto' : 'none',
        zIndex: 1000, // Always on top of timeline elements
        userSelect: 'none', // Prevent text selection during drag
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Transparent background for hit area
        background: 'transparent',
      }}
      onMouseDown={onDrag ? handleMouseDown : undefined}
      onClick={(e) => {
        // Prevent timeline click from interfering
        e.stopPropagation();
      }}
    >
      {/* White triangular arrowhead at top */}
      <div
        style={{
          width: '0',
          height: '0',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid #ffffff',
          zIndex: 1001,
          boxShadow: '0 0 4px rgba(255, 255, 255, 0.6)',
        }}
      />
      
      {/* White line through ruler area */}
      <div
        style={{
          width: '2px',
          height: '40px', // Height of ruler area
          background: '#ffffff',
          boxShadow: '0 0 4px rgba(255, 255, 255, 0.6)',
        }}
      />
      
      {/* White line down the timeline */}
      <div
        style={{
          width: '2px',
          flex: 1,
          background: '#ffffff',
          boxShadow: '0 0 4px rgba(255, 255, 255, 0.6)',
        }}
      />
    </div>
  );
};

export default Playhead;
