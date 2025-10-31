/**
 * Time Ruler Component
 * 
 * Displays timecode (HH:MM:SS.mmm) above timeline with tick marks and click-to-seek
 */

import React from 'react';

interface TimeRulerProps {
  /** Current playhead position in seconds */
  currentTime: number;
  /** Timeline zoom level (1.0 to 10.0) */
  zoom: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Width of timeline viewport in pixels */
  timelineWidth: number;
  /** Scroll position of timeline in pixels */
  scrollPosition: number;
  /** Callback when ruler is clicked to seek */
  onSeek?: (time: number) => void;
}

const BASE_PIXELS_PER_SECOND = 10; // Must match timelineCalculations.ts

interface Tick {
  time: number;
  x: number;
  isMajor: boolean;
  label?: string;
}

const TimeRuler: React.FC<TimeRulerProps> = ({
  currentTime,
  zoom,
  totalDuration,
  timelineWidth,
  scrollPosition,
  onSeek,
}) => {
  /**
   * Format time in seconds to HH:MM:SS.mmm
   */
  const formatTimecode = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');
    const msStr = String(milliseconds).padStart(3, '0');

    return `${hoursStr}:${minutesStr}:${secsStr}.${msStr}`;
  };

  /**
   * Format time in seconds to MM:SS or HH:MM:SS for tick labels
   */
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * Generate tick marks for the ruler based on zoom level
   */
  const generateTicks = (): Tick[] => {
    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
    const ticks: Tick[] = [];
    
    // Determine tick interval based on zoom level
    // At low zoom: 10s intervals (major), 5s intervals (minor)
    // At medium zoom: 1s intervals (major), 0.5s intervals (minor)
    // At high zoom: 0.1s intervals (major), 0.05s intervals (minor)
    let majorInterval: number;
    let minorInterval: number;
    
    if (zoom < 2) {
      majorInterval = 10;
      minorInterval = 5;
    } else if (zoom < 5) {
      majorInterval = 1;
      minorInterval = 0.5;
    } else {
      majorInterval = 0.1;
      minorInterval = 0.05;
    }

    // Generate ticks from 0 to totalDuration
    const minWidth = totalDuration * pixelsPerSecond;
    const visibleStart = Math.max(0, Math.floor((scrollPosition - 100) / pixelsPerSecond / minorInterval) * minorInterval);
    const visibleEnd = Math.min(totalDuration, Math.ceil((scrollPosition + timelineWidth + 100) / pixelsPerSecond / minorInterval) * minorInterval);

    for (let time = visibleStart; time <= visibleEnd; time += minorInterval) {
      const x = time * pixelsPerSecond;
      const isMajor = Math.abs(time % majorInterval) < 0.001; // Handle floating point precision
      
      if (isMajor) {
        ticks.push({
          time,
          x,
          isMajor: true,
          label: formatTime(time)
        });
      } else {
        ticks.push({
          time,
          x,
          isMajor: false
        });
      }
    }

    return ticks;
  };

  /**
   * Handle ruler click to seek playhead
   */
  const handleRulerClick = (e: React.MouseEvent) => {
    if (!onSeek) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
    const time = x / pixelsPerSecond;
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    
    onSeek(clampedTime);
  };

  const ticks = generateTicks();
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const playheadX = currentTime * pixelsPerSecond;

  // Calculate minimum width to match timeline content
  const minWidth = totalDuration * pixelsPerSecond;

  return (
    <div className="time-ruler-container">
      {/* Visual ruler */}
      <div 
        className="time-ruler"
        onClick={handleRulerClick}
        style={{
          position: 'relative',
          height: '40px',
          width: `${Math.max(timelineWidth, minWidth)}px`,
          minWidth: `${minWidth}px`,
          cursor: onSeek ? 'pointer' : 'default',
          overflow: 'visible',
          background: 'linear-gradient(to bottom, #252525 0%, #1a1a1a 100%)',
          borderBottom: '1px solid #333333'
        }}
      >
        {/* Tick marks */}
        {ticks.map((tick, index) => (
          <div
            key={`tick-${tick.time}-${index}`}
            className={`time-ruler-tick ${tick.isMajor ? 'major' : 'minor'}`}
            style={{
              position: 'absolute',
              left: `${tick.x}px`,
              top: tick.isMajor ? '0px' : '20px',
              height: tick.isMajor ? '40px' : '20px',
              width: tick.isMajor ? '1.5px' : '1px',
              backgroundColor: tick.isMajor ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
              zIndex: 1
            }}
          />
        ))}
        
        {/* Time labels */}
        {ticks
          .filter(tick => tick.isMajor && tick.label)
          .map((tick, index) => (
            <div
              key={`label-${tick.time}-${index}`}
              className="time-ruler-label"
              style={{
                position: 'absolute',
                left: `${tick.x + 6}px`,
                top: '4px',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                zIndex: 2
              }}
            >
              {tick.label}
            </div>
          ))}
        
        {/* Playhead indicator on ruler - white */}
        <div
          className="time-ruler-playhead"
          style={{
            position: 'absolute',
            left: `${playheadX}px`,
            top: '0px',
            width: '2px',
            height: '40px',
            background: '#ffffff',
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.6)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        />
        
        {/* Time display floating near playhead */}
        <div
          className="time-ruler-playhead-time"
          style={{
            position: 'absolute',
            left: `${Math.max(6, Math.min(playheadX + 8, timelineWidth - 80))}px`,
            top: '-24px',
            background: '#ffffff',
            color: '#1a1a1a',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1002,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            opacity: playheadX >= -100 && playheadX <= timelineWidth + 100 ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}
        >
          {formatTimecode(currentTime)}
        </div>
      </div>
    </div>
  );
};

export default TimeRuler;
