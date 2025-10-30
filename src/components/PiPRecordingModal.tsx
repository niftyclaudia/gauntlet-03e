/**
 * Picture-in-Picture Recording Modal Component
 * 
 * Handles simultaneous screen + webcam recording with configurable overlay positioning
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScreenInfo } from '../types/recording';
import { PiPRecordingSettings } from '../types/video';

// Helper function to convert ArrayBuffer to base64 efficiently
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // Process in 8KB chunks
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

interface PiPRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (filePath: string) => void;
}

const PiPRecordingModal: React.FC<PiPRecordingModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  // Screen selection state
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PiP settings state
  const [webcamPosition, setWebcamPosition] = useState<'TL' | 'TR' | 'BL' | 'BR'>('BL');
  const [webcamSize, setWebcamSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [webcamShape, setWebcamShape] = useState<'rectangle' | 'circle'>('rectangle');
  const [audioMode, setAudioMode] = useState<'both' | 'screen-only' | 'webcam-only'>('both');

  // Camera/microphone state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('default');
  
  // Permission state
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [microphonePermissionStatus, setMicrophonePermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Modal view state
  const [currentView, setCurrentView] = useState<'screens' | 'settings' | 'preview' | 'recording' | 'compositing'>('screens');

  // Recording state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [screenRecorder, setScreenRecorder] = useState<MediaRecorder | null>(null);
  const [webcamRecorder, setWebcamRecorder] = useState<MediaRecorder | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  // Refs for video elements
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load screens on modal open
  useEffect(() => {
    console.log('[PiP DEBUG] Modal opened, isOpen:', isOpen);
    if (isOpen) {
      loadScreens();
      loadDevices();
      checkPermissions();
    } else {
      // Reset modal state when closed
      setCurrentView('screens');
      setSessionId(null);
      setElapsedSeconds(0);
      setError(null);
      setScreenRecorder(null);
      setWebcamRecorder(null);
      setScreenStream(null);
      setWebcamStream(null);
      // Clear timer if exists
      if ((window as any).pipTimer) {
        clearInterval((window as any).pipTimer);
        delete (window as any).pipTimer;
      }
    }
  }, [isOpen]);

  // Start preview streams when entering preview view
  useEffect(() => {
    if (currentView === 'preview' && selectedScreenId) {
      let previewScreenStream: MediaStream | null = null;
      let previewWebcamStream: MediaStream | null = null;
      
      const startPreview = async () => {
        try {
          console.log('[PiP DEBUG] Starting preview streams...');
          
          // Get screen stream
          previewScreenStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: selectedScreenId,
              },
            } as any,
          });
          setScreenStream(previewScreenStream);
          
          // Get webcam stream
          const webcamConstraints: MediaStreamConstraints = {
            audio: audioMode === 'both' || audioMode === 'webcam-only',
            video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          };
          previewWebcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
          setWebcamStream(previewWebcamStream);
          
          console.log('[PiP DEBUG] Preview streams started');
        } catch (error) {
          console.error('[PiP DEBUG] Failed to start preview streams:', error);
          setError('Failed to start preview');
        }
      };
      
      startPreview();
      
      // Cleanup on unmount or view change
      return () => {
        if (previewScreenStream) {
          previewScreenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        if (previewWebcamStream) {
          previewWebcamStream.getTracks().forEach(track => track.stop());
          setWebcamStream(null);
        }
      };
    }
  }, [currentView, selectedScreenId, selectedCameraId, audioMode]);

  // Handle screen video element
  useEffect(() => {
    // Use a small timeout to ensure the video element has been rendered
    const timeoutId = setTimeout(() => {
      const video = screenVideoRef.current;
      console.log('[PiP DEBUG] Screen video effect triggered, video element:', !!video, 'screenStream:', !!screenStream, 'stream active:', screenStream?.active);
      
      if (video && screenStream) {
        console.log('[PiP DEBUG] Setting screen video srcObject...');
        video.srcObject = screenStream;
        
        // Check stream tracks
        const tracks = screenStream.getTracks();
        console.log('[PiP DEBUG] Screen stream tracks:', tracks.length, 'Track states:', tracks.map(t => ({ id: t.id, readyState: t.readyState })));
        
        video.play().then(() => {
          console.log('[PiP DEBUG] Screen video playing successfully');
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('[PiP DEBUG] Failed to play screen stream:', err);
          } else {
            console.log('[PiP DEBUG] Play interrupted (normal during re-renders)');
          }
        });
      } else if (!video) {
        console.log('[PiP DEBUG] Screen video element not available yet');
      } else if (!screenStream) {
        console.log('[PiP DEBUG] Screen stream not available yet');
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      const video = screenVideoRef.current;
      if (video) {
        console.log('[PiP DEBUG] Cleaning up screen video element');
        video.srcObject = null;
      }
    };
  }, [screenStream]);

  // Handle webcam video element
  useEffect(() => {
    // Use a small timeout to ensure the video element has been rendered
    const timeoutId = setTimeout(() => {
      const video = webcamVideoRef.current;
      if (video && webcamStream) {
        console.log('[PiP DEBUG] Setting webcam video srcObject...');
        video.srcObject = webcamStream;
        video.play().then(() => {
          console.log('[PiP DEBUG] Webcam video playing successfully');
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('[PiP DEBUG] Failed to play webcam stream:', err);
          }
        });
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      const video = webcamVideoRef.current;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [webcamStream]);

  const loadScreens = async () => {
    console.log('[PiP DEBUG] loadScreens called');
    setLoading(true);
    setError(null);
    try {
      console.log('[PiPRecordingModal] Loading screens...');
      const result = await window.electron.recording.getScreens();
      
      if (result.error) {
        setError(result.error);
      } else {
        console.log('[PiP DEBUG] Screens received:', result.screens);
        result.screens.forEach((screen, index) => {
          console.log(`[PiP DEBUG] Screen ${index + 1}:`, {
            id: screen.id,
            name: screen.name,
            resolution: screen.resolution,
            hasThumbnail: !!screen.thumbnail && screen.thumbnail.length > 0
          });
        });
        setScreens(result.screens);
        
        if (result.screens.length > 0 && !selectedScreenId) {
          setSelectedScreenId(result.screens[0].id);
        }
      }
    } catch (err) {
      console.error('[PiPRecordingModal] Error loading screens:', err);
      setError('Unable to access screens');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      setAudioDevices(audioInputs);
      setCameraDevices(videoInputs);
      
      if (videoInputs.length > 0) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0) {
        setSelectedMicrophoneId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('[PiPRecordingModal] Failed to load devices:', err);
    }
  };

  const checkPermissions = async () => {
    try {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      setCameraPermissionStatus(cameraPermission.state);
      setMicrophonePermissionStatus(microphonePermission.state);
    } catch (err) {
      console.error('[PiPRecordingModal] Failed to check permissions:', err);
    }
  };

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      await checkPermissions();
      await loadDevices();
    } catch (err) {
      console.error('[PiPRecordingModal] Failed to request permissions:', err);
      alert('Permission denied. Please allow camera and microphone access.');
    }
  };

  const handleStartRecording = useCallback(async () => {
    console.log('[PiP DEBUG] handleStartRecording called');
    console.log('[PiP DEBUG] selectedScreenId:', selectedScreenId);
    console.log('[PiP DEBUG] cameraPermissionStatus:', cameraPermissionStatus);
    console.log('[PiP DEBUG] microphonePermissionStatus:', microphonePermissionStatus);
    
    if (!selectedScreenId) {
      console.error('[PiP DEBUG] No screen selected');
      setError('Please select a screen');
      return;
    }

    if (cameraPermissionStatus !== 'granted' || microphonePermissionStatus !== 'granted') {
      console.error('[PiP DEBUG] Permissions not granted:', { cameraPermissionStatus, microphonePermissionStatus });
      alert('Please grant camera and microphone permissions first');
      return;
    }

    try {
      // Create PiP recording session
      console.log('[PiP DEBUG] Creating PiP recording session...');
      const result = await window.electron.pip.startRecording({
        screenId: selectedScreenId,
        position: webcamPosition,
        size: webcamSize,
        shape: webcamShape,
        audioMode
      });
      console.log('[PiP DEBUG] Session creation result:', result);

      if (!result.success || !result.sessionId) {
        console.error('[PiP DEBUG] Session creation failed:', result.error);
        alert(`Failed to start recording: ${result.error}`);
        return;
      }

      console.log('[PiP DEBUG] Session created successfully:', result.sessionId);
      setSessionId(result.sessionId);
      setElapsedSeconds(0);
      
      // Switch to recording view FIRST so video elements are rendered
      setCurrentView('recording');
      
      // Wait a moment for the DOM to render the video elements
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get screen stream for preview and recording
      // Note: Desktop audio capture not supported via getUserMedia
      // Screen audio will be recorded separately if needed
      console.log('[PiP DEBUG] Getting screen stream...');
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false, // Desktop audio not supported via this method
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedScreenId,
          },
        } as any,
      });
      console.log('[PiP DEBUG] Screen stream obtained:', screenStream.id);
      setScreenStream(screenStream);
      
      // Get webcam stream
      console.log('[PiP DEBUG] Getting webcam stream...');
      const webcamConstraints: MediaStreamConstraints = {
        audio: audioMode === 'both' || audioMode === 'webcam-only',
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
      };
      console.log('[PiP DEBUG] Webcam constraints:', webcamConstraints);
      const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
      console.log('[PiP DEBUG] Webcam stream obtained:', webcamStream.id);
      
      // Store webcam stream for live preview
      setWebcamStream(webcamStream);

      // Create MediaRecorders for both streams
      console.log('[PiP DEBUG] Creating MediaRecorders...');
      
      // Check supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      console.log('[PiP DEBUG] Using MIME type:', mimeType);
      
      // Create screen recorder
      const screenMr = new MediaRecorder(screenStream, { mimeType });
      const screenChunksRef: { current: Blob[] } = { current: [] };
      screenMr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          screenChunksRef.current.push(e.data);
        }
      };
      (screenMr as any).__chunksRef = screenChunksRef;
      setScreenRecorder(screenMr);
      
      // Create webcam recorder
      const webcamMr = new MediaRecorder(webcamStream, { mimeType });
      const webcamChunksRef: { current: Blob[] } = { current: [] };
      webcamMr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          webcamChunksRef.current.push(e.data);
        }
      };
      (webcamMr as any).__chunksRef = webcamChunksRef;
      setWebcamRecorder(webcamMr);

      console.log('[PiP DEBUG] MediaRecorders created successfully');

      // Start both recorders
      screenMr.start(1000);
      webcamMr.start(1000);
      console.log('[PiP DEBUG] Recordings started');

      // Start timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Store timer for cleanup
      (window as any).pipTimer = timer;

    } catch (err) {
      console.error('[PiPRecordingModal] Failed to start recording:', err);
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCurrentView('settings');
    }
  }, [selectedScreenId, cameraPermissionStatus, microphonePermissionStatus, webcamPosition, webcamSize, webcamShape, audioMode, selectedCameraId, screenStream, webcamStream]);

  const handleStopRecording = useCallback(async () => {
    if (!sessionId || !screenRecorder || !webcamRecorder) return;

    // Clear timer first
    if ((window as any).pipTimer) {
      clearInterval((window as any).pipTimer);
    }

    // Get chunks from refs
    const screenChunksRef = (screenRecorder as any).__chunksRef;
    const webcamChunksRef = (webcamRecorder as any).__chunksRef;

    if (!screenChunksRef || !webcamChunksRef) {
      alert('Recording chunks not found');
      setCurrentView('settings');
      return;
    }

    // Stop both recorders
    screenRecorder.stop();
    webcamRecorder.stop();
    
    // Clean up streams
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    // Switch to compositing view
    setCurrentView('compositing');

    // Wait a bit for final chunks to be collected
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Get collected chunks from both recorders
      const screenChunksData = screenChunksRef.current;
      const webcamChunksData = webcamChunksRef.current;

      console.log('[PiPRecordingModal] Collected screen chunks:', screenChunksData.length);
      console.log('[PiPRecordingModal] Collected webcam chunks:', webcamChunksData.length);

      if (screenChunksData.length === 0 || webcamChunksData.length === 0) {
        alert('Recording failed: Missing recording chunks');
        setCurrentView('settings');
        return;
      }

      // Create blobs for both recordings
      const screenBlob = new Blob(screenChunksData, { type: 'video/webm' });
      const webcamBlob = new Blob(webcamChunksData, { type: 'video/webm' });

      console.log('[PiPRecordingModal] Created screen blob:', screenBlob.size);
      console.log('[PiPRecordingModal] Created webcam blob:', webcamBlob.size);

      // Convert to ArrayBuffer
      const screenArrayBuffer = await screenBlob.arrayBuffer();
      const webcamArrayBuffer = await webcamBlob.arrayBuffer();

      // Check data size before conversion
      const maxSize = 50 * 1024 * 1024; // 50MB limit
      if (screenArrayBuffer.byteLength > maxSize || webcamArrayBuffer.byteLength > maxSize) {
        throw new Error('Recording data too large. Please record shorter clips.');
      }

      // Convert ArrayBuffers to base64 strings for IPC serialization
      console.log('[PiPRecordingModal] Converting data to base64...');
      const screenBase64 = arrayBufferToBase64(screenArrayBuffer);
      const webcamBase64 = arrayBufferToBase64(webcamArrayBuffer);

      // Stop recording via IPC
      console.log('[PiPRecordingModal] Sending stop recording request:', {
        sessionId,
        screenDataSize: screenArrayBuffer.byteLength,
        webcamDataSize: webcamArrayBuffer.byteLength,
      });
      
      const result = await window.electron.pip.stopRecording({
        sessionId,
        screenData: screenBase64,
        webcamData: webcamBase64,
      });

      if (result.success && result.filePath) {
        onRecordingComplete(result.filePath);
        onClose();
      } else {
        alert(`Failed to compose video: ${result.error}`);
        setCurrentView('settings');
      }
    } catch (err) {
      console.error('[PiPRecordingModal] Failed to stop recording:', err);
      setError(`Failed to stop recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCurrentView('settings');
    }
  }, [sessionId, screenRecorder, webcamRecorder, onRecordingComplete, onClose, webcamStream, screenStream]);

  if (!isOpen) return null;

  // Permission prompt view
  if (cameraPermissionStatus !== 'granted' || microphonePermissionStatus !== 'granted') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Permissions Required</h2>
          
          <p style={{ marginBottom: '20px', color: '#666' }}>
            To record with Picture-in-Picture, we need access to your camera and microphone.
          </p>

          <div className="modal-buttons">
            <button className="button-primary" onClick={requestPermissions}>
              Grant Permissions
            </button>
            <button className="button-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // Screen selection view
  if (currentView === 'screens') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Select Screen for PiP Recording</h2>
          
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
                        <img src={screen.thumbnail} alt={screen.name} className="screen-thumbnail" />
                      ) : (
                        <div className="screen-thumbnail-placeholder">
                          <div className="screen-icon">🖥️</div>
                          <div className="screen-label">{screen.name}</div>
                        </div>
                      )}
                    </div>
                    <div className="screen-info">
                      <div className="screen-name">{screen.name}</div>
                      <div className="screen-resolution">{screen.resolution}</div>
                      <div className="screen-debug" style={{ fontSize: '10px', color: '#666', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>ID: {screen.id.slice(0, 8)}... | Thumb: {screen.thumbnail ? 'Yes' : 'No'}</span>
                        <span className={`source-type-badge source-type-${screen.type}`}>
                          {screen.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="audio-settings">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={audioMode === 'both' || audioMode === 'webcam-only'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAudioMode('both');
                      } else {
                        setAudioMode('screen-only');
                      }
                    }}
                  />
                  <span>Record microphone audio</span>
                </label>

                {(audioMode === 'both' || audioMode === 'webcam-only') && microphonePermissionStatus === 'granted' && audioDevices.length > 0 && (
                  <select
                    value={selectedMicrophoneId}
                    onChange={(e) => setSelectedMicrophoneId(e.target.value)}
                    className="audio-device-dropdown"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                )}

                {(audioMode === 'both' || audioMode === 'webcam-only') && microphonePermissionStatus === 'prompt' && (
                  <button className="button-secondary" onClick={requestPermissions}>
                    Request Permission
                  </button>
                )}
              </div>

              <div className="modal-buttons">
                <button className="button-primary" onClick={() => setCurrentView('settings')} disabled={!selectedScreenId}>
                  Continue
                </button>
                <button className="button-secondary" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Settings view
  if (currentView === 'settings') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Configure PiP Settings</h2>
          
          <div className="pip-settings">
            {/* Webcam Position */}
            <div className="setting-group">
              <label className="setting-label">Webcam Position</label>
              <div className="position-selector">
                <button 
                  className={`position-button ${webcamPosition === 'TL' ? 'active' : ''}`}
                  onClick={() => setWebcamPosition('TL')}
                >
                  Top-Left
                </button>
                <button 
                  className={`position-button ${webcamPosition === 'TR' ? 'active' : ''}`}
                  onClick={() => setWebcamPosition('TR')}
                >
                  Top-Right
                </button>
                <button 
                  className={`position-button ${webcamPosition === 'BL' ? 'active' : ''}`}
                  onClick={() => setWebcamPosition('BL')}
                >
                  Bottom-Left
                </button>
                <button 
                  className={`position-button ${webcamPosition === 'BR' ? 'active' : ''}`}
                  onClick={() => setWebcamPosition('BR')}
                >
                  Bottom-Right
                </button>
              </div>
            </div>

            {/* Webcam Size */}
            <div className="setting-group">
              <label className="setting-label">Webcam Size</label>
              <div className="size-selector">
                <button 
                  className={`size-button ${webcamSize === 'small' ? 'active' : ''}`}
                  onClick={() => setWebcamSize('small')}
                >
                  Small (20%)
                </button>
                <button 
                  className={`size-button ${webcamSize === 'medium' ? 'active' : ''}`}
                  onClick={() => setWebcamSize('medium')}
                >
                  Medium (30%)
                </button>
                <button 
                  className={`size-button ${webcamSize === 'large' ? 'active' : ''}`}
                  onClick={() => setWebcamSize('large')}
                >
                  Large (40%)
                </button>
              </div>
            </div>

            {/* Audio Mode */}
            <div className="setting-group">
              <label className="setting-label">Audio Source</label>
              <div className="audio-mode-selector">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="audioMode"
                    value="both"
                    checked={audioMode === 'both'}
                    onChange={() => setAudioMode('both')}
                  />
                  Both (mixed)
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="audioMode"
                    value="screen-only"
                    checked={audioMode === 'screen-only'}
                    onChange={() => setAudioMode('screen-only')}
                  />
                  Screen only
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="audioMode"
                    value="webcam-only"
                    checked={audioMode === 'webcam-only'}
                    onChange={() => setAudioMode('webcam-only')}
                  />
                  Webcam only
                </label>
              </div>
            </div>
          </div>

          <div className="modal-buttons">
            <button className="button-primary" onClick={() => setCurrentView('preview')}>
              Preview
            </button>
            <button className="button-secondary" onClick={() => setCurrentView('screens')}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview view - shows what will be recorded
  if (currentView === 'preview') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Preview PiP Setup</h2>
          
          <div style={{ 
            margin: '24px 0', 
            padding: '24px', 
            backgroundColor: '#1a1a1a', 
            borderRadius: '8px',
            position: 'relative',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Screen preview with live feeds */}
            <div style={{
              width: '100%',
              height: '360px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: '2px solid #3a3a3a',
              overflow: 'hidden'
            }}>
              {/* Live screen preview */}
              {screenStream && (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                />
              )}
              
              {/* Placeholder if no screen stream */}
              {!screenStream && (
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Loading preview...
                </p>
              )}
              
              {/* Live webcam preview overlay */}
              {webcamStream && (
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    width: webcamSize === 'small' ? '20%' : webcamSize === 'medium' ? '30%' : '40%',
                    height: 'auto',
                    borderRadius: webcamShape === 'circle' ? '50%' : '8px',
                    border: '2px solid #ff6b35',
                    objectFit: 'cover',
                    ...(webcamPosition === 'TL' && { top: '10px', left: '10px' }),
                    ...(webcamPosition === 'TR' && { top: '10px', right: '10px' }),
                    ...(webcamPosition === 'BL' && { bottom: '10px', left: '10px' }),
                    ...(webcamPosition === 'BR' && { bottom: '10px', right: '10px' }),
                  }}
                />
              )}
              
              {/* Preview webcam overlay placeholder if no webcam stream */}
              {!webcamStream && (
                <div
                  style={{
                    position: 'absolute',
                    width: webcamSize === 'small' ? '20%' : webcamSize === 'medium' ? '30%' : '40%',
                    height: 'auto',
                    aspectRatio: '4/3',
                    borderRadius: webcamShape === 'circle' ? '50%' : '8px',
                    border: '2px dashed #ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ff6b35',
                    fontSize: '12px',
                    ...(webcamPosition === 'TL' && { top: '10px', left: '10px' }),
                    ...(webcamPosition === 'TR' && { top: '10px', right: '10px' }),
                    ...(webcamPosition === 'BL' && { bottom: '10px', left: '10px' }),
                    ...(webcamPosition === 'BR' && { bottom: '10px', right: '10px' }),
                  }}
                >
                  Webcam
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            padding: '16px', 
            backgroundColor: '#2a2a2a', 
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Preview Settings:</p>
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              <p>Position: {webcamPosition}</p>
              <p>Size: {webcamSize}</p>
              <p>Shape: {webcamShape}</p>
              <p>Audio: {audioMode}</p>
            </div>
          </div>

          <div className="modal-buttons">
            <button className="button-primary" onClick={handleStartRecording}>
              Start Recording
            </button>
            <button className="button-secondary" onClick={() => setCurrentView('settings')}>
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Recording view with live preview
  if (currentView === 'recording') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Recording Picture-in-Picture</h2>
          
          <div style={{ 
            margin: '24px 0', 
            padding: '24px', 
            backgroundColor: '#1a1a1a', 
            borderRadius: '8px',
            position: 'relative',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Screen recording area placeholder */}
            <div style={{
              width: '100%',
              height: '360px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: '2px solid #3a3a3a',
              overflow: 'hidden'
            }}>
              {/* Live screen preview */}
              {screenStream && (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                />
              )}
              
              {/* Placeholder if no screen stream */}
              {!screenStream && (
                <p style={{ color: '#666', fontSize: '14px' }}>Screen Recording Area</p>
              )}
              
              {/* Live webcam preview overlay */}
              {webcamStream && (
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    width: webcamSize === 'small' ? '20%' : webcamSize === 'medium' ? '30%' : '40%',
                    height: 'auto',
                    borderRadius: webcamShape === 'circle' ? '50%' : '8px',
                    border: '2px solid #ff6b35',
                    objectFit: 'cover',
                    ...(webcamPosition === 'TL' && { top: '10px', left: '10px' }),
                    ...(webcamPosition === 'TR' && { top: '10px', right: '10px' }),
                    ...(webcamPosition === 'BL' && { bottom: '10px', left: '10px' }),
                    ...(webcamPosition === 'BR' && { bottom: '10px', right: '10px' }),
                  }}
                />
              )}
            </div>
            
            {/* Recording indicator */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: '8px 12px',
              borderRadius: '20px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#ff0000',
                borderRadius: '50%',
                animation: 'pulse 1s infinite'
              }}></div>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div style={{ 
            padding: '16px', 
            backgroundColor: '#2a2a2a', 
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Settings:</p>
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              <p>Position: {webcamPosition}</p>
              <p>Size: {webcamSize}</p>
              <p>Shape: {webcamShape}</p>
              <p>Audio: {audioMode}</p>
            </div>
          </div>

          <div className="modal-buttons">
            <button className="button-primary" onClick={handleStopRecording}>
              Stop Recording
            </button>
            <button className="button-secondary" onClick={() => setCurrentView('screens')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compositing view
  if (currentView === 'compositing') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Creating Composite Video</h2>
          
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <div className="processing-spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: '#999' }}>
              Combining screen and webcam recordings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PiPRecordingModal;

