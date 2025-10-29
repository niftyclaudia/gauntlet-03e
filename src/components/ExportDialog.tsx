/**
 * Export Dialog Component
 * 
 * Shows success/error dialog after export completes
 */

import React from 'react';

interface ExportDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether export was successful */
  success: boolean;
  /** Exported file path (for success) */
  filePath: string | null;
  /** Error message (for error) */
  error: string | null;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when "Reveal in Finder" is clicked */
  onReveal: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  success,
  filePath,
  error,
  onClose,
  onReveal,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <>
            <div className="export-dialog-header">
              <h2>Export Complete</h2>
            </div>
            <div className="export-dialog-content">
              <p>Your video has been exported successfully!</p>
              {filePath && (
                <p className="export-dialog-path">{filePath}</p>
              )}
            </div>
            <div className="export-dialog-actions">
              <button
                className="export-dialog-button export-dialog-button-primary"
                onClick={onReveal}
              >
                Reveal in Finder
              </button>
              <button
                className="export-dialog-button"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="export-dialog-header">
              <h2>Export Failed</h2>
            </div>
            <div className="export-dialog-content">
              <p>An error occurred during export:</p>
              {error && (
                <p className="export-dialog-error">{error}</p>
              )}
            </div>
            <div className="export-dialog-actions">
              <button
                className="export-dialog-button export-dialog-button-primary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportDialog;

