/**
 * Export Validation Warning Component
 * 
 * Displays validation warnings and errors for export settings
 */

import React from 'react';

interface ExportValidationWarningProps {
  /** Warning messages (non-blocking) */
  warnings: string[];
  /** Error messages (blocking) */
  errors: string[];
}

const ExportValidationWarning: React.FC<ExportValidationWarningProps> = ({
  warnings,
  errors,
}) => {
  if (warnings.length === 0 && errors.length === 0) {
    return null;
  }

  return (
    <div className="export-validation-warning">
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="export-validation-errors">
          <div className="export-validation-title export-validation-title-error">
            ⚠️ Export Settings Error
          </div>
          <ul className="export-validation-list">
            {errors.map((error, index) => (
              <li key={index} className="export-validation-item export-validation-item-error">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="export-validation-warnings">
          <div className="export-validation-title export-validation-title-warning">
            ℹ️ Export Settings Warning
          </div>
          <ul className="export-validation-list">
            {warnings.map((warning, index) => (
              <li key={index} className="export-validation-item export-validation-item-warning">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExportValidationWarning;
