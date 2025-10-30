/**
 * Export Preset Button Component
 * 
 * Displays a platform preset button (YouTube, Instagram, TikTok, etc.)
 * with highlight state when selected
 */

import React from 'react';
import { ExportPreset } from '../types/video';

interface ExportPresetButtonProps {
  /** Preset configuration */
  preset: ExportPreset;
  /** Whether this preset is currently selected */
  selected: boolean;
  /** Click handler */
  onClick: (preset: ExportPreset) => void;
}

const ExportPresetButton: React.FC<ExportPresetButtonProps> = ({
  preset,
  selected,
  onClick,
}) => {
  const handleClick = () => {
    onClick(preset);
  };

  // Calculate aspect ratio for display
  const getAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
    if (Math.abs(ratio - 4/5) < 0.1) return '4:5';
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    return `${width}:${height}`;
  };

  const aspectRatio = getAspectRatio(preset.resolution.width, preset.resolution.height);

  return (
    <button
      className={`export-preset-button ${selected ? 'export-preset-button-selected' : ''}`}
      onClick={handleClick}
      type="button"
    >
      <div className="export-preset-button-content">
        <div className="export-preset-button-name">{preset.name}</div>
        <div className="export-preset-button-aspect-ratio">{aspectRatio}</div>
      </div>
    </button>
  );
};

export default ExportPresetButton;
