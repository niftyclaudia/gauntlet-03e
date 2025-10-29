# PRD: Webcam Recording

**Feature**: Webcam Recording

**Version**: 1.0

**Status**: Ready for Development

**Agent**: Pete

**Target Release**: Sprint 12

**Links**: [PR Brief], [TODO], [Designs], [Tracking Issue]

---

## 1. Summary

Webcam Recording enables users to record themselves talking or demonstrating (face-on-camera content) with synchronized audio, creating short video clips that automatically import into the Library. This eliminates external camera recording tools and unifies the recording workflow within ollo.

**Key Outcome**: User records 1-5min talking-head video → MP4 file → appears in Library → can be arranged on timeline alongside screen recordings and imported clips.

---

## 2. Problem & Goals

- **What video editing problem are we solving?** Content creators need to record themselves talking or demonstrating, but currently must use external camera apps, then import files manually. This creates workflow friction and file management overhead.
- **Why now?** Screen recording (PR-11) is complete, providing the foundation for recording infrastructure. Webcam recording is the natural next step to complete the recording feature set.
- **Goals (ordered, measurable):**
  - [ ] G1 — Enable webcam recording with live preview and auto-import to Library
  - [ ] G2 — Achieve 30fps+ live preview and <100ms audio/video sync
  - [ ] G3 — Handle permission flows and error cases gracefully

---

## 3. Non-Goals / Out of Scope

**Out of Scope (Post-MVP)**:
- ❌ Pause/resume during recording (only stop)
- ❌ Green screen / background blur effects
- ❌ Screen + webcam simultaneous recording (see future PiP feature)
- ❌ Custom resolution/bitrate encoding (fixed H.264 preset)
- ❌ Multiple camera simultaneous recording
- ❌ Scheduled or time-delayed recording

**Why Excluded**: Simplifies MVP implementation; pause/resume adds state complexity. Effects and multi-camera require advanced FFmpeg/WebRTC handling.

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- **User-visible**: Record webcam video in <30 seconds from click to Library import
- **System**: [See performance requirements in prd-v1.md]
  - Preview 30fps minimum (live video)
  - Recording at native resolution (1080p typical for webcams)
  - Audio/video sync drift <100ms
  - File size: ~50MB per minute at 1080p H.264
- **Quality**: [0 blocking bugs, all gates pass, crash-free >99%]

---

## 5. Users & Stories

- As a **content creator**, I want to record myself talking so that I can create talking-head videos without external tools.
- As a **vlogger**, I want to record webcam footage with live preview so that I can see myself while recording.
- As a **tutorial creator**, I want recorded webcam clips to automatically appear in my Library so that I can quickly arrange them on the timeline.

---

## 6. Experience Specification (UX)

### Entry Points and Flows
1. **Toolbar Button**: "Record Webcam" button in main toolbar (next to "Import" and "Record Screen" buttons)
2. **Keyboard Shortcut** (optional): Cmd/Ctrl+Shift+W to toggle recording

### Happy Path Flow
```
User clicks "Record Webcam"
  ↓
[Permission Check] - Browser permission dialog
  ↓
[Recording Modal Opens] - Live preview, timer, start/cancel buttons
  ↓
[User clicks "Start"] - Timer begins, button changes to "Stop"
  ↓
[Recording Active] - User talks/demonstrates, audio captured
  ↓
[User clicks "Stop"] - Recording halts, encoding begins
  ↓
[Auto-Import to Library] - Recording appears with generated name
```

### Visual Behavior
- Live preview of camera feed (30fps)
- Recording timer: 00:00 format
- Start/Stop button (red, prominent)
- "Saving..." spinner during encoding
- Error dialogs for permission/camera issues

### States
| State | Appearance | Actions | Notes |
|-------|-----------|---------|-------|
| **Idle** | "Record Webcam" button in toolbar | Click to start | Modal hidden |
| **Permission Checking** | Modal with spinner + "Requesting permission..." | None (wait) | Blocking user action |
| **Preview Ready** | Live video feed, "Start" button enabled | Click "Start" or "Cancel" | No audio capture yet |
| **Recording** | Live feed, "Stop" button (red), timer running | Click "Stop" only | Audio + video captured |
| **Saving** | Spinner + "Saving recording..." | None (wait) | Encoding to MP4 |
| **Success** | Modal closes, new clip in Library | Use in timeline | Auto-named, playable |

---

## 7. Functional Requirements (Must/Should)

### MUST (Core Features)

**REQ-1: Camera Permission & Detection**
- **REQ-1.1**: On first launch of Recording Modal, request camera permission via browser `getUserMedia()` API
- **REQ-1.2**: If permission granted, display live preview of camera feed at 30fps minimum
- **REQ-1.3**: If permission denied, show error dialog with recovery instructions
- **REQ-1.4**: If no camera detected, show error: "No camera found. Connect a webcam and try again"
- **REQ-1.5**: Detect camera failures (camera in use by another app) and show appropriate message

**REQ-2: Live Preview & Recording Session**
- **REQ-2.1**: Live preview shows camera feed in modal window at 30fps+ (no lag)
- **REQ-2.2**: Audio level meter displays microphone input levels (optional visual feedback)
- **REQ-2.3**: Start button initiates MediaRecorder capture of camera + microphone streams
- **REQ-2.4**: Stop button halts recording and begins encoding
- **REQ-2.5**: Recording timer shows elapsed time (MM:SS format) while active

**REQ-3: Audio & Video Sync**
- **REQ-3.1**: Microphone audio captured on same stream as camera video (native WebRTC stream)
- **REQ-3.2**: Audio/video sync verified in playback (drift <100ms)
- **REQ-3.3**: If microphone permission denied, show option: "Record camera only (no audio)?"

**REQ-4: File Encoding & Saving**
- **REQ-4.1**: After stop, encode recording to MP4 using FFmpeg on main process
- **REQ-4.2**: Encoding preset: H.264 + AAC (same as imported videos for consistency)
- **REQ-4.3**: Resolution: Match camera native resolution (typically 720p or 1080p)
- **REQ-4.4**: Frame rate: 30fps (or match native)
- **REQ-4.5**: Save to recordings directory: `app.getPath('userData')/recordings/Webcam_YYYYMMDD_HHMMSS.mp4`
- **REQ-4.6**: Show "Saving..." spinner during encoding (blocking modal)

**REQ-5: Auto-Add to Library**
- **REQ-5.1**: After save completes, automatically import recording to Library
- **REQ-5.2**: Generate clip name: `Webcam_YYYYMMDD_HHMMSS` (e.g., "Webcam_20251029_143022")
- **REQ-5.3**: Extract thumbnail (first frame of video)
- **REQ-5.4**: Extract duration from encoded file
- **REQ-5.5**: Add to Library state and display in Library panel

### SHOULD (Nice-to-Have)

**REQ-6: Multi-Camera Support (Optional)**
- **REQ-6.1**: If multiple cameras available, show dropdown before recording: "Select Camera"
- **REQ-6.2**: Default to primary camera (first in list)
- **REQ-6.3**: User can switch camera before starting recording

**REQ-7: Recording Analytics (Optional)**
- **REQ-7.1**: Show file size estimate as timer runs (e.g., "~5MB recorded")
- **REQ-7.2**: Show estimated disk space remaining (warn if <100MB)

### Acceptance Gates

| Scenario | Input | Expected Output | Pass Criteria |
|----------|-------|-----------------|---------------|
| **Happy Path 1: Record & Import** | Click "Record Webcam" → Grant permission → Click "Start" → Record 10 sec → Click "Stop" | Recorded video appears in Library with correct duration | No errors, file plays, duration matches |
| **Happy Path 2: Multi-Camera** | Click "Record Webcam" → Select second camera from dropdown → Record 5 sec | Recording uses selected camera | Correct camera recorded, playable |
| **Edge Case 1: No Permission** | Click "Record Webcam" → Deny permission → Click "Retry" → Grant permission | Recording proceeds after permission granted | Retry flow works cleanly |
| **Edge Case 2: Camera In Use** | Open second app using camera → Click "Record Webcam" | Error message: "Camera already in use" with "Retry" option | Clear error, user can retry |
| **Edge Case 3: Short Recording** | Record for 1 second only | Recording saves, imports, plays correctly | No encoding errors, valid MP4 |
| **Edge Case 4: Long Recording** | Record for 5 minutes | Encoding completes without crashes, file size reasonable (~50MB) | Memory stable, playable, sync maintained |
| **Error Case 1: Mic Denied** | Grant camera, deny microphone permission | "Record camera only?" option → User can proceed | Audio-only warning shown, video-only recording works |
| **Error Case 2: App Closed During Recording** | Start recording → Close app window → Select "Save" | Recording completes, saved, appears in Library on relaunch | Graceful save, no corruption |

---

## 8. Data Model

### New Interfaces

```typescript
// Recording session state (transient, not persisted)
interface RecordingSession {
  status: 'idle' | 'preview' | 'recording' | 'saving' | 'error';
  mediaStream?: MediaStream;        // Live camera + audio stream
  mediaRecorder?: MediaRecorder;    // WebRTC recording object
  recordedChunks: Blob[];           // Raw recording chunks
  startTime: number;                // Timestamp when recording started (ms)
  elapsedSeconds: number;           // Computed elapsed time
  errorMessage?: string;            // Error description if failed
  selectedCameraId?: string;        // Camera device ID (if multi-camera)
}

// Camera device info
interface CameraDevice {
  deviceId: string;
  label: string;  // e.g., "Facetime HD Camera" or "USB Camera"
  kind: 'videoinput';
}

// Returned to IPC handler after encoding
interface EncodedRecording {
  filePath: string;                 // Full path to saved MP4
  duration: number;                 // Duration in seconds
  width: number;
  height: number;
  thumbnailPath?: string;           // Path to thumbnail image (first frame)
}
```

### Data Flow: Persistent Storage

**During Recording** (transient state in React, not saved):
- RecordingSession state held in React context or component state
- NO persistence to disk during recording

**After Stop**:
1. Encoded file saved to `app.getPath('userData')/recordings/Webcam_YYYYMMDD_HHMMSS.mp4`
2. Clip object created and added to Library state
3. Clip included in session.json on app close (via existing MVP persistence logic)
4. Recording file persists until 7-day cleanup (or user manual delete)

**Session Restore**:
- On app relaunch, session.json restores all clips including recorded ones
- File path must remain valid (recordings persist across reboots)

### Constraints

- **Recording file path**: Must be valid, accessible, not moved/deleted during import
- **Audio codecs**: AAC only (for MP4 compatibility)
- **Video codec**: H.264 only (cross-platform, no HEVC)
- **Max resolution**: 1080p (upscaling not supported; native camera resolution used)
- **Frame rate**: 30fps fixed (or match native if camera supports 60fps)

---

## 9. API / Service Contracts

All IPC handlers run on Electron main process (Node.js). Renderer calls via `ipcRenderer.invoke()`.

### IPC Handler: `encode-webcam-recording`

**Purpose**: Encode WebRTC recorded chunks (Blob) to MP4 file using FFmpeg.

**Call Signature**:
```typescript
const result = await ipcRenderer.invoke('encode-webcam-recording', {
  recordedBlob: Blob,              // Raw WebRTC recording data
  outputPath: string,              // Full path to save MP4
  mimeType: string,                // e.g., 'video/webm' or 'video/mp4'
  videoDimensions: { width, height }  // Camera resolution
});
// Returns: EncodedRecording
```

**FFmpeg Logic**:
1. Input: Recorded Blob (WebRTC output, usually WebM or MP4 depending on browser)
2. Transcode: H.264 + AAC (for cross-platform compatibility)
3. Output: MP4 file
4. Thumbnail: Extract first frame as JPEG

**Example FFmpeg Command**:
```bash
ffmpeg -i input.webm \
  -c:v libx264 -preset medium -crf 23 -r 30 \
  -c:a aac -b:a 128k \
  output.mp4

ffmpeg -i input.webm -ss 0 -vframes 1 thumbnail.jpg
```

### IPC Handler: `check-camera-permission`

**Purpose**: Verify camera access is allowed (macOS/Windows permission check).

**Call Signature**:
```typescript
const granted = await ipcRenderer.invoke('check-camera-permission');
// Returns: boolean
```

### IPC Handler: `check-microphone-permission`

**Purpose**: Verify microphone access is allowed.

**Call Signature**:
```typescript
const granted = await ipcRenderer.invoke('check-microphone-permission');
// Returns: boolean
```

---

## 10. UI Components to Create/Modify

### New Components

- `src/components/WebcamRecordingModal.tsx` — Modal dialog for recording UI (preview, start/stop, timer)
- `src/components/WebcamRecordButton.tsx` — Toolbar button to trigger recording
- `src/main/ipc-handlers/webcam.ts` — Electron IPC handlers for camera/webcam operations

### Modified Components

- `src/components/Library.tsx` — Handle auto-import of recorded files
- `src/components/MainLayout.tsx` — Add WebcamRecordButton alongside existing buttons
- `src/main/main.ts` — Call `registerWebcamHandlers(ipcMain)` on app startup

---

## 11. Integration Points

- **Browser APIs (Renderer Process)**: `navigator.mediaDevices.getUserMedia()`, `MediaRecorder` API, `MediaStream` API
- **Electron APIs (Main Process)**: `ipcMain.handle()`, `fs` module, `path` module, `child_process.spawn()`
- **FFmpeg Integration**: Transcode WebRTC Blob to H.264 + AAC MP4
- **State Management**: React Context for RecordingSession state (non-persistent), existing Library state for clips
- **File I/O**: Recording storage in `app.getPath('userData')/recordings/`, session persistence via session.json

---

## 12. Test Plan & Acceptance Gates

### Happy Path Tests

- [ ] **Test 1: Record 10-second video with audio**
  - Click "Record Webcam" → Grant permission → Record 10 seconds → Stop
  - **Gate**: Clip appears in Library with correct duration, plays correctly, audio synced

- [ ] **Test 2: Multi-camera recording (if available)**
  - Select second camera from dropdown → Record 5 seconds
  - **Gate**: Recording uses selected camera, playable

- [ ] **Test 3: Multiple back-to-back recordings**
  - Record video #1 → Record video #2
  - **Gate**: Both clips exist, distinct filenames, both playable

### Edge Case Tests

- [ ] **Test 4: Permission denied, then granted**
  - Deny permission → Retry → Grant permission → Record
  - **Gate**: Retry flow works cleanly

- [ ] **Test 5: Camera in use by another app**
  - Open Facetime → Try to record → Close Facetime → Retry
  - **Gate**: Clear error message, retry succeeds

- [ ] **Test 6: Very short recording (1 second)**
  - Record for 1 second only
  - **Gate**: No encoding errors, valid MP4

- [ ] **Test 7: Long recording (5 minutes)**
  - Record for 5 minutes continuously
  - **Gate**: File size ~250MB, playback smooth, memory stable

- [ ] **Test 8: Microphone denied, camera granted**
  - Grant camera, deny microphone → Choose "Record camera only"
  - **Gate**: Video-only recording works

- [ ] **Test 9: App closed during recording**
  - Start recording → Close app → Select "Save"
  - **Gate**: Recording completes, appears on relaunch

### Error Handling Tests

- [ ] **Test 10: No camera connected**
  - Disconnect cameras → Click "Record Webcam"
  - **Gate**: Error: "No camera found"

- [ ] **Test 11: Corrupted recorded data**
  - Mock invalid Blob → Encoding fails gracefully
  - **Gate**: No crash, user can retry

- [ ] **Test 12: Disk full during encoding**
  - Fill disk → Record → Encode
  - **Gate**: Error message, partial file cleaned up

### Performance Tests

- [ ] **Test 13: Live preview responsiveness**
  - Open modal with live preview
  - **Gate**: Preview runs at 30fps+ (no stutter)

- [ ] **Test 14: Audio/video sync**
  - Record with clock + background music
  - **Gate**: Audio sync within 100ms

- [ ] **Test 15: Memory stability during long recording**
  - Record for 5 minutes
  - **Gate**: Memory growth <100MB, stable during encoding

---

## 13. Definition of Done

- [ ] `WebcamRecordingModal.tsx` implemented with full state management
- [ ] `WebcamRecordButton.tsx` added to toolbar
- [ ] IPC handlers implemented in `src/main/ipc-handlers/webcam.ts`
- [ ] FFmpeg encoding command working (H.264 + AAC output)
- [ ] Auto-import to Library functional (recorded clip appears immediately)
- [ ] All happy path tests pass (Test 1-3)
- [ ] All edge case tests pass (Test 4-9)
- [ ] All error handling tests pass (Test 10-12)
- [ ] Performance targets met: Preview 30fps+, audio sync <100ms, memory stable
- [ ] Cross-platform tested: macOS + Windows (camera/mic access)
- [ ] No crashes, no orphaned temp files
- [ ] Code reviewed and merged to `feat/webcam-recording` branch
- [ ] Acceptance gates verified before merging

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **WebRTC Permission Grant Timing** | User expects instant preview, but browser permission dialog delays flow | Show "Requesting permission..." spinner; explain in UI that browser will ask |
| **Audio/Video Sync Drift** | Recorded video plays with audio delayed >100ms, poor quality | Use native WebRTC MediaRecorder (handles sync internally). Test with frame-by-frame analysis |
| **FFmpeg Encoding Failures** | Crash mid-encoding, corrupt output file | Test FFmpeg with various input mimeTypes (WebM, MP4). Handle stderr parsing for errors. Cleanup partial files |
| **Camera Already In Use** | User can't record if second app (Facetime, Zoom) using camera | Show clear error message + recovery (close other app, retry) |
| **Permission Denial** | Recording blocked permanently; unclear recovery | Show recovery steps: "Go to System Preferences → Security & Privacy → Camera → Enable ollo". Offer "Retry" button |
| **Memory Leak During Long Recording** | App memory grows unbounded; crash on 5min+ recordings | Monitor MediaStream cleanup, MediaRecorder cleanup. Test with 10min recording. Profile with Chrome DevTools |
| **Large File Encoding** | Encoding 5min video takes >30 seconds, UI freezes | Encode on main process (Node.js) asynchronously, send progress updates via IPC. Show "Saving..." spinner with estimated time |

---

## 15. Rollout & Telemetry

- **Feature flag?** No (direct release)
- **Metrics**: Recording success rate, permission grant rate, encoding time, file sizes
- **Manual validation steps**: All test gates from Section 12

---

## 16. Open Questions

- **Q1: Pause/Resume in Future?** Current PRD omits pause; future sprint can add if needed. Requires state machine complexity.
- **Q2: Custom Output Location?** Current PRD auto-saves to recordings + imports. Future: allow user to specify save location.
- **Q3: Rename Recording Before Import?** Current: auto-named. Future: show rename dialog after stop, before import.

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Pause/resume during recording
- [ ] Green screen / background blur effects
- [ ] Screen + webcam simultaneous recording (PiP feature)
- [ ] Custom encoding quality settings
- [ ] Scheduled or time-delayed recording

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?** User clicks "Record Webcam" → grants permission → records for N seconds → file appears in Library → plays back correctly in preview.
2. **Primary user and critical action?** Content creator (vlogger, testimonial recorder) records themselves talking; needs reliable camera + audio capture with minimal setup.
3. **Must-have vs nice-to-have?** MUST: Camera permission dialog, live preview, start/stop, save MP4, auto-add to Library. NICE: Camera selection, pause/resume, custom naming.
4. **Video processing requirements?** WebRTC camera capture in renderer + FFmpeg encoding in main process.
5. **Performance constraints?** Preview 30fps minimum, audio/video sync <100ms, file size ~50MB per minute at 1080p.
6. **Error/edge cases to handle?** Camera already in use, permission denied, no camera connected, app closed during recording, microphone permission denied.
7. **Data model changes?** New `RecordingSession` interface (transient), recorded clips follow existing `Clip` interface.
8. **Electron IPC handlers required?** `encode-webcam-recording`, `check-camera-permission`, `check-microphone-permission`.
9. **UI entry points and states?** Toolbar button → Modal with preview → Start/Stop → Encoding → Library import.
10. **File system implications?** Recordings saved to `userData/recordings/` (not temp) for persistence across app launches.
11. **Dependencies or blocking integrations?** None (can build in parallel with other features). Depends only on MVP (existing Library, session state).
12. **Rollout strategy and metrics?** Direct release, track recording success rate and performance metrics.
13. **What is explicitly out of scope?** Pause/resume, effects, multi-camera simultaneous recording, custom encoding settings, scheduled recording.

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep Electron IPC handlers deterministic
- React components are thin wrappers
- Test video processing thoroughly with real video files
- Reference `prd-v1.md` and `.cursorrules` throughout


