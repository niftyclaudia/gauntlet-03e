import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RecordingSession, CameraDevice, EncodedRecording } from '../types/video';
import { TeleprompterScript } from '../types/teleprompter';
import TeleprompterModal from './TeleprompterModal';
import ScriptDisplay from './ScriptDisplay';

interface WebcamRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (filePath: string) => void;
}

const WebcamRecordingModal: React.FC<WebcamRecordingModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [session, setSession] = useState<RecordingSession>({
    status: 'idle',
    recordedChunks: [],
    startTime: 0,
    elapsedSeconds: 0,
  });
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('default');
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [streamAttached, setStreamAttached] = useState<boolean>(false);
  const handleRecordingCompleteRef = useRef<(blob: Blob) => Promise<void>>();
  const recordingChunksRef = useRef<Blob[]>([]);
  
  // Teleprompter state
  const [teleprompterScript, setTeleprompterScript] = useState<TeleprompterScript | null>(null);
  const [showTeleprompterModal, setShowTeleprompterModal] = useState<boolean>(false);
  const [showTeleprompterOverlay, setShowTeleprompterOverlay] = useState<boolean>(false);
  const [teleprompterIsPlaying, setTeleprompterIsPlaying] = useState<boolean>(false);
  const [teleprompterScrollSpeed, setTeleprompterScrollSpeed] = useState<number>(150); // WPM
  const [teleprompterFontSize, setTeleprompterFontSize] = useState<number>(32); // pixels

  // Attach media stream to video element when available
  useEffect(() => {
    if (session.mediaStream && videoRef.current) {
      // Set the stream as srcObject
      videoRef.current.srcObject = session.mediaStream;
      
      videoRef.current.onloadedmetadata = () => {
        setStreamAttached(true);
      };
      
      // Attempt to play the video
      videoRef.current.play()
        .then(() => {
          // Video playing successfully
        })
        .catch(err => {
          console.error('[Video Attachment] Error playing video:', err);
          setStreamAttached(false);
        });
    } else {
      setStreamAttached(false);
    }
  }, [session.mediaStream]);

  // Timer effect for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (session.status === 'recording') {
      interval = setInterval(() => {
        setSession(prev => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - prev.startTime) / 1000)
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.status, session.startTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get status pill text and color
  const getStatusInfo = () => {
    switch (session.status) {
      case 'idle':
        return { text: 'idle', color: '#999999' };
      case 'preview':
        return { text: 'previewing', color: '#0066cc' };
      case 'recording':
        return { text: 'recording', color: '#ff4444' };
      case 'saving':
        return { text: 'saving', color: '#ffaa00' };
      case 'error':
        return { text: 'error', color: '#ff6666' };
      default:
        return { text: 'idle', color: '#999999' };
    }
  };

  // Load audio devices
  const loadAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && selectedAudioDeviceId === 'default') {
        setSelectedAudioDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to load audio devices:', err);
    }
  }, [selectedAudioDeviceId]);

  // Get available cameras - must be defined before functions that use it
  const getAvailableCameras = useCallback(async () => {
    try {
      // First request permission to get proper camera labels
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (permError) {
        // Permission not granted yet, continuing with enumeration
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const,
        }));
      
      setAvailableCameras(cameras);
      
      // Select first camera by default
      if (cameras.length > 0) {
        setSelectedCameraId(cameras[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      setSession(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to detect cameras'
      }));
    }
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = useCallback(async () => {
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
  }, [loadAudioDevices]);

  // Check camera permission
  const checkCameraPermission = useCallback(async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermissionStatus(permission.state);
      permission.onchange = () => {
        setCameraPermissionStatus(permission.state);
        if (permission.state === 'granted') {
          getAvailableCameras();
        }
      };
    } catch (err) {
      setCameraPermissionStatus('prompt');
    }
  }, [getAvailableCameras]);

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      setCameraPermissionStatus('granted');
      getAvailableCameras();
    } catch (err) {
      console.error('Camera permission denied:', err);
      setCameraPermissionStatus('denied');
    }
  }, [getAvailableCameras]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setPermissionStatus('granted');
      loadAudioDevices();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setPermissionStatus('denied');
    }
  }, [loadAudioDevices]);

  // Request camera and microphone access
  const requestMediaAccess = useCallback(async () => {
    try {
      setSession(prev => ({ ...prev, status: 'idle' }));

      // Stop any existing stream first
      if (session.mediaStream) {
        session.mediaStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
        audio: audioEnabled ? (selectedAudioDeviceId !== 'default' ? { deviceId: { exact: selectedAudioDeviceId } } : true) : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add event listeners to track when tracks end
      stream.getTracks().forEach((track, index) => {
        track.onended = () => {
          console.error(`[Track Event] Track ${index} (${track.kind}) ended unexpectedly!`, {
            trackId: track.id,
            label: track.label,
            readyState: track.readyState
          });
          console.trace('[Track Event] Stack trace for track ending');
        };
      });
      
      // Verify we have the tracks we expect
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setSession(prev => ({
        ...prev,
        status: 'preview',
        mediaStream: stream,
        selectedCameraId,
        errorMessage: undefined,
      }));
      
      // Show preview modal
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to access camera/microphone:', error);
      
      let errorMessage = 'Failed to access camera or microphone';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera or microphone permission denied. Please allow access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a webcam and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application. Please close other apps and try again.';
        }
      }

      setSession(prev => ({
        ...prev,
        status: 'error',
        errorMessage,
      }));
    }
  }, [selectedCameraId, session.mediaStream, audioEnabled, selectedAudioDeviceId]);

  // Handle camera selection change
  const handleCameraChange = useCallback((cameraId: string) => {
    setSelectedCameraId(cameraId);
    // If we already have a stream, restart with the new camera
    if (session.status === 'preview' || session.status === 'recording') {
      requestMediaAccess();
    }
  }, [session.status, requestMediaAccess]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!session.mediaStream) {
      console.error('[startRecording] No media stream available');
      return;
    }
    
    // Check if stream tracks are already ended
    const videoTracks = session.mediaStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.error('[startRecording] No video tracks in stream');
      setSession(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'No video tracks found. Please restart the preview.'
      }));
      return;
    }
    
    const hasEndedTracks = videoTracks.some(t => t.readyState === 'ended');
    if (hasEndedTracks) {
      console.error('[startRecording] Video tracks are already ended - stream was stopped', {
        tracks: videoTracks.map(t => ({ id: t.id, readyState: t.readyState, enabled: t.enabled }))
      });
      setSession(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Camera stream was stopped. Please click "Cancel" and try again.'
      }));
      return;
    }

    try {
      // More robust MIME type detection - try simpler formats first
      const getSupportedMimeType = () => {
        // Test each type with the actual stream to ensure compatibility
        const types = [
          'video/webm', // Start with basic WebM
          'video/webm;codecs=vp8',
          'video/webm;codecs=vp8,opus',
          'video/mp4',
          'video/mp4;codecs=h264,aac'
        ];
        
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            // Test if MediaRecorder can actually be created with this type
            try {
              const testRecorder = new MediaRecorder(session.mediaStream, { mimeType: type });
              
              // If we can create it and it's in inactive state, it's probably compatible
              if (testRecorder.state === 'inactive') {
                return type;
              }
            } catch (error) {
              // MediaRecorder creation failed for this type
            }
          }
        }
        
        // No compatible MIME type found, using default
        return 'video/webm';
      };

      const mimeType = getSupportedMimeType();
      
      // Validate stream tracks before recording
      const videoTracks = session.mediaStream.getVideoTracks();
      const audioTracks = session.mediaStream.getAudioTracks();

      // Check if we have any video tracks that are enabled (regardless of readyState)
      const activeVideoTracks = videoTracks.filter(t => t.enabled);
      
      if (videoTracks.length === 0 || activeVideoTracks.length === 0) {
        console.error('No enabled video tracks available for recording');
        setSession(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'No active video stream available for recording'
        }));
        return;
      }

      
      // Validate MediaRecorder support
      if (!MediaRecorder.isTypeSupported(mimeType || 'video/webm')) {
        console.error('MediaRecorder does not support the required MIME type');
        setSession(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'Your browser does not support video recording. Please try a different browser.'
        }));
        return;
      }
      
      // Use the most basic MediaRecorder configuration
      const mediaRecorderOptions: MediaRecorderOptions = {
        mimeType: mimeType || 'video/webm'
      };
      
      const mediaRecorder = new MediaRecorder(session.mediaStream, mediaRecorderOptions);

      if (mediaRecorder.state !== 'inactive') {
        console.error('MediaRecorder not in inactive state:', mediaRecorder.state);
        setSession(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'MediaRecorder initialization failed'
        }));
        return;
      }

      // Reset chunks array for new recording
      recordingChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        // Only push non-empty chunks (same approach as screen recording)
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        // MediaRecorder started successfully
      };
      
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder onerror fired:', event.error || event);
      };
      
      mediaRecorder.onpause = () => {
        // MediaRecorder paused
      };
      
      mediaRecorder.onresume = () => {
        // MediaRecorder resumed
      };

      mediaRecorder.onstop = async () => {
        // Wait a moment to ensure all pending data is received
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Validate that we have chunks before creating blob
        if (recordingChunksRef.current.length === 0) {
          console.error('No recording chunks available! Recording may have been too short or MediaRecorder issue.');
          setSession(prev => ({
            ...prev,
            status: 'error',
            errorMessage: 'Recording failed: No data was recorded. Please record for at least 2-3 seconds and try again.'
          }));
          return;
        }
        
        const blob = new Blob(recordingChunksRef.current, { type: mimeType || 'video/webm' });
        
        if (blob.size === 0) {
          console.error('Recording blob is empty!');
          setSession(prev => ({
            ...prev,
            status: 'error',
            errorMessage: 'Recording failed: No data was recorded. Please try again.'
          }));
          return;
        }
        
        // Additional check for very small blobs (likely corrupted)
        if (blob.size < 1000) {
          console.error('Recording blob is too small (likely corrupted):', blob.size, 'bytes');
          setSession(prev => ({
            ...prev,
            status: 'error',
            errorMessage: 'Recording failed: Recording is too short or corrupted. Please try recording for at least 2 seconds.'
          }));
          return;
        }
        
        if (handleRecordingCompleteRef.current) {
          await handleRecordingCompleteRef.current(blob);
        }
      };

      // Wait for video element to be ready and playing, AND ensure stream is still active
      const waitForVideoReady = () => {
        return new Promise<void>((resolve, reject) => {
          const checkReady = () => {
            if (!videoRef.current) {
              reject(new Error('Video element not available'));
              return;
            }
            
            // Check video element is ready
            if (videoRef.current.readyState >= 2) {
              // Verify stream tracks exist and are not ended
              const videoTracks = session.mediaStream?.getVideoTracks() || [];
              const hasActiveTrack = videoTracks.some(t => t.enabled && t.readyState !== 'ended');
              
              if (!hasActiveTrack || videoTracks.length === 0) {
                reject(new Error('Video stream is not available'));
                return;
              }
              
              // Ensure video is playing
              videoRef.current.play().then(() => {
                resolve();
              }).catch((error) => {
                console.warn('Video play failed, but continuing:', error);
                resolve(); // Continue anyway - stream might still work
              });
            } else {
              setTimeout(checkReady, 100);
            }
          };
          
          checkReady();
        });
      };

      waitForVideoReady().then(() => {
        try {
          const videoTracks = session.mediaStream.getVideoTracks();
          const audioTracks = session.mediaStream.getAudioTracks();
          
          // Note: We already validated the stream in waitForVideoReady()
          // MediaRecorder will handle any issues with the stream itself
          // Just ensure we have at least one video track
          if (videoTracks.length === 0) {
            throw new Error('No video tracks found in stream');
          }
          
          // CRITICAL FIX: Use timeslice parameter (1000ms = 1 second)
          // This ensures data events fire periodically and prevents immediate stopping
          // Without timeslice, some browsers/Electron may stop MediaRecorder immediately
          mediaRecorder.start(1000);
          
          // CRITICAL: Set session status to 'recording' AFTER successfully starting
          // This ensures the mediaStream is preserved in the session
          setSession(prev => ({
            ...prev,
            status: 'recording',
            mediaRecorder,
            recordedChunks: [],
            startTime: Date.now(),
            elapsedSeconds: 0,
          }));

          // Auto-show teleprompter overlay if script exists
          if (teleprompterScript) {
            setShowTeleprompterOverlay(true);
            setTeleprompterIsPlaying(true);
          }
          
          // Verify recording actually started
          setTimeout(() => {
            if (mediaRecorder.state !== 'recording') {
              console.error('MediaRecorder failed to start! State:', mediaRecorder.state);
              setSession(prev => ({
                ...prev,
                status: 'error',
                errorMessage: 'Failed to start recording. The stream may have been stopped.'
              }));
            }
          }, 200);
        } catch (startError) {
          console.error('Error calling mediaRecorder.start():', startError);
          setSession(prev => ({
            ...prev,
            status: 'error',
            errorMessage: startError instanceof Error ? startError.message : 'Failed to start recording. Please try again.'
          }));
        }
      }).catch((error) => {
        console.error('Failed to wait for video ready:', error);
        setSession(prev => ({
          ...prev,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to prepare recording.'
        }));
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setSession(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to start recording. Please try again.'
      }));
    }
  }, [session.mediaStream, teleprompterScript]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (session.mediaRecorder) {
      // Don't call requestData - just stop and let ondataavailable fire naturally
      setSession(prev => ({ ...prev, status: 'saving' }));
      
      // Stop the recorder if it's in any state other than 'inactive' or 'stopped'
      if (session.mediaRecorder.state !== 'inactive') {
        session.mediaRecorder.stop();
      } else {
        setSession(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'Recorder is not active. Please try starting a new recording.'
        }));
      }
    }
  }, [session.mediaRecorder, session.elapsedSeconds]);

  // Handle recording completion and encoding
  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    try {
      setSession(prev => ({ ...prev, status: 'saving' }));

      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();

      // Generate output path
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Webcam_${timestamp}.mp4`;
      const outputPath = `${filename}`; // Remove 'recordings/' prefix - the IPC handler will add it

      // Get video dimensions from stream
      const videoTrack = session.mediaStream?.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const videoDimensions = {
        width: settings?.width || 1280,
        height: settings?.height || 720,
      };

      // Encode recording - pass ArrayBuffer instead of Buffer
      const result: EncodedRecording = await window.electron.webcam.encodeRecording(
        arrayBuffer,
        outputPath,
        blob.type,
        videoDimensions
      );

      // Call completion callback
      onRecordingComplete(result.filePath);

      // Reset session
      setSession({
        status: 'idle',
        recordedChunks: [],
        startTime: 0,
        elapsedSeconds: 0,
      });

      // Close modal
      onClose();
    } catch (error) {
      console.error('Failed to encode recording:', error);
      setSession(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to save recording. Please try again.'
      }));
    }
  }, [session.mediaStream, onRecordingComplete, onClose]);

  // Cleanup on unmount or close
  const cleanup = useCallback(() => {
    if (session.mediaStream) {
      session.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    if (session.mediaRecorder) {
      session.mediaRecorder.stop();
    }
  }, [session.mediaStream, session.mediaRecorder]);

  // Initialize cameras and check permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      // Check both permissions first
      const checkPermissions = async () => {
        await Promise.all([
          checkCameraPermission(),
          checkMicrophonePermission()
        ]);
      };
      
      checkPermissions();
      
      setShowPreview(false);
      setStreamAttached(false);
    } else {
      cleanup();
      setSession({
        status: 'idle',
        recordedChunks: [],
        startTime: 0,
        elapsedSeconds: 0,
      });
      setShowPreview(false);
      setStreamAttached(false);
      setShowPermissionPrompt(false);
    }
  }, [isOpen, checkCameraPermission, checkMicrophonePermission]); // Only depend on isOpen

  // Show permission prompt or load resources based on permission status
  useEffect(() => {
    if (isOpen && !showPreview) {
      // Determine which modal to show based on permissions
      const needsPermission = cameraPermissionStatus !== 'granted' || (audioEnabled && permissionStatus !== 'granted');
      
      if (needsPermission) {
        setShowPermissionPrompt(true);
      } else {
        setShowPermissionPrompt(false);
        // Only load resources if we have permissions
        getAvailableCameras();
        if (audioEnabled) {
          loadAudioDevices();
        }
      }
    }
  }, [isOpen, showPreview, cameraPermissionStatus, permissionStatus, audioEnabled, getAvailableCameras, loadAudioDevices]);

  // Update ref whenever handleRecordingComplete changes
  useEffect(() => {
    handleRecordingCompleteRef.current = handleRecordingComplete;
  }, [handleRecordingComplete]);

  // Cleanup on unmount ONLY (not when session changes)
  useEffect(() => {
    // Return cleanup function that captures current session at unmount time
    return () => {
      if (session.mediaStream) {
        session.mediaStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
        try {
          session.mediaRecorder.stop();
        } catch (e) {
          console.warn('[useEffect cleanup] Error stopping recorder:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  if (!isOpen) return null;

  const statusInfo = getStatusInfo();
  

  // Permission Prompt Modal - Request permissions before showing main modal
  if (showPermissionPrompt) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Permissions Required</h2>
          
          <p style={{ marginBottom: '20px', color: '#666' }}>
            To record webcam, we need access to your camera{audioEnabled ? ' and microphone' : ''}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {cameraPermissionStatus !== 'granted' && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: cameraPermissionStatus === 'denied' ? '#ffe6e6' : '#e6f3ff', 
                borderRadius: '8px',
                border: `1px solid ${cameraPermissionStatus === 'denied' ? '#ff9999' : '#99ccff'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong>Camera Access</strong>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: cameraPermissionStatus === 'denied' ? '#ff6666' : '#0066cc',
                    color: 'white'
                  }}>
                    {cameraPermissionStatus}
                  </span>
                </div>
                {cameraPermissionStatus === 'prompt' && (
                  <button 
                    onClick={requestCameraPermission}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Grant Camera Permission
                  </button>
                )}
                {cameraPermissionStatus === 'denied' && (
                  <p style={{ fontSize: '12px', color: '#cc0000', margin: 0 }}>
                    Please allow camera access in your browser settings to continue.
                  </p>
                )}
              </div>
            )}

            {audioEnabled && permissionStatus !== 'granted' && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: permissionStatus === 'denied' ? '#ffe6e6' : '#e6f3ff', 
                borderRadius: '8px',
                border: `1px solid ${permissionStatus === 'denied' ? '#ff9999' : '#99ccff'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong>Microphone Access</strong>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: permissionStatus === 'denied' ? '#ff6666' : '#0066cc',
                    color: 'white'
                  }}>
                    {permissionStatus}
                  </span>
                </div>
                {permissionStatus === 'prompt' && (
                  <button 
                    onClick={requestMicrophonePermission}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Grant Microphone Permission
                  </button>
                )}
                {permissionStatus === 'denied' && (
                  <p style={{ fontSize: '12px', color: '#cc0000', margin: 0 }}>
                    Please allow microphone access in your browser settings to continue.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="modal-buttons">
            <button
              onClick={onClose}
              className="button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview Modal - Full screen with video preview
  if (showPreview) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Record Webcam</h2>

          {/* Video Preview */}
          <div className="mb-3">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  // Video metadata loaded
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                }}
              />
              {!streamAttached && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Loading camera...</p>
                  </div>
                </div>
              )}
              {session.status === 'recording' && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  REC
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          {session.status === 'recording' && (
            <div className="text-center mb-3">
              <div className="text-2xl font-mono font-bold text-white">
                {formatTime(session.elapsedSeconds)}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="modal-buttons">
            {session.status !== 'recording' && (
              <>
                <button
                  onClick={() => setShowTeleprompterModal(true)}
                  className="button-secondary"
                  style={{ marginRight: 'auto' }}
                >
                  {teleprompterScript ? 'Edit Script' : 'Generate Script'}
                </button>
                <button
                  onClick={startRecording}
                  className="button-primary"
                >
                  Start Recording
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    cleanup();
                  }}
                  className="button-secondary"
                >
                  Cancel
                </button>
              </>
            )}

            {session.status === 'recording' && (
              <>
                {teleprompterScript && (
                  <button
                    onClick={() => setShowTeleprompterOverlay(!showTeleprompterOverlay)}
                    className="button-secondary"
                    style={{ marginRight: 'auto' }}
                  >
                    {showTeleprompterOverlay ? 'Hide Teleprompter' : 'Show Teleprompter'}
                  </button>
                )}
                {session.elapsedSeconds < 1 && (
                  <p style={{ color: '#ffaa00', fontSize: '12px', marginBottom: '8px' }}>
                    Record for at least 1 second
                  </p>
                )}
                <button
                  onClick={stopRecording}
                  className="button-primary"
                  disabled={session.elapsedSeconds < 1}
                  style={{ opacity: session.elapsedSeconds < 1 ? 0.5 : 1 }}
                >
                  Stop Recording
                </button>
              </>
            )}
          </div>

          {/* Teleprompter Overlay */}
          {session.status === 'recording' && teleprompterScript && showTeleprompterOverlay && (
            <ScriptDisplay
              script={teleprompterScript.content}
              isPlaying={teleprompterIsPlaying}
              scrollSpeed={teleprompterScrollSpeed}
              fontSize={teleprompterFontSize}
              onPlayPause={() => setTeleprompterIsPlaying(!teleprompterIsPlaying)}
              onSpeedChange={(speed) => setTeleprompterScrollSpeed(speed)}
              onReset={() => {
                // Reset handled internally by ScriptDisplay
              }}
              onClose={() => setShowTeleprompterOverlay(false)}
            />
          )}
        </div>

        {/* Teleprompter Modal */}
        <TeleprompterModal
          isOpen={showTeleprompterModal}
          onClose={() => setShowTeleprompterModal(false)}
          onScriptAccepted={(script) => {
            setTeleprompterScript(script);
            setShowTeleprompterModal(false);
            // Auto-show overlay when recording starts if script exists
            if (session.status === 'recording') {
              setShowTeleprompterOverlay(true);
            }
          }}
          existingScript={teleprompterScript}
        />
      </div>
    );
  }

  // Selection Modal - Camera and audio selection
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Record Webcam</h2>

        {/* Camera Selection - Radio Card List */}
        {availableCameras.length > 0 && (
          <div className="screen-list">
            {availableCameras.map((camera) => (
              <label key={camera.deviceId} className="screen-option">
                <input
                  type="radio"
                  name="camera"
                  value={camera.deviceId}
                  checked={selectedCameraId === camera.deviceId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                />
                <div className="screen-thumbnail-container">
                  <div className="screen-thumbnail-placeholder">
                    <div className="screen-icon">📹</div>
                    <div className="screen-label">Camera</div>
                  </div>
                </div>
                <div className="screen-info">
                  <div className="screen-name">{camera.label}</div>
                  <div className="screen-resolution" style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    ID: {camera.deviceId.slice(0, 8)}...
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Status Pill and Helper Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
          <span style={{ 
            backgroundColor: statusInfo.color, 
            color: '#ffffff', 
            padding: '4px 12px', 
            borderRadius: '12px', 
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {statusInfo.text}
          </span>
          <span style={{ color: '#999999' }}>Click "Start Preview" to begin</span>
        </div>

        {/* Audio Settings */}
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

          {audioEnabled && permissionStatus === 'denied' && (
            <div className="audio-permission-error">
              <p style={{ color: '#ff6666', fontSize: '12px', margin: '8px 0' }}>
                Microphone permission denied. Please allow microphone access in your browser settings.
              </p>
            </div>
          )}
          
          {audioEnabled && permissionStatus === 'prompt' && (
            <button className="button-secondary" onClick={requestMicrophonePermission}>
              Request Microphone Permission
            </button>
          )}
        </div>

        {/* Error Message */}
        {session.status === 'error' && session.errorMessage && (
          <div className="modal-error">
            <p>{session.errorMessage}</p>
          </div>
        )}

        {/* Loading State */}
        {session.status === 'saving' && (
          <div className="modal-loading">
            <p>Saving recording...</p>
          </div>
        )}

        {/* Controls */}
        <div className="modal-buttons">
          {session.status === 'idle' && (
            <button
              onClick={requestMediaAccess}
              className="button-primary"
              disabled={!selectedCameraId}
            >
              Start Preview
            </button>
          )}

          {session.status === 'error' && (
            <>
              <button
                onClick={requestMediaAccess}
                className="button-primary"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="button-secondary"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcamRecordingModal;
