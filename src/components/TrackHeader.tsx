import React, { useState } from 'react';
import { Track } from '../types/video';

interface TrackHeaderProps {
  track: Track;
  isSelected: boolean;
  onTrackSelect: (trackId: string) => void;
  onTrackUpdate: (trackId: string, updates: Partial<Track>) => void;
  onTrackRename: (trackId: string, newName: string) => void;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  isSelected,
  onTrackSelect,
  onTrackUpdate,
  onTrackRename,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(track.name);

  const handleNameClick = () => {
    setIsRenaming(true);
    setTempName(track.name);
  };

  const handleNameSubmit = () => {
    if (tempName.trim() && tempName !== track.name) {
      onTrackRename(track.id, tempName.trim());
    }
    setIsRenaming(false);
  };

  const handleNameCancel = () => {
    setTempName(track.name);
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const handleVisibilityToggle = () => {
    onTrackUpdate(track.id, { isVisible: !track.isVisible });
  };

  const handleMuteToggle = () => {
    onTrackUpdate(track.id, { isMuted: !track.isMuted });
  };

  const handleSoloToggle = () => {
    onTrackUpdate(track.id, { isSolo: !track.isSolo });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseInt(e.target.value, 10);
    onTrackUpdate(track.id, { opacity });
  };


  return (
    <div
      className={`track-header ${isSelected ? 'selected' : ''} ${!track.isVisible ? 'hidden' : ''}`}
      onClick={() => onTrackSelect(track.id)}
    >
      {/* Track Name */}
      <div className="track-name" onClick={handleNameClick}>
        {isRenaming ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="track-name-input"
          />
        ) : (
          <div className="track-name-content">
            <span className="track-name-text">{track.name}</span>
            <span className="track-clip-count">
              {track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Track Controls */}
      <div className="track-controls">
        {/* Top Row: Icon Controls */}
        <div className="track-controls-row">
          {/* Visibility Toggle */}
          <button
            className={`control-button visibility ${track.isVisible ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVisibilityToggle();
            }}
            title={track.isVisible ? 'Hide track' : 'Show track'}
          >
            <span className="icon">👁</span>
          </button>

          {/* Audio Mute */}
          <button
            className={`control-button audio ${track.isMuted ? 'muted' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleMuteToggle();
            }}
            title={track.isMuted ? 'Unmute track' : 'Mute track'}
          >
            <span className="icon">{track.isMuted ? '🔇' : '🔊'}</span>
          </button>

          {/* Solo Button */}
          <button
            className={`control-button solo ${track.isSolo ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSoloToggle();
            }}
            title={track.isSolo ? 'Unsolo track' : 'Solo track'}
          >
            <span className="icon">S</span>
          </button>
        </div>

        {/* Bottom Row: Opacity Control */}
        <div className="opacity-control">
          <div className="opacity-label">OP</div>
          <input
            type="range"
            min="0"
            max="100"
            value={track.opacity}
            onChange={handleOpacityChange}
            onClick={(e) => e.stopPropagation()}
            className="opacity-slider"
            title={`Opacity: ${track.opacity}%`}
          />
          <span className="opacity-value">{track.opacity}%</span>
        </div>
      </div>

      <style>{`
        .track-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 2px 6px 2px 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          user-select: none;
          height: 30px;
          transition: all 0.2s ease;
          z-index: 5;
          font-weight: 500;
          position: relative;
          width: 100%;
        }

        .track-header:hover {
          background: #333;
        }

        .track-header.selected {
          background: #1a3a5c;
        }

        .track-header.hidden {
          opacity: 0.4;
        }

        .track-name {
          flex: 0 0 auto;
          min-width: 60px;
        }

        .track-name-content {
          display: flex;
          flex-direction: column;
          gap: 0px;
        }

        .track-name-text {
          font-size: 10px;
          font-weight: 600;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          min-width: 20px;
        }

        .track-clip-count {
          font-size: 8px;
          color: #888;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
        }

        .track-name-input {
          background: #404040;
          border: 2px solid #007acc;
          color: #fff;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 14px;
          width: 100%;
          transition: all 0.2s ease;
        }

        .track-name-input:focus {
          outline: none;
          border-color: #0099ff;
          box-shadow: 0 0 5px rgba(0, 122, 204, 0.3);
        }

        .track-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          margin-left: auto;
        }

        .track-controls-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .control-button {
          background: transparent;
          border: none;
          color: #ccc;
          cursor: pointer;
          padding: 0;
          border-radius: 2px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          position: relative;
          text-align: center;
        }

        .control-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .control-button.active {
          background: #007acc;
          color: #fff;
        }

        .control-button.muted {
          color: #ff6b6b;
        }

        .control-button.muted:hover {
          background: rgba(255, 107, 107, 0.1);
        }


        .icon {
          font-size: 12px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          text-align: center;
          margin: 0;
          padding: 0;
        }

        .opacity-control {
          display: flex;
          align-items: center;
          gap: 1px;
          min-width: 0;
        }

        .opacity-label {
          font-size: 6px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          min-width: 12px;
        }

        .opacity-slider {
          width: 30px;
          height: 2px;
          background: #404040;
          outline: none;
          border-radius: 1px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .opacity-slider:hover {
          background: #555;
        }

        .opacity-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #007acc;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .opacity-slider::-webkit-slider-thumb:hover {
          background: #0099ff;
          transform: scale(1.1);
        }

        .opacity-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #007acc;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .opacity-slider::-moz-range-thumb:hover {
          background: #0099ff;
          transform: scale(1.1);
        }

        .opacity-value {
          font-size: 8px;
          color: #ccc;
          font-weight: 500;
          min-width: 20px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};
