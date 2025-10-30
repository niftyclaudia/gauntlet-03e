# PR-13 TODO — Picture-in-Picture Recording

**Branch**: `feat/pr-13-pip-recording`  
**Source PRD**: `docs/prds/pr-13-prd.md`  
**Owner (Agent)**: Pete

---

## 0. Clarifying Questions & Assumptions

- Questions: [unanswered items from PRD]
- Assumptions (confirm in PR if needed):
  - Screen recording (PR-11) and webcam recording (PR-12) are complete and functional
  - FFmpeg overlay composition is feasible with current setup
  - DesktopCapturer API works reliably for screen selection
  - Permission management system can be centralized across all recording features
  - Device selection and refresh functionality is achievable with existing Electron APIs

---

## 1. Setup

- [ ] Create branch `feat/pr-13-pip-recording` from develop
- [ ] Read PRD thoroughly
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context
- [ ] Review existing screen recording (PR-11) and webcam recording (PR-12) implementations
- [ ] Confirm environment and Electron dev server work

---

## 2. Service Layer

Implement deterministic Electron IPC handlers from PRD Section 9.

- [x] Implement `get-screens` IPC handler in main process
  - Test Gate: Handler returns list of available screens with thumbnails
- [x] Implement `check-camera-available` IPC handler in main process
  - Test Gate: Handler correctly detects camera availability and permission status
- [x] Implement `get-pip-settings` IPC handler in main process
  - Test Gate: Handler returns saved settings or defaults
- [x] Implement `start-pip-recording` IPC handler in main process
  - Test Gate: Handler initiates both screen and webcam recording simultaneously
- [x] Implement `stop-pip-recording` IPC handler in main process
  - Test Gate: Handler stops both streams and returns temp file paths
- [x] Implement `composite-pip-videos` IPC handler in main process
  - Test Gate: Handler creates composite video using FFmpeg overlay filter
- [x] Implement `save-pip-settings` IPC handler in main process
  - Test Gate: Handler persists settings to session.json
- [x] Implement `get-media-devices` IPC handler in main process
  - Test Gate: Handler returns available cameras and microphones with labels
- [x] Implement `check-permissions` IPC handler in main process
  - Test Gate: Handler returns permission status for screen, camera, and microphone
- [x] Implement `refresh-devices` IPC handler in main process
  - Test Gate: Handler refreshes device list and returns updated devices
- [x] Add validation logic for all handlers
  - Test Gate: Edge cases handled correctly, proper error messages returned

---

## 3. Data Model & File Operations

- [ ] Define `PiPRecordingSettings` interface in TypeScript
  - Test Gate: Interface includes screenId, webcamPosition, webcamSize, webcamShape, audioMode, selectedCameraId, selectedMicrophoneId
- [ ] Define `PiPRecordingSession` interface in TypeScript
  - Test Gate: Interface includes id, startTime, file paths, settings, status
- [ ] Define `PiPRecordedClip` interface extending existing Clip
  - Test Gate: Interface includes recordedAt timestamp and isPiPRecording flag
- [ ] Define `MediaDevice` interface in TypeScript
  - Test Gate: Interface includes deviceId, label, kind, isDefault
- [ ] Define `PermissionStatus` interface in TypeScript
  - Test Gate: Interface includes granted, denied, reason fields
- [ ] Define `PiPSessionState` interface in TypeScript
  - Test Gate: Interface includes all persisted settings for restoration
- [ ] Update project state schema to include PiP settings
  - Test Gate: Settings persist to session.json and restore on app restart
- [ ] Add validation rules for PiP settings
  - Test Gate: Invalid settings rejected with clear error messages

---

## 4. UI Components

Create/modify React components per PRD Section 10.

- [ ] Create `PiPRecordingModal.tsx` component
  - Test Gate: Modal renders with all states (screen selection, settings, recording, compositing, error)
- [ ] Create `PiPSettings.tsx` component
  - Test Gate: Settings panel renders with position, size, shape, and audio mode controls
- [ ] Create `RecordingIndicator.tsx` component
  - Test Gate: Recording indicator shows red pulsing dot and timer
- [ ] Create `DeviceSelector.tsx` component
  - Test Gate: Component renders camera and microphone dropdowns with refresh capability
- [ ] Create `PermissionModal.tsx` component
  - Test Gate: Centralized permission error handling modal with retry functionality
- [ ] Create `PermissionStatusIndicator.tsx` component
  - Test Gate: Color-coded permission status badges (✓ Granted, ✗ Denied, ○ Not Requested)
- [ ] Create `useMediaPermissions.ts` hook
  - Test Gate: Hook manages camera/microphone permissions and device enumeration
- [ ] Create `usePermissionGate.ts` hook
  - Test Gate: Hook prevents rendering during permission modals
- [ ] Create `PermissionContext.tsx` context
  - Test Gate: Global permission state management across all recording features
- [ ] Wire up state management for PiP recording session
  - Test Gate: Recording state updates correctly, UI reflects current status
- [ ] Add live preview functionality to settings panel
  - Test Gate: Webcam overlay updates position/size/shape in real-time
- [ ] Add loading/error/empty states to all components
  - Test Gate: All states render correctly with appropriate messages

---

## 5. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

- [ ] Electron IPC integration for screen capture
  - Test Gate: Screen selection works, desktopCapturer API functional
- [ ] Electron IPC integration for webcam capture
  - Test Gate: Webcam access works, getUserMedia API functional
- [ ] FFmpeg overlay composition pipeline
  - Test Gate: FFmpeg creates composite video with correct positioning and shape support
- [ ] Audio mixing and synchronization
  - Test Gate: Audio sources mixed correctly, sync drift <50ms
- [ ] Proactive permission checking system
  - Test Gate: Permissions validated before attempting media access
- [ ] Device selection and refresh functionality
  - Test Gate: Users can select and refresh camera/microphone devices
- [ ] Auto-save functionality for PiP settings
  - Test Gate: Settings persist across app restarts
- [ ] File system operations for temp files
  - Test Gate: Temp files created, cleaned up properly
- [ ] Library integration for composite videos
  - Test Gate: Composite videos appear in Library with correct metadata

---

## 6. Manual Testing

Follow manual testing protocol from PRD Section 12.

- [ ] Happy Path Testing
  - Test Gate: Basic PiP recording, custom settings, multiple recordings all work
- [ ] Edge Case Testing
  - Test Gate: Webcam disconnect, long recording (5 min), permission denied scenarios handled
- [ ] Error Handling Testing
  - Test Gate: Camera in use, no camera connected, compositing failure scenarios handled
- [ ] Performance Testing
  - Test Gate: Recording at 30fps, audio/video sync <50ms, memory stability verified
- [ ] Device Selection Testing
  - Test Gate: Multiple cameras/microphones, device refresh, smart defaults work
- [ ] Permission Management Testing
  - Test Gate: Permission status indicators, recovery flows, modal interactions work
- [ ] Cross-platform testing
  - Test Gate: Works on macOS (primary) and Windows (secondary)
- [ ] Definition of done checklist
  - Test Gate: All items from PRD Section 13 verified

---

## 7. Performance

Verify targets from PRD Section 4 and 18.

- [ ] App load time < 5 seconds
  - Test Gate: Cold start to interactive UI measured
- [ ] Recording performance maintained
  - Test Gate: 30fps recording without frame drops, <50% CPU usage
- [ ] Compositing performance
  - Test Gate: 30-second video composites in <10 seconds, 5-minute video in <30 seconds
- [ ] Memory usage < 1GB with PiP recording
  - Test Gate: Memory monitored during testing, <200MB additional overhead
- [ ] Audio/video sync maintained
  - Test Gate: Sync drift <50ms over 5-minute recording
- [ ] UI responsiveness during compositing
  - Test Gate: App remains responsive during background processing

---

## 8. Acceptance Gates

Check every gate from PRD Section 12:
- [ ] All happy path gates pass
- [ ] All edge case gates pass
- [ ] All error handling gates pass
- [ ] All performance gates pass
- [ ] All device selection gates pass
- [ ] All permission management gates pass

---

## 9. Documentation & PR

- [ ] Add inline code comments for complex logic
- [ ] Update README if needed
- [ ] Create PR description (use format from agents/cody-agent-template.md)
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Electron IPC handlers implemented in main process
- [ ] React components implemented with state management
- [ ] Enhanced error handling and permission management working
- [ ] Device selection and refresh functionality working
- [ ] FFmpeg overlay composition working (position, size, shape support)
- [ ] Manual testing complete with real video files
- [ ] Performance targets met (see PRD Section 4)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] Documentation updated
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- Leverage existing screen recording and webcam recording implementations
- Focus on FFmpeg overlay composition for positioning calculations
- Implement centralized permission management system for reusability
- Test device selection and refresh functionality thoroughly
- Ensure enhanced error handling provides clear user guidance
- Pay attention to webcam shape support (rectangle vs circle) in FFmpeg composition
