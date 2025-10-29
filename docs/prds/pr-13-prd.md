# PRD: Picture-in-Picture Recording

**Feature**: Picture-in-Picture Recording

**Version**: 1.0

**Status**: Ready for Development

**Agent**: Pete

**Target Release**: Sprint 13

**Links**: [PR Brief], [TODO], [Designs], [Tracking Issue]

---

## 1. Summary

Picture-in-Picture Recording enables educators and presenters to simultaneously record their screen and webcam, compositing the webcam as a configurable overlay (corner position, size adjustments) on top of the screen recording. Both audio sources are captured and mixed. The final composite video is created via FFmpeg post-processing with clear visual feedback ("Creating composite video...") to prevent user confusion during the composition phase.

**Key Outcome**: User records screen + webcam in one action → gets single composite MP4 with both layers visible → playable immediately in Library.

---

## 2. Problem & Goals

- **What video editing problem are we solving?** Content creators and educators need to record both their screen activity and their face simultaneously for tutorials, presentations, and educational content. Currently they must use separate tools or complex setups.
- **Why now?** Screen recording (PR-11) and webcam recording (PR-12) are complete, providing the foundation for simultaneous capture. PiP recording is the natural next step to combine both capabilities.
- **Goals (ordered, measurable):**
  - [ ] G1 — Enable simultaneous screen + webcam recording with configurable overlay positioning
  - [ ] G2 — Achieve <100ms audio/video sync drift and 30fps+ recording performance
  - [ ] G3 — Provide intuitive settings configuration with live preview

---

## 3. Non-Goals / Out of Scope

**Intentionally Excluded:**
- ❌ **Real-time compositing during capture**: Separate recordings → FFmpeg composite on save (simpler, less CPU contention)
- ❌ **Webcam border styling**: No rounded corners, shadows, or custom borders in MVP
- ❌ **Separate audio tracks**: Both mics mixed into single stereo track (advanced routing post-MVP)
- ❌ **Pause/resume during PiP recording**: Record or stop (MVP only supports stop)
- ❌ **Custom aspect ratio for composite**: Uses screen resolution with webcam overlay (no canvas resizing)
- ❌ **Blur/background removal**: Webcam captured as-is without filters

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- **User-visible**: Record PiP video in <60 seconds from click to Library import
- **System**: [See performance requirements in prd-v1.md]
  - Recording at native screen resolution without frame drops (30fps)
  - Audio/video sync drift <100ms
  - Composite creation <30 seconds for 5-minute recording
- **Quality**: [0 blocking bugs, all gates pass, crash-free >99%]

---

## 5. Users & Stories

- As a **content creator**, I want to record both my screen and face simultaneously so that I can create engaging tutorial videos without external tools.
- As a **educator**, I want to show my screen while explaining concepts so that students can see both the content and my reactions.
- As a **presenter**, I want to record presentations with my face visible so that the content feels more personal and engaging.

---

## 6. Experience Specification (UX)

### Entry Points and Flows
1. **Toolbar Button**: "Record Screen + Webcam (PiP)" button in main toolbar
2. **Recording Menu**: Dropdown with recording options including PiP

### Happy Path Flow
```
User clicks "Record Screen + Webcam (PiP)"
  ↓
[Screen Selection] - Choose which monitor/window to record
  ↓
[Permission Check] - Camera + microphone permissions
  ↓
[Settings Modal] - Configure webcam position, size, audio mode
  ↓
[Live Preview] - See exact layout before recording
  ↓
[Start Recording] - Both streams capture simultaneously
  ↓
[Recording Active] - Red dot + timer, stop button
  ↓
[Stop Recording] - Both streams stop
  ↓
[Compositing] - "Creating composite video..." with spinner
  ↓
[Auto-Import] - Composite video appears in Library
```

### Visual Behavior
- **Live preview shows screen thumbnail with webcam overlay**: Real-time preview of PiP layout during settings configuration
- **Position controls**: TL, TR, BL, BR radio buttons with instant preview updates
- **Size controls**: Small (20%), Medium (30%), Large (40%) with live scaling
- **Recording indicator**: Red pulsing dot + timer (MM:SS) within modal
- **Compositing feedback**: Spinner with progress message "Creating composite video..."
- **Permission status indicators**: Color-coded badges (🟢 Granted, 🔴 Denied, 🟡 Not Requested)
- **Device selection UI**: Dropdowns for camera and microphone with refresh capability
- **Error states**: Clear error messages with retry/cancel options
- **Loading states**: Spinners and progress indicators for all async operations

### States
| State | Appearance | Actions | Notes |
|-------|-----------|---------|-------|
| **Screen Selection** | List of screens with thumbnails, device selectors, permission status | Select screen, configure audio, select devices | Permission checks, device validation |
| **Settings** | Live preview with overlay controls, position/size/audio options | Adjust position/size, start recording | Real-time preview updates, settings persistence |
| **Recording** | Recording indicator (red dot + timer), stop button, static preview | Stop recording only | Both streams active, modal remains open |
| **Compositing** | Spinner + "Creating composite..." message | Wait for completion | Background processing, app responsive |
| **Success** | Modal closes, video in Library | Play video | Auto-imported with thumbnail |
| **Error** | Error icon + message, retry/cancel buttons | Retry operation or cancel | Context-specific error messages |
| **Permission Modal** | Permission request with recovery instructions | Grant permission or cancel | Higher z-index, blocks other modals |

---

## 7. Functional Requirements (Must/Should)

### MUST (Core PiP Functionality)

**REQ-1: Recording Initialization**
- User clicks "Record Screen + Webcam (PiP)" button
- System displays available screens/windows (via `desktopCapturer` API)
- User selects screen to record
- System requests camera + microphone permissions (if not already granted)
- Both permissions granted → "Start Recording" button enabled
- Missing permission → Error message with recovery option

**REQ-2: PiP Settings Configuration (Live Preview)**
- Webcam live preview appears in modal overlay (at selected corner by default: BL)
- User adjusts position: TL, TR, BL, BR (radio buttons)
- Live preview updates immediately when position changes
- User selects size: Small (20%), Medium (30%), Large (40%)
- Live preview scaled instantly when size changes
- Audio mode selector: "Both" (mixed), "Screen only", "Webcam only" (default: Both)
- Settings persisted to session state (restored on next PiP recording)

**REQ-3: Simultaneous Capture (Separate Recordings)**
- Click "Start Recording" → screen stream captured to temp file (via `desktopCapturer`)
- Simultaneously → webcam stream captured to separate temp file (via `getUserMedia`)
- Both recording independently with minimal latency (<100ms drift acceptable)
- Recording indicator shows: Red pulsing dot + timer counting up
- Timer accurate to 1 second (no drift over 5min recording)

**REQ-4: Audio Capture & Mixing**
- Microphone audio captured during recording (from webcam `getUserMedia` stream)
- System audio captured during screen recording (optional, via Web Audio API or OS-level audio capture)
- Audio mode selected pre-recording determines which source is mixed into composite:
  - "Both": Mix microphone + system audio at equal levels (or -3dB each to prevent clipping)
  - "Screen only": Discard microphone, use only screen audio
  - "Webcam only": Use only microphone, discard system audio
- Audio synchronized with video (within 50ms sync drift tolerance)

**REQ-5: Stop Recording & Post-Processing**
- User clicks "Stop" button → both streams stop immediately
- System shows modal: "Creating composite video..." with spinner
- Background thread (IPC invoke) starts FFmpeg composite:
  ```
  ffmpeg -i screen.mp4 -i webcam.mp4 \
    -filter_complex "[1:v]scale=192:108[webcam];[0:v][webcam]overlay=x=...:y=..." \
    -c:v libx264 -c:a aac \
    composite.mp4
  ```
  Where `x:y` computed from position (TL/TR/BL/BR) and size (20%/30%/40%)
- During compositing:
  - Modal remains visible with spinner (user sees "working" state)
  - App is **responsive** (main thread not blocked)
  - Compositing can take 5-30 seconds depending on video length (user warned of this)

**REQ-6: Composite Video Output & Library Integration**
- Composite video saved to temp location: `app.getPath('temp')/pip-recording-[timestamp].mp4`
- Video added to Library with:
  - Thumbnail (first frame of composite)
  - Filename: `PiP_Recording_[timestamp]` (user can rename)
  - Duration displayed correctly
  - Playable immediately in preview player
- Session state updated with library entry

**REQ-7: Failure Handling (Graceful Degradation)**
- **If screen capture fails during recording**: Stop, show error "Screen capture lost. Retry."
- **If webcam fails during recording**: Continue recording screen only, save as screen-only MP4, show message: "Webcam disconnected during recording. Saved as screen recording only."
- **If compositing fails**: Show error "Unable to create composite. Try again." with option to:
  - Discard both files and retry
  - Save screen recording only (if available)
- **File cleanup**: Delete temp files on error (no orphaned recordings)

**REQ-7a: Enhanced Error Handling**
- **Proactive permission checking**: Validate permissions before attempting media access
- **Device selection & management**: Support multiple cameras/microphones with smart defaults
- **Graceful degradation**: Continue with available sources when one fails
- **Clear error messaging**: Context-specific error messages with recovery instructions

**REQ-8: Prevent App Quit During Recording**
- User clicks app close button or uses Cmd+Q
- If recording active: Dialog appears "Recording in progress. Quit anyway?"
- User can cancel (recording continues) or confirm quit (recording stops, videos discarded or saved)

### SHOULD (Nice-to-Have Enhancements)

**REQ-9: Recording Keyboard Shortcut** (Post-MVP)
- Spacebar to toggle pause (currently not supported, record-or-stop only)
- Esc to stop recording

**REQ-10: Adjustable Webcam Opacity** (Post-MVP)
- Slider: 0-100% opacity on webcam overlay
- Useful for seeing screen content behind webcam

**REQ-11: Webcam Border Options** (Post-MVP)
- Rounded corners (0-20px)
- Drop shadow (soft, subtle)
- Border color/width

### Acceptance Gates

| Scenario | Input | Expected Output | Pass Criteria |
|----------|-------|-----------------|---------------|
| **Happy Path 1: Basic PiP Recording** | Click PiP → Select screen → Grant permissions → Record 10 sec → Stop | Composite video in Library with both layers | No errors, file plays, both layers visible |
| **Happy Path 2: Custom Settings** | Change position to TR, size to Small, record 5 sec | Webcam overlay in top-right, small size | Position/size applied correctly |
| **Edge Case 1: Webcam Disconnect** | Start recording → Unplug webcam mid-recording | Screen-only recording saved with message | Graceful fallback, no crash |
| **Edge Case 2: Long Recording** | Record 5 minutes | Composite completes in <30 seconds | No memory leaks, sync maintained |
| **Error Case 1: Permission Denied** | Deny camera permission | Error message with recovery instructions | Clear error, retry works |
| **Error Case 2: Camera In Use** | Open Facetime → Try PiP recording | "Camera in use" error with retry | Clear guidance, retry succeeds |

---

## 8. Data Model

### New Interfaces

```typescript
// Recording settings chosen by user
interface PiPRecordingSettings {
  screenId: string;              // Selected monitor/window ID from desktopCapturer
  webcamPosition: 'TL' | 'TR' | 'BL' | 'BR';  // Top-Left, Top-Right, Bottom-Left, Bottom-Right
  webcamSize: 'small' | 'medium' | 'large';   // 20%, 30%, 40% of screen width
  webcamShape: 'rectangle' | 'circle';        // Shape of webcam overlay (enhanced feature)
  audioMode: 'both' | 'screen-only' | 'webcam-only';  // Which audio source(s) to include
  selectedCameraId?: string;     // Selected camera device ID
  selectedMicrophoneId?: string; // Selected microphone device ID
}

// Recording session in progress
interface PiPRecordingSession {
  id: string;                    // Unique recording ID
  startTime: number;             // Timestamp (ms)
  screenFilePath: string;        // Temp file path for screen recording
  webcamFilePath: string;        // Temp file path for webcam recording
  settings: PiPRecordingSettings;
  status: 'recording' | 'stopping' | 'compositing' | 'done' | 'error';
  errorMessage?: string;
}

// Final recorded clip (same as regular Clip, but tagged as PiP)
interface PiPRecordedClip extends Clip {
  recordedAt: number;            // Timestamp
  isPiPRecording: boolean;       // Flag for UI purposes
}

// Device information for selection
interface MediaDevice {
  deviceId: string;              // Unique device identifier
  label: string;                 // Human-readable device name
  kind: 'audioinput' | 'videoinput'; // Device type
  isDefault: boolean;            // Whether this is the system default
}

// Permission status for UI indicators
interface PermissionStatus {
  granted: boolean;              // Whether permission is granted
  denied: boolean;               // Whether permission is explicitly denied
  reason?: string;               // Reason if not available (e.g., "Camera in use")
}

// Enhanced session state for PiP settings
interface PiPSessionState {
  lastPosition: 'TL' | 'TR' | 'BL' | 'BR';
  lastSize: 'small' | 'medium' | 'large';
  lastShape: 'rectangle' | 'circle';
  lastAudioMode: 'both' | 'screen-only' | 'webcam-only';
  lastCameraId?: string;
  lastMicrophoneId?: string;
}
```

### Session State

```typescript
// In session.json (restored on app relaunch)
{
  "pipSettings": {
    "lastPosition": "BL",
    "lastSize": "medium",
    "lastShape": "rectangle",
    "lastAudioMode": "both",
    "lastCameraId": "default",
    "lastMicrophoneId": "default"
  }
}
```

### Storage
- Temp recording files: `app.getPath('temp')/pip-recording-[timestamp].mp4`
- Session state: `app.getPath('userData')/session.json` (existing)
- No permanent storage (clips deleted when app closes unless user explicitly imports to project)

---

## 9. API / Service Contracts

All APIs are invoked via `ipcRenderer.invoke()` from React (Electron context isolation).

### `get-screens`
Get list of available screens/windows for recording.

```typescript
ipcRenderer.invoke('get-screens')
  → Promise<Array<{id: string; name: string; isPrimary: boolean}>>
```

**Pre-condition**: desktopCapturer API available (Electron renderer context)
**Post-condition**: Returns screen list (or error if no screens)
**Error**: Rejects if permission denied or no screens found

---

### `check-camera-available`
Check if webcam is accessible and permission granted.

```typescript
ipcRenderer.invoke('check-camera-available')
  → Promise<{available: boolean; reason?: string}>
```

**Pre-condition**: None
**Post-condition**: Returns availability status
**Error**: Returns `{available: false, reason: "Permission denied"}` or `{available: false, reason: "Camera in use"}`

---

### `get-pip-settings`
Retrieve last used PiP settings from session state.

```typescript
ipcRenderer.invoke('get-pip-settings')
  → Promise<PiPRecordingSettings>
```

**Pre-condition**: None
**Post-condition**: Returns default or previously saved settings
**Error**: Returns defaults if no prior session

---

### `start-pip-recording`
Initiate screen + webcam simultaneous recording.

```typescript
ipcRenderer.invoke('start-pip-recording', {
  screenId: string,
  settings: PiPRecordingSettings
})
  → Promise<{recordingId: string; status: 'recording'}>
```

**Pre-condition**:
- screenId valid (from `get-screens`)
- Camera available (from `check-camera-available`)
- Permissions granted

**Post-condition**:
- Screen and webcam streams recording to separate temp files
- Recording ID returned for later reference

**Errors**:
- `"Screen capture initialization failed"` — desktopCapturer error
- `"Webcam initialization failed"` — getUserMedia error
- `"Insufficient disk space"` — temp directory full

---

### `stop-pip-recording`
Stop active recording and return temp file paths.

```typescript
ipcRenderer.invoke('stop-pip-recording', {recordingId: string})
  → Promise<{screenFile: string; webcamFile: string; duration: number}>
```

**Pre-condition**: Recording active (from prior `start-pip-recording`)
**Post-condition**: Both streams stopped, temp files finalized
**Error**: `"No active recording"` if not recording

---

### `composite-pip-videos`
Merge screen + webcam recordings into single composite MP4.

```typescript
ipcRenderer.invoke('composite-pip-videos', {
  screenFile: string;
  webcamFile: string;
  settings: PiPRecordingSettings;
  outputPath: string;
})
  → Promise<{compositeFile: string; duration: number}>
```

**Pre-condition**:
- Both temp files exist and are valid MP4s
- Settings specify valid overlay position/size

**Post-condition**:
- Composite MP4 created at outputPath
- Temp files available for cleanup

**Error**:
- `"FFmpeg composition failed"` — invalid inputs or FFmpeg error
- `"Output path not writable"` — disk/permissions issue

**Note**: This handler is invoked from main process (not user-triggered); IPC used for progress updates.

---

### `save-pip-settings`
Persist user's PiP settings to session.json for next use.

```typescript
ipcRenderer.invoke('save-pip-settings', settings: PiPRecordingSettings)
  → Promise<{success: boolean}>
```

**Pre-condition**: Settings object valid
**Post-condition**: Settings saved to session.json
**Error**: `"Failed to save settings"` if file I/O fails

---

### `get-media-devices`
Get list of available camera and microphone devices.

```typescript
ipcRenderer.invoke('get-media-devices')
  → Promise<{cameras: MediaDevice[]; microphones: MediaDevice[]}>
```

**Pre-condition**: None
**Post-condition**: Returns available devices with labels and default status
**Error**: Returns empty arrays if no devices found

---

### `check-permissions`
Check current permission status for screen recording, camera, and microphone.

```typescript
ipcRenderer.invoke('check-permissions')
  → Promise<{
    screenRecording: PermissionStatus;
    camera: PermissionStatus;
    microphone: PermissionStatus;
  }>
```

**Pre-condition**: None
**Post-condition**: Returns permission status for all required permissions
**Error**: Returns denied status if unable to check

---

### `refresh-devices`
Refresh the list of available media devices.

```typescript
ipcRenderer.invoke('refresh-devices')
  → Promise<{cameras: MediaDevice[]; microphones: MediaDevice[]}>
```

**Pre-condition**: None
**Post-condition**: Returns updated device list
**Error**: Returns previous device list if refresh fails

---

## 10. UI Components to Create/Modify

### New Components

- `src/components/PiPRecordingModal.tsx` — Main modal for PiP recording workflow (settings → recording → compositing)
- `src/components/PiPSettings.tsx` — Configuration panel (position, size, shape, audio mode)
- `src/components/RecordingIndicator.tsx` — Visual recording status (red dot + timer)
- `src/components/DeviceSelector.tsx` — Camera and microphone device selection dropdowns
- `src/components/PermissionModal.tsx` — Centralized permission error handling modal
- `src/components/PermissionStatusIndicator.tsx` — Color-coded permission status badges
- `src/hooks/useMediaPermissions.ts` — Consolidated camera/microphone permission management
- `src/hooks/usePermissionGate.ts` — Hook to prevent rendering during permission modals
- `src/context/PermissionContext.tsx` — Global permission state management
- `src/main/ipc-handlers/pip.ts` — Electron IPC handlers for PiP operations

### Modified Components

- `src/components/MainLayout.tsx` — Add PiP recording button to toolbar
- `src/components/Library.tsx` — Display PiP recordings with visual indicator
- `src/main/main.ts` — Register PiP IPC handlers on app startup

---

## 11. Integration Points

- **Electron IPC integration**: Screen capture via `desktopCapturer`, webcam via `getUserMedia`
- **Local file system**: Recording storage in temp directory, session persistence
- **State management**: React Context for PiP settings, existing Library state for clips
- **FFmpeg integration**: Overlay composition with position/size calculations
- **Cross-platform compatibility**: macOS primary, Windows secondary support

---

## 12. Test Plan & Acceptance Gates

### Happy Path Tests

- [ ] **Test 1: Basic PiP Recording**
  - Click "Record Screen + Webcam (PiP)" → Select screen → Grant permissions → Record 10 seconds → Stop
  - **Gate**: Composite video appears in Library with both layers visible, audio synced

- [ ] **Test 2: Custom Settings**
  - Change position to TR, size to Small, record 5 seconds
  - **Gate**: Webcam overlay in top-right corner, small size, playable

- [ ] **Test 3: Multiple Recordings**
  - Record PiP video #1 → Record PiP video #2
  - **Gate**: Both clips exist, distinct filenames, both playable

### Edge Case Tests

- [ ] **Test 4: Webcam Disconnect During Recording**
  - Start recording → Unplug webcam → Continue recording → Stop
  - **Gate**: Screen-only recording saved with clear message

- [ ] **Test 5: Long Recording (5 minutes)**
  - Record for 5 minutes continuously
  - **Gate**: Composite completes in <30 seconds, no memory leaks, sync maintained

- [ ] **Test 6: Permission Denied, Then Granted**
  - Deny camera permission → Retry → Grant permission → Record
  - **Gate**: Retry flow works cleanly

### Error Handling Tests

- [ ] **Test 7: Camera In Use**
  - Open Facetime → Try PiP recording → Close Facetime → Retry
  - **Gate**: Clear error message, retry succeeds

- [ ] **Test 8: No Camera Connected**
  - Disconnect cameras → Click PiP recording
  - **Gate**: Error: "No camera found"

- [ ] **Test 9: Compositing Failure**
  - Mock FFmpeg failure → Show error with retry options
  - **Gate**: Clear error message, user can retry or save screen-only

### Performance Tests

- [ ] **Test 10: Recording Performance**
  - Record at native resolution
  - **Gate**: No frame drops, 30fps maintained

- [ ] **Test 11: Audio/Video Sync**
  - Record with clock + background music
  - **Gate**: Audio sync within 100ms

- [ ] **Test 12: Memory Stability**
  - Record for 5 minutes
  - **Gate**: Memory growth <200MB, stable during compositing

---

## 13. Definition of Done

- [ ] `PiPRecordingModal.tsx` implemented with all states (settings, recording, compositing, error)
- [ ] `PiPSettings.tsx` with position/size/shape controls and live preview
- [ ] `DeviceSelector.tsx` for camera and microphone selection
- [ ] `PermissionModal.tsx` for centralized permission error handling
- [ ] `PermissionStatusIndicator.tsx` for visual permission status
- [ ] `useMediaPermissions.ts` hook for device management
- [ ] `usePermissionGate.ts` hook for permission modal handling
- [ ] `PermissionContext.tsx` for global permission state
- [ ] IPC handlers implemented in `src/main/ipc-handlers/pip.ts`
- [ ] FFmpeg overlay composition working (correct position/size/shape based on settings)
- [ ] Audio mixing/selection working (both, screen-only, webcam-only modes)
- [ ] Proactive permission checking before media access
- [ ] Device selection and refresh functionality
- [ ] Graceful failure handling: One source fails → fall back to single source
- [ ] "Creating composite..." modal shows during post-processing (user sees "waiting" state)
- [ ] Composite video auto-added to Library, playable immediately
- [ ] PiP settings persisted to session.json (restored on next use)
- [ ] Quit prevention dialog works during active recording
- [ ] All happy path tests pass ✅
- [ ] All edge case tests pass ✅
- [ ] All error case tests pass ✅
- [ ] All performance tests pass ✅
- [ ] No console errors or warnings
- [ ] Performance: Composite creation <30 seconds visible to user
- [ ] Cross-platform tested: macOS + Windows (best-effort)
- [ ] Code reviewed and merged to develop

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Simultaneous capture frame drops** | Two streams from different sources may cause lag | Test with synthetic load; use hardware-accelerated codecs if available; monitor real-time CPU usage |
| **Audio sync drift** | Screen audio + mic audio getting out of sync during long recordings | Use FFmpeg `-async 1` flag for audio sync; test with 5-min recordings; measure drift with audio analysis tools |
| **Compositing blocks UI** | FFmpeg subprocess freezes app during post-processing | Use IPC invoke (background thread); ensure main process free; test 5-minute composite creation |
| **Large temp files** | Two simultaneous recordings consume disk space | Warn user if <500MB free; delete temp files immediately after composite or on error |
| **Camera in use by Zoom/Teams** | Conflict with other apps during capture | Graceful error messaging; user prompted to close conflicting app; "Try Again" button |
| **Windows camera access different from macOS** | `desktopCapturer` + `getUserMedia` behavior differs | Test on both OS; use fallbacks for Windows audio capture (may need Web Audio API workaround) |
| **Webcam resolution mismatch with screen** | Aspect ratio distortion in overlay | Test with common resolutions (1080p, 1440p, 4K); use `scale` filter in FFmpeg to fit |

---

## 15. Rollout & Telemetry

- **Feature flag?** No (direct release)
- **Metrics**: PiP recording success rate, composition time, audio sync quality, user settings preferences
- **Manual validation steps**: All test gates from Section 12

---

## 16. Open Questions

- **Q1: Pause/Resume in Future?** Current PRD omits pause; future sprint can add if needed. Requires state machine complexity.
- **Q2: Custom Output Location?** Current PRD auto-saves to recordings + imports. Future: allow user to specify save location.
- **Q3: Rename Recording Before Import?** Current: auto-named. Future: show rename dialog after stop, before import.

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Real-time compositing during capture
- [ ] Webcam border styling (rounded corners, shadows)
- [ ] Separate audio tracks (advanced routing)
- [ ] Pause/resume during PiP recording
- [ ] Custom aspect ratio for composite
- [ ] Blur/background removal

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?** User clicks "Record Screen + Webcam (PiP)" → configures overlay position/size → records → composite video saved and appears in Library as playable video.
2. **Primary user and critical action?** Educator or presenter recording tutorials with both screen activity and their face visible; needs reliable simultaneous capture with minimal setup.
3. **Must-have vs nice-to-have?** MUST: Simultaneous capture, overlay positioning, composite playback. NICE: Border styling, advanced audio routing, pause/resume.
4. **Video processing requirements?** Screen capture via `desktopCapturer` + webcam capture via `getUserMedia` + FFmpeg overlay composition.
5. **Performance constraints?** Recording at native resolution without frame drops; composite post-processing shows clear "waiting" UI (not frozen app).
6. **Error/edge cases to handle?** One source fails → fall back to single source; camera in use → error; permission denied → error with recovery.
7. **Data model changes?** Add `PiPRecordingSettings` interface for position, size, audio config.
8. **Electron IPC handlers required?** `start-pip-recording`, `stop-pip-recording`, `composite-pip-videos`, `get-pip-settings`, `check-camera-available`, `get-screens`.
9. **UI entry points and states?** Toolbar button → Modal with settings → Live preview → Recording → Compositing → Library import.
10. **File system implications?** Recordings saved to `userData/recordings/` (not temp) for persistence across app launches.
11. **Dependencies or blocking integrations?** Depends on PR-11 (Screen Recording) and PR-12 (Webcam Recording) completion.
12. **Rollout strategy and metrics?** Direct release, track PiP recording success rate and composition performance metrics.
13. **What is explicitly out of scope?** Real-time compositing, webcam border styling, separate audio tracks, pause/resume, custom aspect ratios, blur/background removal.

---

## 18. Implementation Notes (Post-Development)

### What Will Be Built
This section will document the actual implementation, including any enhancements made beyond the original PRD specification.

#### Core Features (As Specified)
- [ ] Simultaneous Screen + Webcam Recording
- [ ] Configurable PiP Settings (position, size, audio mode)
- [ ] FFmpeg Overlay Composition
- [ ] Audio Handling and Synchronization
- [ ] Error Handling & Recovery
- [ ] Library Integration

#### Enhanced Features (Beyond Original PRD)
- [ ] Advanced Permission Management System
- [ ] Device Selection UI
- [ ] Live Preview During Settings
- [ ] Recording Indicator Within Modal
- [ ] Enhanced UX & UI Improvements

### Architecture Changes
#### New Files to Create
- [ ] `src/components/PiPRecordingModal.tsx` - Main PiP recording flow
- [ ] `src/components/PiPSettings.tsx` - Position/size/audio configuration
- [ ] `src/components/RecordingIndicator.tsx` - Visual recording status
- [ ] `src/main/ipc-handlers/pip.ts` - Electron IPC handlers for PiP operations

#### Modified Files
- [ ] `src/components/MainLayout.tsx` - Add PiP recording button
- [ ] `src/components/Library.tsx` - Display PiP recordings with indicator
- [ ] `src/main/main.ts` - Register PiP IPC handlers
- [ ] `src/preload.ts` - Expose PiP IPC methods

### Key Technical Decisions
- [ ] **Proactive Permission Checking**: Check permissions BEFORE attempting getUserMedia/desktopCapturer
- [ ] **Separate Recording + Post-Composition**: Keep separate temp files, composite with FFmpeg afterward
- [ ] **Live Preview During Settings**: Show exact preview of PiP layout before recording
- [ ] **Recording Indicator Within Modal**: Show recording status within modal rather than screen overlay
- [ ] **Device Selection Priority Logic**: Auto-select preferred devices (headphones for mic, default for camera)

### Testing Results
#### Performance Results
- [ ] **Composition Time**: 30-second recording → <10 seconds, 5-minute recording → <30 seconds
- [ ] **Memory Usage**: Recording baseline <200MB, FFmpeg composition <300MB
- [ ] **Audio/Video Sync**: Drift <50ms over 5-minute recordings

#### Known Limitations
- [ ] **No Live Screen Preview During Recording**: Static thumbnail preview due to Electron API limitations
- [ ] **Audio Mode Options**: Currently microphone-only (no screen audio capture)
- [ ] **Windows Testing**: Primary testing on macOS, Windows compatibility assumed

### Future Enhancements
- [ ] Screen Audio Capture: Add option to capture system audio
- [ ] Screen Recording Overlay: Show green border on recorded screen
- [ ] Pause/Resume: Add ability to pause PiP recording
- [ ] Custom Positioning: Drag webcam overlay to custom position
- [ ] Webcam Border Styling: Rounded corners, shadows, custom colors
- [ ] Real-time Compositing: Composite during recording instead of post-processing
- [ ] Adjustable Webcam Opacity: Slider for webcam transparency
- [ ] Recording Presets: Save/load custom PiP configurations
- [ ] Keyboard Shortcuts: Start/stop recording with hotkeys

---

## 19. Developer Notes

### For Future Maintainers

#### Permission System
- All recording features MUST use centralized permission management
- Always check permissions with validation functions BEFORE attempting media access
- Use consistent error handling patterns across all recording features
- Implement permission modal system to prevent modal stacking

#### Device Selection
- Use consolidated media permissions hook for camera/microphone management
- Hook handles permission checks, device enumeration, and state management
- Auto-select preferred devices using priority logic

#### FFmpeg Overlay Composition
- Position calculations: `TL=(0,0), TR=(sw-ww,0), BL=(0,sh-wh), BR=(sw-ww,sh-wh)`
- Size: `ww = sw * (0.2 | 0.3 | 0.4)`, `wh = ww * (9/16)` for rectangle
- Always use `scale` filter before `overlay` filter for correct rendering

#### Recording Indicator
- Shown within modal UI during recording (red pulsing dot + timer)
- Consider screen overlay for better multi-monitor feedback in future

#### Session Persistence
- PiP settings saved to `app.getPath('userData')/session.json` under `pipSettings` key
- Restored on next PiP recording modal open
- Includes: `lastPosition`, `lastSize`, `lastAudioMode`

#### Temp File Naming
```
Screen: app.getPath('temp')/pip-screen-[recordingId].webm
Webcam: app.getPath('temp')/pip-webcam-[recordingId].webm
Composite: app.getPath('userData')/recordings/PiP_Recording_[timestamp].mp4
```

#### IPC Error Handling
- All IPC handlers return `{success: boolean; error?: string; ...data}` format
- Frontend checks `success` flag before accessing data fields
- Always cleanup resources (streams, temp files) on errors

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep Electron IPC handlers deterministic
- React components are thin wrappers
- Test video processing thoroughly with real video files
- Reference `prd-v1.md` and `.cursorrules` throughout
