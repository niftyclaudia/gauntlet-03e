/**
 * Advanced Export Dialog Component
 * 
 * Main dialog for advanced export options with preset selection and custom settings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TimelineClip, VideoClip, AdvancedExportSettings, ExportPreset } from '../types/video';
import { 
  EXPORT_PRESETS, 
  validateAdvancedExportSettings, 
  createAdvancedExportSettings,
  getDefaultExportPreset 
} from '../utils/exportValidation';
import ExportPresetButton from './ExportPresetButton';
import ExportSettingsPanel from './ExportSettingsPanel';
import ExportValidationWarning from './ExportValidationWarning';
import ExportProgressBar from './ExportProgressBar';

interface AdvancedExportDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Timeline clips to export */
  clips: TimelineClip[];
  /** Library clips for source files */
  libraryClips: VideoClip[];
  /** Export progress (0-100) */
  exportProgress: number;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Export error message */
  exportError: string | null;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when export is started */
  onStartExport: (settings: AdvancedExportSettings) => void;
  /** Callback when export is cancelled */
  onCancelExport: () => void;
}

const AdvancedExportDialog: React.FC<AdvancedExportDialogProps> = ({
  isOpen,
  clips,
  libraryClips,
  exportProgress,
  isExporting,
  exportError,
  onClose,
  onStartExport,
  onCancelExport,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(getDefaultExportPreset());
  const [customResolution, setCustomResolution] = useState<{ width: number; height: number } | null>(null);
  const [customBitrate, setCustomBitrate] = useState<number | null>(null);
  const [customFramerate, setCustomFramerate] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState({ valid: true, warnings: [], errors: [] });

  // Create current settings object with useMemo to prevent infinite loops
  const currentSettings: AdvancedExportSettings = useMemo(() => ({
    preset: selectedPreset,
    customResolution,
    customBitrate,
    customFramerate,
  }), [selectedPreset, customResolution, customBitrate, customFramerate]);

  // Validate settings whenever they change
  useEffect(() => {
    if (clips.length > 0 && libraryClips.length > 0) {
      const result = validateAdvancedExportSettings(currentSettings, libraryClips);
      setValidationResult(result);
    }
  }, [currentSettings, clips, libraryClips]);

  const handlePresetSelect = useCallback((preset: ExportPreset) => {
    setSelectedPreset(preset);
    
    // Reset custom settings when switching presets
    if (preset.id !== 'custom') {
      setCustomResolution(null);
      setCustomBitrate(null);
      setCustomFramerate(null);
    } else {
      // Initialize custom settings with current preset values
      setCustomResolution(preset.resolution);
      setCustomBitrate(preset.bitrate);
      setCustomFramerate(preset.framerate);
    }
  }, []);

  const handleResolutionChange = useCallback((resolution: { width: number; height: number }) => {
    setCustomResolution(resolution);
  }, []);

  const handleBitrateChange = useCallback((bitrate: number) => {
    setCustomBitrate(bitrate);
  }, []);

  const handleFramerateChange = useCallback((framerate: number) => {
    setCustomFramerate(framerate);
  }, []);

  const handleExport = useCallback(() => {
    if (validationResult.valid) {
      onStartExport(currentSettings);
    }
  }, [validationResult.valid, currentSettings, onStartExport]);

  const handleCancel = useCallback(() => {
    if (isExporting) {
      onCancelExport();
    } else {
      onClose();
    }
  }, [isExporting, onCancelExport, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="advanced-export-dialog-overlay" onClick={onClose}>
      <div className="advanced-export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="advanced-export-dialog-header">
          <h2>Advanced Export Options</h2>
          <button
            className="advanced-export-dialog-close"
            onClick={onClose}
            disabled={isExporting}
          >
            ×
          </button>
        </div>

        <div className="advanced-export-dialog-content">
          {/* Preset Selection */}
          <div className="advanced-export-section">
            <h3>Platform Presets</h3>
            <div className="advanced-export-presets">
              {EXPORT_PRESETS.map((preset) => (
                <ExportPresetButton
                  key={preset.id}
                  preset={preset}
                  selected={selectedPreset.id === preset.id}
                  onClick={handlePresetSelect}
                />
              ))}
            </div>
          </div>

          {/* Custom Settings Panel */}
          <div className="advanced-export-section">
            <ExportSettingsPanel
              enabled={selectedPreset.id === 'custom'}
              resolution={customResolution || selectedPreset.resolution}
              bitrate={customBitrate || selectedPreset.bitrate}
              framerate={customFramerate || selectedPreset.framerate}
              onResolutionChange={handleResolutionChange}
              onBitrateChange={handleBitrateChange}
              onFramerateChange={handleFramerateChange}
            />
          </div>

          {/* Validation Warnings/Errors */}
          <div className="advanced-export-section">
            <ExportValidationWarning
              warnings={validationResult.warnings}
              errors={validationResult.errors}
            />
          </div>


          {/* Export Error */}
          {exportError && (
            <div className="advanced-export-section">
              <div className="advanced-export-error">
                <strong>Export Failed:</strong> {exportError}
              </div>
            </div>
          )}
        </div>

        <div className="advanced-export-dialog-actions">
          <button
            className="advanced-export-button advanced-export-button-secondary"
            onClick={handleCancel}
          >
            {isExporting ? 'Cancel Export' : 'Cancel'}
          </button>
          <button
            className="advanced-export-button advanced-export-button-primary"
            onClick={handleExport}
            disabled={!validationResult.valid || isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {/* Export Progress Bar - Integrated with button row */}
        {isExporting && (
          <ExportProgressBar 
            progress={exportProgress}
            isExporting={isExporting}
            error={exportError}
          />
        )}
      </div>
    </div>
  );
};

export default AdvancedExportDialog;
