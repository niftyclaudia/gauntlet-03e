/**
 * Export Settings Panel Component
 * 
 * Custom settings panel for resolution, bitrate, and framerate configuration
 * Only visible when Custom preset is selected
 */

import React from 'react';

interface ExportSettingsPanelProps {
  /** Whether custom mode is enabled */
  enabled: boolean;
  /** Current resolution */
  resolution: { width: number; height: number };
  /** Current bitrate in Mbps */
  bitrate: number;
  /** Current framerate in fps */
  framerate: number;
  /** Resolution change handler */
  onResolutionChange: (resolution: { width: number; height: number }) => void;
  /** Bitrate change handler */
  onBitrateChange: (bitrate: number) => void;
  /** Framerate change handler */
  onFramerateChange: (framerate: number) => void;
}

const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({
  enabled,
  resolution,
  bitrate,
  framerate,
  onResolutionChange,
  onBitrateChange,
  onFramerateChange,
}) => {
  // Standard resolution presets
  const resolutionPresets = [
    { name: '720p', width: 1280, height: 720 },
    { name: '1080p', width: 1920, height: 1080 },
    { name: '4K', width: 3840, height: 2160 },
  ];

  // Standard framerate options
  const framerateOptions = [24, 30, 60];

  const handleResolutionPresetChange = (preset: { width: number; height: number }) => {
    onResolutionChange(preset);
  };

  const handleCustomResolutionChange = (field: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onResolutionChange({
        ...resolution,
        [field]: numValue
      });
    }
  };

  const handleBitrateSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    onBitrateChange(value);
  };

  const handleBitrateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 1 && value <= 20) {
      onBitrateChange(value);
    }
  };

  const handleFramerateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value, 10);
    onFramerateChange(value);
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="export-settings-panel">
      <h3 className="export-settings-panel-title">Custom Settings</h3>
      
      {/* Resolution Settings */}
      <div className="export-settings-group">
        <label className="export-settings-label">Resolution</label>
        <div className="export-settings-resolution">
          <div className="export-settings-presets">
            {resolutionPresets.map((preset) => (
              <button
                key={preset.name}
                className={`export-settings-preset-button ${
                  resolution.width === preset.width && resolution.height === preset.height
                    ? 'export-settings-preset-button-selected'
                    : ''
                }`}
                onClick={() => handleResolutionPresetChange(preset)}
                type="button"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="export-settings-custom-resolution">
            <input
              type="number"
              className="export-settings-input"
              value={resolution.width}
              onChange={(e) => handleCustomResolutionChange('width', e.target.value)}
              placeholder="Width"
              min="480"
              max="3840"
            />
            <span className="export-settings-separator">×</span>
            <input
              type="number"
              className="export-settings-input"
              value={resolution.height}
              onChange={(e) => handleCustomResolutionChange('height', e.target.value)}
              placeholder="Height"
              min="270"
              max="2160"
            />
          </div>
        </div>
      </div>

      {/* Bitrate Settings */}
      <div className="export-settings-group">
        <label className="export-settings-label">
          Video Bitrate: {bitrate.toFixed(1)} Mbps
        </label>
        <div className="export-settings-bitrate">
          <input
            type="range"
            className="export-settings-slider"
            min="1"
            max="20"
            step="0.5"
            value={bitrate}
            onChange={handleBitrateSliderChange}
          />
          <input
            type="number"
            className="export-settings-input export-settings-bitrate-input"
            value={bitrate}
            onChange={handleBitrateInputChange}
            min="1"
            max="20"
            step="0.5"
          />
        </div>
      </div>

      {/* Framerate Settings */}
      <div className="export-settings-group">
        <label className="export-settings-label">Framerate</label>
        <select
          className="export-settings-select"
          value={framerate}
          onChange={handleFramerateChange}
        >
          {framerateOptions.map((fps) => (
            <option key={fps} value={fps}>
              {fps} fps
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ExportSettingsPanel;
