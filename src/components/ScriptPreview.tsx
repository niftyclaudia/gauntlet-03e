/**
 * ScriptPreview Component
 * 
 * Displays generated script with Accept, Edit, and Regenerate options
 */

import React, { useState } from 'react';

interface ScriptPreviewProps {
  script: string;
  wordCount: number;
  estimatedReadTime: number;
  onAccept: () => void;
  onEdit: (editedScript: string) => void;
  onRegenerate: (feedback?: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  script,
  wordCount,
  estimatedReadTime,
  onAccept,
  onEdit,
  onRegenerate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(script);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);

  const formatReadTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  const handleSaveEdit = () => {
    onEdit(editedScript);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    const feedback = regenerateFeedback.trim() || undefined;
    onRegenerate(feedback);
    setShowRegenerateForm(false);
    setRegenerateFeedback('');
  };

  return (
    <div className="script-preview">
      <div className="script-preview-header">
        <h3 className="script-preview-title">Generated Script</h3>
        <div className="script-preview-stats">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>~{formatReadTime(estimatedReadTime)} read time</span>
        </div>
      </div>

      {isEditing ? (
        <div className="script-preview-edit">
          <textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="script-preview-textarea"
            rows={12}
          />
          <div className="script-preview-edit-actions">
            <button
              onClick={handleSaveEdit}
              className="script-preview-button script-preview-button-primary"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedScript(script);
              }}
              className="script-preview-button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="script-preview-content">
            <pre className="script-preview-text">{script}</pre>
          </div>

          {showRegenerateForm ? (
            <div className="script-preview-regenerate-form">
              <label htmlFor="feedback" className="script-preview-label">
                Optional feedback for regeneration (e.g., "shorter", "more casual", "add bullet points"):
              </label>
              <textarea
                id="feedback"
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                className="script-preview-textarea"
                rows={2}
                placeholder="Add your feedback here..."
              />
              <div className="script-preview-regenerate-actions">
                <button
                  onClick={handleRegenerate}
                  className="script-preview-button script-preview-button-primary"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => {
                    setShowRegenerateForm(false);
                    setRegenerateFeedback('');
                  }}
                  className="script-preview-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="script-preview-actions">
              <button
                onClick={onAccept}
                className="script-preview-button script-preview-button-primary"
              >
                Accept
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="script-preview-button"
              >
                Edit
              </button>
              <button
                onClick={() => setShowRegenerateForm(true)}
                className="script-preview-button"
              >
                Regenerate
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScriptPreview;

