/**
 * Recording Permission Dialog Component
 * 
 * Modal dialog shown when microphone permission is denied
 */

import React from 'react';

interface RecordingPermissionDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Callback when user chooses to continue without audio */
  onContinueWithoutAudio: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

const RecordingPermissionDialog: React.FC<RecordingPermissionDialogProps> = ({
  isOpen,
  onContinueWithoutAudio,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Microphone Permission Required</h2>
        <p className="modal-message">
          Klippy needs access to your microphone to record audio with screen recording.
        </p>
        <div className="modal-buttons">
          <button className="button-secondary" onClick={onContinueWithoutAudio}>
            Continue Without Audio
          </button>
          <button className="button-tertiary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingPermissionDialog;
