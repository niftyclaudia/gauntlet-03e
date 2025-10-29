/**
 * Recording Type Selection Modal
 * 
 * Modal that allows users to choose between screen recording and webcam recording
 */

import React from 'react';

interface RecordingTypeModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when screen recording is selected */
  onSelectScreenRecording: () => void;
  /** Callback when webcam recording is selected */
  onSelectWebcamRecording: () => void;
  /** Callback when PiP recording is selected */
  onSelectPiPRecording: () => void;
}

const RecordingTypeModal: React.FC<RecordingTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectScreenRecording,
  onSelectWebcamRecording,
  onSelectPiPRecording,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recording-type-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Choose Recording Type</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        
        <div className="modal-content">
          <p className="modal-description">
            Select the type of recording you want to create:
          </p>
          
          <div className="recording-options">
            <button
              className="recording-option"
              onClick={onSelectScreenRecording}
            >
              <div className="recording-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1-1H3V5h18v12h-5l1 1h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                  <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
              </div>
              <div className="recording-option-content">
                <h3 className="recording-option-title">Screen Recording</h3>
                <p className="recording-option-description">
                  Record your screen with optional audio
                </p>
              </div>
            </button>
            
            <button
              className="recording-option"
              onClick={onSelectWebcamRecording}
            >
              <div className="recording-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
                </svg>
              </div>
              <div className="recording-option-content">
                <h3 className="recording-option-title">Webcam Recording</h3>
                <p className="recording-option-description">
                  Record using your camera
                </p>
              </div>
            </button>
            
            <button
              className="recording-option"
              onClick={onSelectPiPRecording}
            >
              <div className="recording-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1-1H3V5h18v12h-5l1 1h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                  <circle cx="18" cy="8" r="3"/>
                </svg>
              </div>
              <div className="recording-option-content">
                <h3 className="recording-option-title">Picture-in-Picture</h3>
                <p className="recording-option-description">
                  Record screen and webcam together
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingTypeModal;
