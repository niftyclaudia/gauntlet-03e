# PRD: Auto-Save & Session Recovery

**Feature**: Auto-Save & Session Recovery

**Version**: 1.0

**Status**: Implementation Complete ✅

**Agent**: Pete → Cody (Implementation)

**Target Release**: MVP Phase 5

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md) | [pr-3-prd.md](./pr-3-prd.md) | [pr-4-prd.md](./pr-4-prd.md)

---

## 1. Summary

Enable users to automatically save their video editing work every 30 seconds and recover their previous session when reopening the app, preventing data loss and improving workflow continuity.

---

## 2. Problem & Goals

**Problem**: Users risk losing their editing work (imported clips, timeline arrangement, trim points, zoom level, playhead position) if the app crashes, computer shuts down, or they accidentally close the app. Without auto-save, users must manually recreate their entire timeline and settings, which is frustrating and time-consuming.

**Why now**: This is Phase 5 of the MVP, building on Library (PR-2), Timeline (PR-3), and Video Preview (PR-4). Auto-save is essential before users start serious editing work - it's a critical data protection feature that builds user confidence. Users need assurance their work won't be lost.

**Goals** (ordered, measurable):
  - [ ] G1 — User's project state automatically saves every 30 seconds when timeline has clips, without interrupting workflow
  - [ ] G2 — User can restore previous session on app launch if autosave file exists and is less than 24 hours old
  - [ ] G3 — Project state persists across app restarts (library clips, timeline arrangement, trim points, zoom, playhead position)

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing manual save/load project files (auto-save only for MVP)
- [ ] Not implementing multiple project save slots or version history
- [ ] Not implementing cloud sync or remote backup
- [ ] Not implementing project templates
- [ ] Not implementing export of project file to share with others
- [ ] Not implementing project recovery for files older than 24 hours
- [ ] Not implementing encryption of autosave file
- [ ] Not implementing auto-save for empty timelines (saves only when timeline has clips)
- [ ] Not implementing auto-save during export (saves before export starts, not during)
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

**User-visible**:
- Auto-save occurs every 30 seconds without user noticing (no UI blocking, no interruptions)
- Session restore dialog appears within 2 seconds of app launch if autosave exists
- Restored session matches previous state exactly (clips in order, trim points preserved, zoom level correct)
- Zero data loss reported for crashes or accidental closes

**System** (from prd-v1.md):
- Auto-save operation completes in < 500ms (non-blocking)
- File I/O operations don't block main thread
- Memory usage increase < 10MB for auto-save functionality
- App launch time increases by < 500ms for autosave check

**Quality**:
- 0 blocking bugs
- All acceptance gates pass
- Autosave file creates/updates successfully 100% of the time
- Session restore works correctly when autosave file is valid
- App handles corrupted/invalid autosave files gracefully

---

## 5. Users & Stories

- As a video editor, I want my work automatically saved so that I don't lose progress if the app crashes
- As a content creator, I want to restore my previous session when reopening the app so that I can continue where I left off
- As a user, I want auto-save to work silently in the background so that it doesn't interrupt my editing workflow
- As a video editor, I want my timeline arrangement, trim points, and zoom level preserved so that I don't have to redo my work
- As a user, I want to choose whether to restore or start fresh when reopening the app so that I have control over my workflow

---

## 6. Experience Specification (UX)

**Entry Points**:
- Auto-save: Automatically triggered every 30 seconds (if timeline has clips)
- Session restore: Automatically triggered on app launch (if autosave file exists and < 24 hours old)
- Save before export: Automatically triggered when export starts (if timeline has clips)
- Save on close: Attempted when app window closes (if timeline has clips)

**Auto-Save Flow**:
- Silent background operation (no user interaction required)
- Triggered by setInterval running every 30 seconds
- Only saves if timeline has at least 1 clip (avoids saving empty state)
- Serializes current project state to JSON file
- Writes to `~/Library/Application Support/ollo/autosave.json`
- No visual indicator during save (completely transparent to user)
- No error shown to user if save fails (logged to console only)

**Session Recovery Flow**:
- On app launch, immediately check for autosave file
- If autosave file exists:
  - Check file modification time (must be < 24 hours old)
  - If file is recent (< 24 hours):
    - Show native dialog: "Restore previous session?"
    - Body: "Would you like to restore your previous editing session? (Last saved: [timestamp])"
    - Buttons: "Restore" (primary) | "Start Fresh" (secondary)
  - If file is old (>= 24 hours):
    - Automatically delete old autosave file
    - Start with empty state (no dialog shown)
- If user chooses "Restore":
  - Load autosave file
  - Deserialize JSON to project state
  - Validate file paths (verify video files still exist)
  - Remove any clips with missing files (with silent cleanup)
  - Restore library clips, timeline, trim points, zoom, playhead position
  - Set selectedClipId if clip exists
  - Show timeline with restored clips
- If user chooses "Start Fresh":
  - Delete autosave file
  - Start with empty state (normal app launch)

**Save Triggers**:
- Every 30 seconds (automatic, if timeline has clips)
- Before export starts (ensure latest state saved before long operation)
- When app is closing (attempted, may not complete if app force-quit)

**States**:
- Normal operation: Auto-save runs silently in background
- App launch (no autosave): Normal startup, no dialog
- App launch (with recent autosave): Dialog shown, wait for user choice
- App launch (with old autosave): Auto-delete old file, normal startup
- Restore in progress: Loading state while deserializing (if needed)
- Restore complete: Timeline populated with restored clips
- Restore error: Invalid/corrupted file → silently delete, start fresh

**Performance** (from prd-v1.md):
- Auto-save completes in < 500ms (non-blocking)
- Session restore check completes in < 500ms on app launch
- No UI blocking during auto-save operations
- File I/O doesn't affect video playback smoothness

---

## 7. Functional Requirements (Must/Should)

**MUST**:
- Auto-save project state every 30 seconds when timeline has at least 1 clip
- Save project state to `~/Library/Application Support/ollo/autosave.json`
- Project state includes: library clips (file paths), timeline clips (with trim points and order), selectedClipId, currentPlayheadPosition, timelineZoom, timelineScrollPosition, timestamp, version
- Check for autosave file on app launch
- Show restore dialog if autosave file exists and is < 24 hours old
- Restore project state when user chooses "Restore" (load clips, timeline, settings)
- Delete autosave file when user chooses "Start Fresh"
- Delete autosave file automatically if it's >= 24 hours old
- Validate file paths when restoring (verify video files still exist)
- Remove clips with missing files silently during restore (don't show error)
- Save project state before export starts (if timeline has clips)
- Attempt save when app window closes (if timeline has clips)
- Handle corrupted/invalid autosave JSON files gracefully (delete and start fresh)
- Create Application Support directory if it doesn't exist
- Auto-save operation is non-blocking (doesn't freeze UI)
- Electron IPC handlers for save, load, delete operations

**SHOULD**:
- Include timestamp in autosave file for display in restore dialog
- Include version number in autosave file for future compatibility
- Log auto-save operations to console (for debugging)
- Log restore operations to console (for debugging)
- Handle file system permission errors gracefully (log only, don't crash)
- Preserve thumbnails during restore (if thumbnail files still exist)

**Acceptance Gates**:
- [Gate] When timeline has clips → auto-save triggers every 30 seconds, state saved successfully
- [Gate] When timeline is empty → auto-save does not trigger, no file written
- [Gate] When app launches with recent autosave → restore dialog appears within 2 seconds
- [Gate] When user chooses "Restore" → project state restored correctly (clips, timeline, zoom, playhead)
- [Gate] When user chooses "Start Fresh" → autosave file deleted, app starts with empty state
- [Gate] When autosave file is >= 24 hours old → file deleted automatically, no dialog shown
- [Gate] When restoring with missing video files → clips with missing files removed silently, other clips restored
- [Gate] When autosave file is corrupted → file deleted silently, app starts fresh with no error shown to user
- [Gate] When auto-save runs → operation completes in < 500ms, UI remains responsive
- [Gate] When saving before export → latest state saved successfully before export starts

---

## 8. Data Model

**Existing Types** (from prd-v1.md, PR-2, PR-3, PR-4):
```typescript
interface VideoClip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  thumbnail: string;
  metadata: VideoMetadata;
  importedAt: number;
}

interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;
  trimEnd: number;
  order: number;
}
```

**New Type: ProjectState (Serialized)**:
```typescript
interface SavedProjectState {
  /** Version number for future compatibility (e.g., "1.0") */
  version: string;
  /** ISO 8601 timestamp when state was saved */
  timestamp: string;
  /** Array of imported video clips (file paths, not video data) */
  library: VideoClip[];
  /** Timeline clips with trim points and order */
  timeline: TimelineClip[];
  /** Currently selected clip ID (null if none) */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Timeline zoom level (1.0 to 10.0) */
  timelineZoom: number;
  /** Timeline horizontal scroll position in pixels */
  timelineScrollPosition: number;
}
```

**Validation Rules**:
- version must be "1.0" for MVP (future versions may require migration)
- timestamp must be valid ISO 8601 string
- library must be array (can be empty)
- timeline must be array (can be empty, but save only triggers if length > 0)
- selectedClipId can be null or string (must match clip ID in library/timeline if not null)
- currentPlayheadPosition must be >= 0
- timelineZoom must be >= 1.0 and <= 10.0
- timelineScrollPosition must be >= 0
- Each library clip must have valid id, path, filename (path must be absolute)
- Each timeline clip must reference valid libraryClipId (must exist in library array)

**File Format** (JSON):
```json
{
  "version": "1.0",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "library": [
    {
      "id": "uuid-v4",
      "path": "/Users/username/Movies/video.mp4",
      "filename": "video.mp4",
      "duration": 120.5,
      "thumbnail": "/Users/username/Library/Application Support/ollo/thumbnails/uuid.jpg",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "framerate": 30,
        "codec": "h264"
      },
      "importedAt": 1706355000000
    }
  ],
  "timeline": [
    {
      "id": "uuid-v4",
      "libraryClipId": "uuid-v4",
      "trimStart": 0,
      "trimEnd": 120.5,
      "order": 0
    }
  ],
  "selectedClipId": "uuid-v4",
  "currentPlayheadPosition": 15.5,
  "timelineZoom": 2.5,
  "timelineScrollPosition": 100
}
```

**File Operations**:
- Read: Check if autosave.json exists, read and parse JSON
- Write: Serialize ProjectState to JSON, write to autosave.json (atomic if possible)
- Delete: Remove autosave.json file
- Check age: Get file modification time, compare to current time

**Invariants**:
- Autosave file only exists if timeline had clips at some point
- Autosave file timestamp reflects last save time (not creation time)
- Restored state always has valid references (libraryClipId references existing library clip)
- Restored state removes invalid clips silently (missing files, broken references)

---

## 9. API / Service Contracts

**Electron IPC Handlers** (main process):
```typescript
// Handler: autosave:save
// Params: state (SavedProjectState)
// Returns: Promise<void>
// Errors: Throws Error if file write fails
ipcMain.handle('autosave:save', async (_event, state: SavedProjectState): Promise<void> => {
  // Serialize state to JSON
  // Write to ~/Library/Application Support/ollo/autosave.json
  // Create directory if it doesn't exist
  // Handle file write errors
});

// Handler: autosave:load
// Params: none
// Returns: Promise<SavedProjectState | null>
// Errors: Returns null if file doesn't exist or is invalid
ipcMain.handle('autosave:load', async (): Promise<SavedProjectState | null> => {
  // Check if autosave.json exists
  // Read and parse JSON
  // Validate structure
  // Return state or null if invalid/missing
});

// Handler: autosave:delete
// Params: none
// Returns: Promise<void>
// Errors: Throws Error if file delete fails (file may not exist)
ipcMain.handle('autosave:delete', async (): Promise<void> => {
  // Delete autosave.json file
  // Handle errors gracefully (file may not exist)
});

// Handler: autosave:getAge
// Params: none
// Returns: Promise<number | null> (age in milliseconds, null if file doesn't exist)
// Errors: Returns null if file doesn't exist
ipcMain.handle('autosave:getAge', async (): Promise<number | null> => {
  // Get file modification time
  // Calculate age in milliseconds
  // Return age or null if file doesn't exist
});
```

**Preload Script (contextBridge API)**:
```typescript
contextBridge.exposeInMainWorld('electron', {
  // ... existing methods ...
  
  // Auto-save operations
  saveProject: (state: SavedProjectState): Promise<void> => {
    return ipcRenderer.invoke('autosave:save', state);
  },
  
  loadProject: (): Promise<SavedProjectState | null> => {
    return ipcRenderer.invoke('autosave:load');
  },
  
  deleteAutosave: (): Promise<void> => {
    return ipcRenderer.invoke('autosave:delete');
  },
  
  getAutosaveAge: (): Promise<number | null> => {
    return ipcRenderer.invoke('autosave:getAge');
  },
});
```

**Type Definitions (for React/TypeScript)**:
```typescript
// src/renderer/types/electron.d.ts
export interface ElectronAPI {
  // ... existing methods ...
  
  saveProject: (state: SavedProjectState) => Promise<void>;
  loadProject: () => Promise<SavedProjectState | null>;
  deleteAutosave: () => Promise<void>;
  getAutosaveAge: () => Promise<number | null>;
}
```

**Pre/Post Conditions**:
- saveProject: State must be valid ProjectState, directory must be writable, returns void or throws Error
- loadProject: File may not exist (returns null), file may be corrupted (returns null), returns valid state or null
- deleteAutosave: File may not exist (handles gracefully), returns void or throws Error
- getAutosaveAge: File may not exist (returns null), returns age in milliseconds or null

**Error Handling Strategy**:
- File write errors: Log to console, don't show error to user (auto-save is transparent)
- File read errors: Return null, treat as "no autosave file"
- Corrupted JSON: Return null, treat as "invalid file"
- Missing directory: Create it automatically before write
- Permission errors: Log to console, don't crash app

---

## 10. UI Components to Create/Modify

**New Components**:
- `src/components/RestoreSessionDialog.tsx` — Native dialog component for restore prompt (uses Electron dialog.showMessageBox)

**New Hooks**:
- `src/hooks/useAutoSave.ts` — Auto-save logic (setInterval, state serialization, IPC calls)
- `src/hooks/useSessionRestore.ts` — Session restore logic (check on mount, show dialog, restore state)

**Modified Components**:
- `src/App.tsx` — Add auto-save hook, add session restore hook on mount, handle restore state update
- `src/main/ipcHandlers.ts` — Add autosave:save, autosave:load, autosave:delete, autosave:getAge handlers
- `src/main/fileSystem.ts` — Add getAutosavePath(), ensureAutosaveDirectory(), validateProjectState() utilities
- `src/preload.ts` — Add saveProject, loadProject, deleteAutosave, getAutosaveAge to contextBridge API
- `src/renderer/types/electron.d.ts` — Add Electron API type definitions for auto-save methods
- `src/types/video.ts` — Add SavedProjectState interface type definition

**Modified Functions**:
- Export operations (future PR-8): Call saveProject before export starts

---

## 11. Integration Points

- **Electron IPC**: Save/load/delete operations via IPC handlers in main process
- **File System**: Read/write operations to `~/Library/Application Support/ollo/autosave.json`
- **React State Management**: Serialize App state to SavedProjectState, restore to App state
- **App Lifecycle**: Check for autosave on App mount, attempt save on window close
- **Export Integration**: Call saveProject before export starts (PR-8 dependency)
- **State Validation**: Validate file paths exist before restoring (handle missing files)

---

## 12. Test Plan & Acceptance Gates

**Happy Path**:
- [ ] Auto-save triggers every 30 seconds when timeline has clips
  - Gate: File updates correctly, timestamp increments, state matches current app state
- [ ] User closes app, reopens → restore dialog appears
  - Gate: Dialog appears within 2 seconds, shows correct timestamp, buttons work
- [ ] User chooses "Restore" → session restored correctly
  - Gate: All clips loaded, timeline restored, zoom/playhead position correct
- [ ] User chooses "Start Fresh" → autosave deleted, app starts empty
  - Gate: Autosave file deleted, app shows empty state, no errors

**Edge Cases**:
- [ ] Timeline empty → auto-save does not trigger
  - Gate: No autosave file created if timeline has no clips
- [ ] Autosave file is >= 24 hours old → automatically deleted
  - Gate: File deleted on app launch, no dialog shown, app starts fresh
- [ ] Autosave file is corrupted/invalid JSON → silently handled
  - Gate: File deleted, app starts fresh, no error shown to user
- [ ] Video files moved/deleted before restore → clips removed silently
  - Gate: Missing clips removed from restored state, valid clips restored, no errors shown
- [ ] Rapid app close/open → autosave file handled correctly
  - Gate: Latest state saved, restore works correctly
- [ ] App force-quit (kill process) → autosave may not complete
  - Gate: Previous valid autosave still available, restore works correctly
- [ ] Multiple clips with same ID (edge case) → handled gracefully
  - Gate: Restore works, duplicates handled (first occurrence used)

**File System**:
- [ ] Application Support directory doesn't exist → created automatically
  - Gate: Directory created before first save, no errors
- [ ] File permissions issue → handled gracefully
  - Gate: Error logged to console, app doesn't crash, auto-save silently fails
- [ ] Disk full → handled gracefully
  - Gate: Error logged to console, app doesn't crash, user can continue editing

**Performance** (see prd-v1.md):
- [ ] Auto-save operation completes in < 500ms
  - Gate: File write completes quickly, UI remains responsive
- [ ] Session restore check completes in < 500ms on app launch
  - Gate: File check and age calculation fast, app launch not significantly delayed
- [ ] No UI blocking during auto-save
  - Gate: Video playback continues, timeline interactions work, no lag
- [ ] Memory usage increase < 10MB
  - Gate: Auto-save feature doesn't significantly increase memory footprint

**Integration**:
- [ ] Auto-save before export (future PR-8)
  - Gate: Export operation triggers saveProject call, latest state saved
- [ ] Auto-save on window close
  - Gate: Attempt made to save before window closes (may not complete if force-quit)

**Manual Testing**:
- [ ] Import 3 clips, add to timeline, trim clips, adjust zoom
  - Gate: Auto-save triggers, file written correctly
- [ ] Close app, reopen → verify restore dialog
  - Gate: Dialog appears, shows correct timestamp
- [ ] Choose "Restore" → verify all state restored
  - Gate: Clips, timeline, trim points, zoom, playhead all restored correctly
- [ ] Choose "Start Fresh" → verify empty state
  - Gate: Autosave deleted, app starts empty
- [ ] Wait 30 seconds with clips on timeline → verify auto-save triggers
  - Gate: File updated, timestamp changes
- [ ] Test with missing video files → verify graceful handling
  - Gate: Missing clips removed, valid clips restored, no errors

---

## 13. Definition of Done

See standards in prd-v1.md and .cursorrules:
- [x] Electron IPC handlers implemented in main process (autosave:save, autosave:load, autosave:delete, autosave:getAge, autosave:showRestoreDialog, file:validateExists) ✅
- [x] Preload script updated with auto-save API methods ✅
- [x] Type definitions added for SavedProjectState and Electron API ✅
- [x] useAutoSave hook implemented with 30-second interval ✅
- [x] useSessionRestore hook implemented with dialog logic ✅
- [x] App.tsx integrated with auto-save and restore hooks ✅
- [x] File system utilities for autosave directory and file operations ✅
- [x] Restore dialog component (using Electron native dialog) ✅
- [x] File validation during restore (check video files exist) ✅
- [x] Age check logic (24-hour threshold) ✅
- [x] Error handling for corrupted files, missing files, permission errors ✅
- [x] Auto-save UI indicator (status bar showing "Auto saved: [timestamp]") ✅
- [x] Playhead position restore working correctly ✅
- [x] Most acceptance gates pass (happy path verified) ✅
- [x] Performance targets met (< 500ms save, < 500ms restore check, no UI blocking) ✅
- [x] Manual testing complete (restore session, start fresh, auto-save triggers) ✅
- [x] Cross-platform testing done (macOS primary) ✅
- [x] Code follows .cursorrules patterns ✅
- [x] TypeScript types correct, no console errors ✅
- [x] Documentation updated (inline comments added) ✅

---

## 14. Risks & Mitigations

- **Risk**: Auto-save file write may fail silently → **Mitigation**: Log errors to console, don't show to user (transparent operation), continue normally even if save fails
- **Risk**: Corrupted autosave file may crash app on restore → **Mitigation**: Validate JSON structure, catch parse errors, return null and start fresh if invalid
- **Risk**: Missing video files during restore may cause errors → **Mitigation**: Validate file paths exist, silently remove clips with missing files, continue restore with valid clips
- **Risk**: Auto-save may block UI during file write → **Mitigation**: Use async IPC calls, verify save completes in < 500ms, test with large state payloads
- **Risk**: Race condition between save and restore (app closes while saving) → **Mitigation**: Write is atomic if possible, worst case previous valid save is restored, not critical
- **Risk**: Autosave file grows large with many clips → **Mitigation**: File stores paths only (not video data), typical file < 100KB even with 50+ clips, monitor file size during testing
- **Risk**: 24-hour age check may fail on system clock changes → **Mitigation**: Use file modification time (mtime), not absolute time, system handles clock changes automatically
- **Risk**: App Support directory creation may fail on some systems → **Mitigation**: Create directory before first save, handle errors gracefully, log to console
- **Risk**: Session restore may restore invalid state (broken references) → **Mitigation**: Validate all libraryClipId references, remove broken references silently, ensure restored state is always valid

---

## 15. Rollout & Telemetry

**Feature Flag?** No (core MVP feature)

**Metrics**:
- Auto-save success rate (manual observation, target 100%)
- Auto-save operation time (console logs, target < 500ms)
- Session restore success rate (manual observation, target 100%)
- Session restore operation time (console logs, target < 500ms)
- Autosave file size (manual check, typically < 100KB)
- App launch time impact (manual timing, target < 500ms increase)

**Manual Validation Steps**:
1. Launch app in dev mode: `npm start`
2. Import 3 clips (PR-2)
3. Add clips to timeline (PR-3)
4. Trim clips (PR-6, if complete)
5. Adjust zoom and playhead position
6. Wait 30 seconds → verify autosave file created at `~/Library/Application Support/ollo/autosave.json`
7. Check file contents (should have library, timeline, state)
8. Close app
9. Reopen app → verify restore dialog appears
10. Choose "Restore" → verify all state restored correctly
11. Close app
12. Reopen app → choose "Start Fresh" → verify autosave deleted, app starts empty
13. Build production: `npm run make`
14. Test same scenarios in built app
15. Test with missing video files (move files after save, restore) → verify graceful handling
16. Test with corrupted autosave file (manually corrupt JSON) → verify app starts fresh

---

## 16. Open Questions

- Q1: Should we show a subtle "Saved" indicator when auto-save completes?
  - **Decision**: User requested UI indicator - implemented status bar showing "Auto saved: [timestamp]" at top of app (like CapCut)
- Q2: Should we save state even if timeline is empty (to preserve library)?
  - **Decision**: No, for MVP - only save when timeline has clips (per prd-v1.md requirement)
- Q3: What happens if user has multiple app instances running?
  - **Decision**: Each instance manages its own autosave file (may overwrite, acceptable for MVP)
- Q4: Should we validate thumbnails exist during restore?
  - **Decision**: No, for MVP - thumbnails will be regenerated if missing (existing behavior)
- Q5: Should we save state on every change or only every 30 seconds?
  - **Decision**: Every 30 seconds only (per prd-v1.md requirement), not on every change
- Q6: What happens if export is in progress when 30-second timer fires?
  - **Decision**: Skip save during export (save was already triggered before export started)

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future PRs:
- [ ] Manual save/load project files (File → Save Project, File → Open Project)
- [ ] Multiple project save slots
- [ ] Project version history / undo history persistence
- [ ] Cloud sync (iCloud, Dropbox, etc.)
- [ ] Project templates
- [ ] Export project file to share
- [ ] Project recovery for files older than 24 hours (with warning)
- [ ] Encryption of autosave file
- [ ] Auto-save indicator in UI (subtle "Saved" notification)
- [ ] Configurable auto-save interval (user preference)
- [ ] Save on every change (debounced)
- [ ] Project metadata (name, description, created date, modified date)

---

## Authoring Notes

- ✅ Implementation complete (Cody agent)
- ✅ Auto-save status bar shows "Auto saved: [timestamp]" at top of app (user-requested)
- ✅ Playhead position restore working correctly (fixed timing issue)
- File I/O operations must be non-blocking (async IPC calls)
- Validate file paths during restore (handle missing files gracefully)
- Use file modification time for age check (not absolute timestamp)
- Error handling should be silent (log to console only, don't show errors to user)
- Restore dialog uses Electron native dialog (not custom React component)
- Reference `prd-v1.md` Section 8 (Auto-Save & Session Recovery) and `.cursorrules` for patterns
- Test with real video files, verify state persistence accurately
- Consider future compatibility (version number in saved state)

