# PR-8 TODO — Video Export

**Branch**: `feat/pr-8-export`  
**Source PRD**: `docs/prds/pr-8-prd.md`  
**Owner (Agent)**: Cody

---

## 0. Clarifying Questions & Assumptions

- Questions: None (PRD is comprehensive)
- Assumptions (confirm in PR if needed):
  - FFmpeg stderr progress parsing works reliably (will test during implementation)
  - Temporary file cleanup handles all edge cases (will verify)
  - Export cancellation is not in MVP scope (documented in PRD)

---

## 1. Setup

- [ ] Create branch `feat/pr-8-export` from develop
- [ ] Read PRD thoroughly (`docs/prds/pr-8-prd.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context (especially Phase 8 and FFmpeg sections)
- [ ] Review existing IPC handlers (`src/main/ipcHandlers.ts`) for patterns
- [ ] Review existing FFmpeg integration (`src/main/ffmpeg.ts`) for patterns
- [ ] Confirm environment and Electron dev server work
- [ ] Prepare test video files (MP4, MOV, different resolutions, frame rates)

---

## 2. Service Layer

Implement deterministic Electron IPC handlers from PRD Section 9.

- [ ] Implement `export:showSaveDialog` IPC handler in main process
  - Opens native save dialog (dialog.showSaveDialog)
  - Default filename: `ollo_export_YYYYMMDD_HHMMSS.mp4`
  - Default location: User's Documents folder
  - Filters: MP4 files only
  - Returns: file path or null if cancelled
  - Test Gate: Dialog opens correctly, returns path or null

- [ ] Implement `export:start` IPC handler in main process
  - Accepts: clips (TimelineClip[]), libraryClips (VideoClip[]), outputPath (string)
  - Validates all source files exist before starting
  - Validates output path is writable
  - Triggers auto-save before export (call `autosave:save`)
  - Starts FFmpeg export pipeline (see Section 5)
  - Emits `export:progress` events via IPC (0-100)
  - Returns: Promise<void> (resolves on success, rejects on error)
  - Test Gate: Handler validates inputs, starts export, emits progress events

- [ ] Implement `export:revealInFinder` IPC handler in main process
  - Accepts: filePath (string)
  - Opens macOS Finder to file location (shell.showItemInFolder)
  - Handles errors gracefully (file not found, etc.)
  - Returns: Promise<void>
  - Test Gate: Finder opens to correct file location

- [ ] Add progress event emitter for export
  - Create event emitter in main process
  - Emit `export:progress` events during FFmpeg processing
  - Parse FFmpeg stderr for progress updates (see Section 5)
  - Test Gate: Progress events emitted correctly (0-100)

- [ ] Add validation logic for export parameters
  - Validate timeline has at least 1 clip
  - Validate all source files exist and are readable
  - Validate output path is writable
  - Validate output directory exists (create if needed)
  - Check disk space (estimate output file size)
  - Test Gate: All validations work correctly, clear error messages

---

## 3. Data Model & File Operations

- [ ] Update `AppState` interface in `src/types/video.ts`
  - Add `isExporting: boolean`
  - Add `exportProgress: number` (0-100)
  - Add `exportError: string | null`
  - Add `exportOutputPath: string | null`
  - Test Gate: TypeScript compiles without errors, types work in components

- [ ] Create `ExportParams` interface in `src/types/video.ts`
  - Define structure: clips, libraryClips, outputPath, settings
  - Test Gate: Interface defined correctly, used in IPC handlers

- [ ] Create `ExportSettings` interface in `src/types/video.ts`
  - Define fixed preset structure (format, codecs, bitrates, resolution, framerate)
  - Test Gate: Interface matches PRD specifications

- [ ] Add helper functions for export settings calculation
  - Calculate target resolution (highest from sources, max 1080p)
  - Calculate aspect ratio from first clip
  - Generate export settings object
  - Test Gate: Settings calculated correctly for various source formats

- [ ] Add validation rules for export parameters
  - Validate trim points (trimStart < trimEnd, trimEnd <= source duration)
  - Validate file paths (absolute paths, exist, readable)
  - Test Gate: Validation catches invalid inputs, returns clear errors

---

## 4. FFmpeg Export Pipeline

Implement FFmpeg export functions in `src/main/ffmpeg.ts` (or new `src/main/export.ts`).

- [ ] Create `generateTrimCommand` function
  - Parameters: sourcePath, trimStart, trimEnd, outputPath
  - Generates FFmpeg command: `ffmpeg -ss [start] -i [input] -t [duration] -c:v libx264 -c:a aac [output]`
  - Returns: FFmpeg command array for spawn
  - Test Gate: Command generates correctly, trim points applied accurately

- [ ] Create `generateConcatCommand` function
  - Parameters: concatListPath, outputPath, settings (ExportSettings)
  - Generates FFmpeg concat command with re-encoding options
  - Handles resolution scaling (upscale to highest, max 1080p)
  - Handles frame rate conversion (all to 30fps)
  - Handles aspect ratio (letterbox to match first clip)
  - Returns: FFmpeg command array for spawn
  - Test Gate: Command generates correctly, handles mixed formats

- [ ] Create `createConcatList` function
  - Parameters: segmentPaths (string[])
  - Creates temporary concat list file (concat_list.txt format)
  - Uses absolute paths for segments
  - Returns: path to concat list file
  - Test Gate: Concat list file created correctly, paths are absolute

- [ ] Create `executeFFmpegCommand` function (if not exists)
  - Parameters: command (string[]), onProgress callback
  - Spawns FFmpeg process, monitors stderr
  - Calls onProgress callback with progress (0-100)
  - Returns: Promise<void> (resolves on success, rejects on error)
  - Test Gate: FFmpeg executes correctly, progress callbacks work

- [ ] Create `parseFFmpegProgress` function
  - Parameters: stderr output line
  - Parses `time=HH:MM:SS.mmm` patterns from FFmpeg stderr
  - Calculates progress percentage (0-100)
  - Returns: progress number or null if no match
  - Test Gate: Progress parsing works for various FFmpeg output formats

- [ ] Create `exportVideoSequence` function (main export orchestrator)
  - Parameters: clips, libraryClips, outputPath, onProgress callback
  - Orchestrates entire export pipeline:
    1. Calculate export settings (resolution, aspect ratio, etc.)
    2. Generate trimmed segments for each clip (sequential processing)
    3. Create concat list file
    4. Concatenate and re-encode to final output
    5. Clean up temporary files
  - Calls onProgress callback during each stage
  - Handles errors at each stage (cleanup, clear error messages)
  - Returns: Promise<void>
  - Test Gate: Full pipeline works end-to-end, progress updates, cleanup happens

- [ ] Create `cleanupTempFiles` function
  - Parameters: filePaths (string[])
  - Deletes temporary files (trimmed segments, concat list)
  - Handles errors gracefully (file not found, permissions, etc.)
  - Test Gate: All temp files deleted after export (success or failure)

- [ ] Add error handling for FFmpeg operations
  - Parse FFmpeg stderr for specific error messages
  - Map FFmpeg errors to user-friendly messages
  - Log detailed errors to console for debugging
  - Test Gate: Error messages are clear and actionable

---

## 5. UI Components

Create/modify React components per PRD Section 10.

- [ ] Create `src/components/ExportDialog.tsx`
  - Props: `isOpen: boolean`, `success: boolean`, `filePath: string | null`, `error: string | null`, `onClose: () => void`, `onReveal: () => void`
  - Renders success message with file path and "Reveal in Finder" button
  - Renders error message with specific error details
  - Uses consistent styling with app theme (dark theme)
  - Test Gate: Dialog renders correctly, buttons work, styling matches app

- [ ] Create `src/components/ExportProgressBar.tsx`
  - Props: `progress: number` (0-100), `isExporting: boolean`, `error: string | null`
  - Renders horizontal progress bar with percentage text
  - Shows error state (red bar) if error
  - Hidden when not exporting
  - Animates smoothly during updates
  - Test Gate: Progress bar updates smoothly, error state works, hidden when not exporting

- [ ] Create `src/hooks/useExport.ts`
  - State: `isExporting: boolean`, `progress: number`, `error: string | null`, `outputPath: string | null`
  - Function: `startExport(clips, libraryClips)` - initiates export
  - Handles IPC calls (`export:start`, `export:showSaveDialog`, `export:revealInFinder`)
  - Sets up progress event listener (`onExportProgress`)
  - Updates state based on export status
  - Resets state after export completes or fails
  - Test Gate: Hook manages state correctly, IPC calls work, progress updates

- [ ] Modify `src/components/VideoPlayer.tsx`
  - Add "Export Video" button (disabled when timeline empty, shows "Exporting..." during export)
  - Wire up `useExport` hook
  - Wire up export button click handler
  - Add ExportProgressBar component (display during export)
  - Add ExportDialog component (show on success/error)
  - Add keyboard shortcut Cmd+E (when timeline has clips, not exporting)
  - Test Gate: Button works, disabled states correct, keyboard shortcut works

- [ ] Update `src/App.tsx`
  - Add export state to AppState (isExporting, exportProgress, exportError, exportOutputPath)
  - Ensure export state is managed correctly
  - Pass export state to VideoPlayer component if needed
  - Test Gate: Export state updates correctly, components receive state

- [ ] Update `src/preload.ts`
  - Add `exportVideo(clips, libraryClips, outputPath)` to contextBridge API
  - Add `onExportProgress(callback)` for progress events
  - Add `showSaveDialog(defaultFilename)` for file picker
  - Add `revealInFinder(filePath)` for Finder integration
  - Test Gate: API exposed correctly, IPC calls work from renderer

- [ ] Update `src/renderer/types/electron.d.ts`
  - Add export API type definitions
  - `exportVideo(clips, libraryClips, outputPath): Promise<void>`
  - `onExportProgress(callback): void`
  - `showSaveDialog(defaultFilename): Promise<string | null>`
  - `revealInFinder(filePath): Promise<void>`
  - Test Gate: TypeScript types work, autocomplete works in components

---

## 6. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

- [ ] Integrate export IPC handlers in `src/main/ipcHandlers.ts`
  - Register `export:start` handler
  - Register `export:showSaveDialog` handler
  - Register `export:revealInFinder` handler
  - Wire up progress event emitter
  - Test Gate: All IPC handlers registered, work from renderer

- [ ] Integrate export with auto-save
  - Trigger auto-save before export starts (in `export:start` handler)
  - Ensure export doesn't interfere with auto-save timing (30-second interval)
  - Test Gate: Auto-save triggers before export, doesn't conflict

- [ ] Test FFmpeg export pipeline with real video files
  - Test with MP4 files (1080p, 720p, different frame rates)
  - Test with MOV files
  - Test with mixed formats (MP4 + MOV in same sequence)
  - Test with trimmed clips (various trim points)
  - Test Gate: Export works with all supported formats

- [ ] Test export file system operations
  - Test writing to user-selected location
  - Test temporary file creation and cleanup
  - Test error handling (file not found, permissions, disk space)
  - Test Gate: File operations work correctly, cleanup happens

- [ ] Verify export handles mixed source formats
  - Different resolutions (upscale to highest, max 1080p)
  - Different frame rates (convert all to 30fps)
  - Different aspect ratios (letterbox to match first clip)
  - Test Gate: Mixed formats handled correctly, output is consistent

---

## 7. Manual Testing

Follow manual testing protocol from `prd-v1.md`.

- [ ] Manual validation with real video files
  - Import 3 video clips (MP4, MOV, different resolutions, frame rates)
  - Add clips to timeline, trim one clip
  - Export sequence, verify exported MP4 plays in external player (QuickTime, VLC)
  - Test Gate: All features work with actual MP4/MOV files

- [ ] Performance verification
  - Test export time < 5 minutes for 2-minute 1080p video
  - Test UI remains responsive during export
  - Test progress updates every 1-2 seconds
  - Test memory usage during export < 1.5GB
  - Test Gate: Performance targets met (see prd-v1.md)

- [ ] Cross-platform testing
  - Test on macOS (primary)
  - Test on Windows (secondary, if available)
  - Test file picker works on both platforms
  - Test Gate: Works on macOS, Windows (if tested)

- [ ] Edge case testing
  - Empty timeline (button disabled)
  - Source file deleted before export (error handling)
  - Insufficient disk space (error handling)
  - Invalid output path (error handling)
  - User cancels file picker (no action)
  - Very long sequence (10+ minutes)
  - Very short clips (< 1 second)
  - Test Gate: All edge cases handled gracefully

- [ ] Definition of done checklist
  - Verify all items from prd-v1.md Section 13 (Definition of Done)
  - Verify all acceptance gates from PRD Section 12 pass
  - Test Gate: All requirements met

---

## 8. Performance

Verify targets from `prd-v1.md`.

- [ ] Export time < 5 minutes for 2-minute 1080p video
  - Test Gate: Export completes within target time

- [ ] UI remains responsive during export
  - Test Gate: User can interact with app (view library, preview clips) during export

- [ ] Progress updates every 1-2 seconds
  - Test Gate: Progress bar updates smoothly, not blocking UI

- [ ] Memory usage during export < 1.5GB
  - Test Gate: Memory monitored during testing, stays within limit

- [ ] File size output matches expectations
  - Test Gate: ~35-40MB for 1080p 1-minute video (5Mbps bitrate)

---

## 9. Acceptance Gates

Check every gate from PRD Section 12:

- [ ] All happy path gates pass
  - Export with 1 clip works
  - Export with 3 clips works
  - Trimmed clips export correctly
  - Custom save location works
  - Progress updates work
  - Success dialog appears
  - Exported file plays in QuickTime
  - Exported file plays in VLC
  - Audio synchronized
  - Export time < 5 minutes

- [ ] All mixed source format gates pass
  - Different resolutions handled
  - Different frame rates handled
  - Different aspect ratios handled
  - Letterboxing correct

- [ ] All edge case gates pass
  - Empty timeline handled
  - File not found handled
  - Disk space errors handled
  - Invalid paths handled
  - File picker cancellation handled

- [ ] All video processing gates pass
  - FFmpeg trim operations work
  - FFmpeg concat operations work
  - FFmpeg re-encoding works
  - Progress parsing works
  - Temp files cleaned up

- [ ] All performance gates pass
  - Export time within target
  - UI responsive
  - Memory usage within limit
  - Progress updates timely

- [ ] All auto-save gates pass
  - Auto-save triggers before export
  - No interference with export

---

## 10. Documentation & PR

- [ ] Add inline code comments for complex logic
  - FFmpeg command generation
  - Progress parsing
  - Error handling
  - Test Gate: Code is well-commented

- [ ] Update README if needed
  - Add export feature description
  - Add export instructions
  - Test Gate: README updated

- [ ] Create PR description (use format from agents/cody-agent-template.md)
  - Summarize feature
  - List key changes
  - Reference PRD and TODO
  - Include test results
  - Test Gate: PR description ready

- [ ] Verify with user before creating PR
  - Review PRD acceptance
  - Review implementation approach
  - Test Gate: User approves

- [ ] Open PR targeting develop branch
  - Link PRD and TODO in PR description
  - Add screenshots/video if helpful
  - Test Gate: PR created

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Electron IPC handlers implemented in main process
- [ ] React components implemented (ExportDialog, ExportProgressBar, useExport hook)
- [ ] FFmpeg export pipeline implemented (trim, concat, re-encode)
- [ ] Progress tracking implemented (parse FFmpeg stderr)
- [ ] Mixed source format handling implemented (resolution, frame rate, aspect ratio)
- [ ] Auto-save triggers before export starts
- [ ] Manual testing complete with real video files
- [ ] Exported files play correctly in external players (QuickTime, VLC)
- [ ] Performance targets met (export time < 5 minutes for 2-minute 1080p video)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] TypeScript types correct
- [ ] Documentation updated
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially (setup → service → data → UI → integration → testing)
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- Test with real video files throughout development (don't wait until end)
- FFmpeg command generation is critical - test thoroughly with various inputs
- Progress parsing may need iteration based on actual FFmpeg output format
- Temporary file cleanup is important - verify all files are deleted after export
- Export is final MVP feature - ensure it's robust and well-tested

---

## Implementation Order

**Recommended sequence** (to enable incremental testing):

1. **Setup** (Section 1) - Branch, read docs, prepare test files
2. **Data Model** (Section 3) - Types first, needed by everything else
3. **FFmpeg Pipeline** (Section 4) - Core export logic, test independently
4. **Service Layer** (Section 2) - IPC handlers, wire up FFmpeg pipeline
5. **UI Components** (Section 5) - React components, wire up IPC
6. **Integration** (Section 6) - End-to-end testing
7. **Testing** (Sections 7-9) - Comprehensive testing

This order allows testing FFmpeg pipeline independently before UI integration.

