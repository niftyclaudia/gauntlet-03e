/**
 * Audio Level Meter Component
 * 
 * Horizontal bar showing audio input level (0-100)
 */

import React from 'react';

interface AudioLevelMeterProps {
  /** Audio level (0-100) */
  level: number;
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ level }) => {
  // Determine color based on level: green (0-70), yellow (70-85), red (85-100)
  let barColor = '#4CAF50'; // green
  if (level > 85) {
    barColor = '#f44336'; // red
  } else if (level > 70) {
    barColor = '#FFC107'; // yellow
  }

  return (
    <div className="audio-level-meter">
      <div 
        className="audio-level-bar"
        style={{
          width: `${Math.min(100, Math.max(0, level))}%`,
          backgroundColor: barColor,
          height: '8px',
          borderRadius: '4px',
          transition: 'width 100ms ease, background-color 100ms ease',
        }}
      />
    </div>
  );
};

export default AudioLevelMeter;
