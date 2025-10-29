/**
 * Record Screen Dialog Component
 */

import React, { useState, useEffect } from 'react';
import { ScreenInfo } from '../types/recording';

interface RecordScreenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (screenId: string, audioEnabled: boolean, audioDeviceId?: string) => void;
}

const RecordScreenDialog: React.FC<RecordScreenDialogProps> = ({
  isOpen,
  onClose,
  onStartRecording,
}) => {
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('default');
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadScreens();
      loadAudioDevices();
      checkMicrophonePermission();
    }
  }, [isOpen]);

  const loadScreens = async () => {
    setLoading(true);
    setError(null);
    setThumbnailLoading(new Set());
    try {
      console.log('[RecordScreenDialog] Loading screens...');
      const result = await window.electron.recording.getScreens();
      console.log('[RecordScreenDialog] Screens result:', result);
      
      if (result.error) {
        setError(result.error);
      } else {
        setScreens(result.screens);
        console.log('[RecordScreenDialog] Loaded screens:', result.screens);
        
        // Track which screens need thumbnail loading
        const screensNeedingThumbnails = result.screens
          .filter(screen => !screen.thumbnail || screen.thumbnail.length === 0)
          .map(screen => screen.id);
        setThumbnailLoading(new Set(screensNeedingThumbnails));
        
        if (result.screens.length > 0 && !selectedScreenId) {
          setSelectedScreenId(result.screens[0].id);
        }
      }
    } catch (err) {
      console.error('[RecordScreenDialog] Error loading screens:', err);
      setError('Unable to access screens');
    } finally {
      setLoading(false);
    }
  };

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && selectedAudioDeviceId === 'default') {
        setSelectedAudioDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('[RecordScreenDialog] Failed to load audio devices:', err);
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(permission.state);
      permission.onchange = () => {
        setPermissionStatus(permission.state);
        if (permission.state === 'granted') {
          loadAudioDevices();
        }
      };
    } catch (err) {
      setPermissionStatus('prompt');
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus('granted');
      loadAudioDevices();
    } catch (err) {
      setPermissionStatus('denied');
    }
  };

  const handleStartRecording = () => {
    if (!selectedScreenId) {
      setError('Please select a screen to record');
      return;
    }
    onStartRecording(selectedScreenId, audioEnabled, selectedAudioDeviceId);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Select Screen to Record</h2>
        
        {loading && <div className="modal-loading"><p>Loading screens...</p></div>}
        {error && <div className="modal-error"><p>{error}</p></div>}

        {!loading && !error && screens.length > 0 && (
          <>
            <div className="screen-list">
              {screens.map((screen) => (
                <label key={screen.id} className="screen-option">
                  <input
                    type="radio"
                    name="screen"
                    value={screen.id}
                    checked={selectedScreenId === screen.id}
                    onChange={(e) => setSelectedScreenId(e.target.value)}
                  />
                  <div className="screen-thumbnail-container">
                    {screen.thumbnail && screen.thumbnail.length > 0 ? (
                      <img 
                        src={screen.thumbnail} 
                        alt={screen.name} 
                        className="screen-thumbnail"
                        onLoad={() => {
                          console.log('[RecordScreenDialog] Thumbnail loaded successfully for:', screen.name);
                          console.log('[RecordScreenDialog] Thumbnail src length:', screen.thumbnail.length);
                          // Remove from loading state
                          setThumbnailLoading(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(screen.id);
                            return newSet;
                          });
                        }}
                        onError={(e) => {
                          console.error('[RecordScreenDialog] Thumbnail failed to load for:', screen.name);
                          console.error('[RecordScreenDialog] Error event:', e);
                          console.error('[RecordScreenDialog] Thumbnail src preview:', screen.thumbnail.substring(0, 100));
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                          // Remove from loading state
                          setThumbnailLoading(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(screen.id);
                            return newSet;
                          });
                        }}
                      />
                    ) : null}
                    <div 
                      className="screen-thumbnail-placeholder"
                      style={{ display: (screen.thumbnail && screen.thumbnail.length > 0) ? 'none' : 'flex' }}
                    >
                      {thumbnailLoading.has(screen.id) ? (
                        <div className="screen-loading">
                          <div className="loading-spinner"></div>
                          <div className="screen-label">Loading preview...</div>
                        </div>
                      ) : (
                        <>
                          <div className="screen-icon">🖥️</div>
                          <div className="screen-label">{screen.name}</div>
                          {screen.thumbnail && screen.thumbnail.length === 0 && (
                            <div className="screen-error">No thumbnail</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="screen-info">
                    <div className="screen-name">{screen.name}</div>
                    <div className="screen-resolution">{screen.resolution}</div>
                    <div className="screen-debug" style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                      ID: {screen.id.slice(0, 8)}... | Thumb: {screen.thumbnail ? 'Yes' : 'No'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="audio-settings">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                />
                <span>Record microphone audio</span>
              </label>

              {audioEnabled && permissionStatus === 'granted' && audioDevices.length > 0 && (
                <select
                  value={selectedAudioDeviceId}
                  onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                  className="audio-device-dropdown"
                >
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              )}

              {audioEnabled && permissionStatus === 'prompt' && (
                <button className="button-secondary" onClick={requestMicrophonePermission}>
                  Request Permission
                </button>
              )}
            </div>
          </>
        )}

        <div className="modal-buttons">
          <button className="button-primary" onClick={handleStartRecording} disabled={!selectedScreenId || loading}>
            Start Recording
          </button>
          <button className="button-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default RecordScreenDialog;
