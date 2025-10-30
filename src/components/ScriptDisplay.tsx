/**
 * ScriptDisplay Component
 * 
 * Draggable scrolling teleprompter modal with controls
 * Displays script text with smooth auto-scroll animation
 */

import React, { useEffect, useRef, useState } from 'react';

interface ScriptDisplayProps {
  script: string;
  isPlaying: boolean;
  scrollSpeed: number; // WPM (80-200)
  fontSize: number; // pixels (24-48)
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onClose: () => void;
}

const ScriptDisplay: React.FC<ScriptDisplayProps> = ({
  script,
  isPlaying,
  scrollSpeed,
  fontSize,
  onPlayPause,
  onSpeedChange,
  onReset,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const animationFrameRef = useRef<number>();
  
  // Dragging state
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (!modalRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    
    const rect = modalRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Calculate scroll speed in pixels per second
  useEffect(() => {
    if (!isPlaying || !containerRef.current || !textRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // Convert WPM to pixels per second
    // Rough estimate: 150 WPM = ~250px/sec at default font size
    const pixelsPerSecond = (scrollSpeed / 150) * 250;

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setScrollPosition(prev => {
        const maxScroll = textRef.current 
          ? textRef.current.scrollHeight - (containerRef.current?.clientHeight || 0)
          : 0;
        
        const newPosition = Math.min(prev + (pixelsPerSecond * deltaTime), maxScroll);
        
        if (containerRef.current) {
          containerRef.current.scrollTop = newPosition;
        }
        
        return newPosition;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, scrollSpeed]);

  // Reset scroll position when script changes
  useEffect(() => {
    setScrollPosition(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [script]);

  const handleReset = () => {
    setScrollPosition(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    onReset();
  };

  // Manual scroll handler
  const handleManualScroll = (direction: 'up' | 'down') => {
    if (!containerRef.current) return;
    
    const scrollAmount = 40;
    const currentScroll = containerRef.current.scrollTop;
    
    if (direction === 'up') {
      containerRef.current.scrollTop = Math.max(0, currentScroll - scrollAmount);
    } else {
      const maxScroll = textRef.current 
        ? textRef.current.scrollHeight - containerRef.current.clientHeight
        : 0;
      containerRef.current.scrollTop = Math.min(maxScroll, currentScroll + scrollAmount);
    }
    
    setScrollPosition(containerRef.current.scrollTop);
  };

  return (
    <div 
      className="script-display-modal" 
      ref={modalRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Draggable Header */}
      <div 
        className="script-display-header"
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span className="script-display-title">Teleprompter</span>
        <button
          className="script-display-close"
          onClick={onClose}
          aria-label="Close teleprompter"
          onMouseDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>

      <div className="script-display-container" ref={containerRef}>
        <div 
          className="script-display-text" 
          ref={textRef}
          style={{ fontSize: `${fontSize}px` }}
        >
          {script}
        </div>
      </div>

      <div className="script-display-controls">
        <div className="script-display-control-group">
          <button
            className="script-display-button"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="script-display-button"
            onClick={() => handleManualScroll('up')}
            aria-label="Scroll up"
          >
            ↑
          </button>
          <button
            className="script-display-button"
            onClick={() => handleManualScroll('down')}
            aria-label="Scroll down"
          >
            ↓
          </button>
          <button
            className="script-display-button"
            onClick={handleReset}
            aria-label="Reset to top"
          >
            ↺
          </button>
        </div>

        <div className="script-display-speed-control">
          <label htmlFor="speed-slider" className="script-display-speed-label">
            Speed: {scrollSpeed} WPM
          </label>
          <input
            id="speed-slider"
            type="range"
            min="80"
            max="200"
            value={scrollSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="script-display-speed-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default ScriptDisplay;

