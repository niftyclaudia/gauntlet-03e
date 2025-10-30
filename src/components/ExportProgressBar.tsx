/**
 * Export Progress Bar Component
 * 
 * Displays export progress with a horizontal progress bar and percentage
 */

import React from 'react';

interface ExportProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Error message (null if no error) */
  error: string | null;
}

const ExportProgressBar: React.FC<ExportProgressBarProps> = ({
  progress,
  isExporting,
  error,
}) => {
  // Debug logging
  console.log('[ExportProgressBar] Props:', { progress, isExporting, error });
  
  if (!isExporting && !error) {
    return null; // Hidden when not exporting
  }

  return (
    <div className="export-progress-container">
      <div className="export-progress-bar-wrapper">
        <div
          className={`export-progress-bar ${error ? 'export-progress-bar-error' : ''}`}
          style={{
            width: `${Math.max(0, Math.min(100, progress))}%`,
          }}
        />
      </div>
      <div className="export-progress-text">
        {error ? (
          <span className="export-progress-error">Export failed: {error}</span>
        ) : (
          <span>Exporting... {Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
};

export default ExportProgressBar;

