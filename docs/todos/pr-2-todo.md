# PR-2 TODO — Video Import & Library Management

**Branch**: `feat/pr-2-import-library`  
**Source PRD**: `docs/prds/pr-2-prd.md`  
**Owner (Agent)**: Cody (implementation) / Pete (planning)

---

## 0. Clarifying Questions & Assumptions

**Assumptions**:
- PR-1 (Application Launch) is complete and merged
- App has empty Library panel ready to populate
- FFmpeg is accessible via ffmpeg-static npm package
- macOS is primary testing platform

**Questions**:
- None (PRD is complete)

---

## 1. Setup

- [x] Create branch `feat/pr-2-import-library` from develop
- [x] Read PRD thoroughly (`docs/prds/pr-2-prd.md`)
- [x] Read `.cursorrules` for Electron/React patterns
- [x] Read `prd-v1.md` Phase 2 requirements
- [x] Verify FFmpeg installed: Check `node_modules/ffmpeg-static`
- [x] Test Electron dev server works: `npm start`
  - Test Gate: App launches with empty Library panel from PR-1

---

## 2. Data Model & Type Definitions

- [x] Create `src/types/video.ts` with VideoClip interface
  - Fields: id, path, filename, duration, thumbnail, metadata, importedAt
  - Test Gate: TypeScript compiles without errors

- [x] Add VideoMetadata interface in same file
  - Fields: width, height, framerate, codec
  - Test Gate: Types exported and importable

- [x] Update `src/renderer/types/electron.d.ts` with new IPC methods
  - Add: selectFiles(), getMetadata(), getThumbnail()
  - Test Gate: Window.electron shows new methods in IDE autocomplete

---

## 3. File System & FFmpeg Utilities (Main Process)

- [x] Create `src/main/fileSystem.ts` with temp directory setup
  - Function: ensureThumbnailDirectory() - creates ~/Library/Application Support/ollo/thumbnails/
  - Test Gate: Directory created on app launch, no errors if already exists

- [x] Create `src/main/ffmpeg.ts` for metadata extraction
  - Function: extractMetadata(filePath: string) returns VideoMetadata
  - Uses ffmpeg-static, spawns child process with `-i` flag
  - Parse stderr output for duration, width, height, framerate, codec
  - Test Gate: Run with sample MP4, returns correct metadata object

- [x] Add thumbnail generation to `src/main/ffmpeg.ts`
  - Function: generateThumbnail(filePath: string, clipId: string) returns thumbnail path
  - Command: `ffmpeg -i {input} -ss 00:00:00.1 -vframes 1 -vf scale=320:180 {output}`
  - Output to: ~/Library/Application Support/ollo/thumbnails/{clipId}.jpg
  - Test Gate: Run with sample MP4, JPEG file created at correct path

- [x] Add error handling to FFmpeg functions
  - Handle: file not found, corrupted file, FFmpeg parse failure
  - Throw descriptive errors for each case
  - Test Gate: Pass invalid file path, error thrown with clear message

---

## 4. Electron IPC Handlers (Main Process)

- [x] Create `src/main/ipcHandlers.ts` file
  - Test Gate: File created, imports ipcMain from 'electron'

- [x] Implement `file:select` IPC handler
  - Uses dialog.showOpenDialog() with filters: ['mp4', 'mov']
  - Properties: openFile, multiSelections enabled
  - Returns array of absolute file paths (or empty if cancelled)
  - Test Gate: Call from renderer, file picker opens and returns paths

- [x] Implement `file:getMetadata` IPC handler
  - Receives filePath string parameter
  - Validates file exists and is readable
  - Calls extractMetadata() from ffmpeg.ts
  - Returns VideoMetadata object
  - Test Gate: Call with valid MP4, returns metadata in < 2 seconds

- [x] Implement `file:getThumbnail` IPC handler
  - Receives filePath and clipId parameters
  - Validates file exists
  - Calls generateThumbnail() from ffmpeg.ts
  - Returns absolute path to generated thumbnail
  - Test Gate: Call with valid MP4, thumbnail created in < 1 second

- [x] Register all IPC handlers in `src/main.ts`
  - Import ipcHandlers and call registration function
  - Test Gate: Handlers accessible from renderer process

---

## 5. Preload Script (IPC Bridge)

- [x] Update `src/preload.ts` to expose new IPC methods
  - Add selectFiles() method to contextBridge
  - Add getMetadata(filePath) method
  - Add getThumbnail(filePath, clipId) method
  - Test Gate: Methods available on window.electron in renderer

---

## 6. Utility Functions (Renderer)

- [x] Create `src/utils/formatDuration.ts`
  - Function: formatDuration(seconds: number) returns "MM:SS" string
  - Example: 125 → "02:05", 65 → "01:05"
  - Handle edge cases: 0 seconds, negative (shouldn't happen)
  - Test Gate: Call with 125, returns "02:05"

- [x] Create `src/utils/fileValidation.ts`
  - Function: validateVideoFile(filePath: string) returns { valid: boolean, error?: string, warning?: string }
  - Check: file extension (.mp4 or .mov)
  - Check: file size (warn if 1GB+, error if 4GB+)
  - Test Gate: Pass .avi file, returns valid: false with error message

---

## 7. React Components - Library Clip Card

- [x] Create `src/components/LibraryClipCard.tsx`
  - Props: clip (VideoClip), onSelect callback
  - Display: thumbnail image (160x90px)
  - Display: filename below (truncate with ellipsis if > 20 chars)
  - Display: duration overlay (bottom-right, MM:SS format)
  - Test Gate: Render with mock clip data, all elements visible

- [x] Add styling to LibraryClipCard
  - Thumbnail container: 16:9 aspect ratio, 160x90px
  - Duration overlay: dark semi-transparent background (#000000 50% opacity)
  - Duration text: white, 12px, positioned bottom-right with 4px padding
  - Filename: 14px, white, text-overflow ellipsis
  - Test Gate: Inspect DOM, styles applied correctly

- [x] Add hover state to LibraryClipCard
  - On hover: slight border highlight (#0066cc)
  - Cursor: pointer
  - Test Gate: Hover over card, border appears

---

## 8. React Hook - File Import Logic

- [x] Create `src/hooks/useFileImport.ts` custom hook
  - State: isImporting (boolean), importProgress (string)
  - Function: handleFileImport(filePaths: string[])
  - Test Gate: Hook created, exports handleFileImport function

- [x] Implement file validation in useFileImport
  - Loop through filePaths
  - Call validateVideoFile() for each
  - Show error toast for invalid files
  - Filter to only valid files
  - Test Gate: Pass mix of valid/invalid files, only valid ones proceed

- [x] Implement import process in useFileImport
  - For each valid file:
    - Generate UUID for clip.id
    - Call window.electron.getMetadata(filePath)
    - Call window.electron.getThumbnail(filePath, clipId)
    - Create VideoClip object
    - Return array of imported clips
  - Test Gate: Import 3 files, returns array of 3 VideoClip objects

- [x] Add progress tracking to useFileImport
  - Update importProgress: "Importing 1 of 3..."
  - Set isImporting to true during import
  - Set isImporting to false when complete
  - Test Gate: Check importProgress updates correctly

- [x] Add error handling to useFileImport
  - Try-catch around FFmpeg calls
  - Show toast notification on error
  - Log errors to console
  - Continue with remaining files if one fails
  - Test Gate: Import corrupted file, error shown but hook doesn't crash

---

## 9. React Components - Library Panel Updates

- [x] Update `src/components/Library.tsx` to add import button
  - Add "Import Videos" button at top of panel
  - Button onClick: calls window.electron.selectFiles()
  - When files selected: pass to handleFileImport hook
  - Test Gate: Click button, file picker opens

- [x] Add drag-and-drop zone to Library.tsx
  - onDragOver: prevent default, highlight panel with dashed border
  - onDragLeave: remove highlight
  - onDrop: prevent default, extract file paths, pass to handleFileImport
  - Test Gate: Drag file over panel, border highlights

- [x] Add state management to Library.tsx
  - useState<VideoClip[]> for library array
  - Update library when import completes
  - Test Gate: Import file, library state updates with new clip

- [x] Add empty state rendering
  - If library.length === 0: show "Drag & drop video files or click Import to get started"
  - If library.length > 0: render clip cards
  - Test Gate: Empty library shows message, importing adds clips

- [x] Add loading state rendering
  - If isImporting: show spinner + "Importing [filename]..."
  - Show importProgress if available
  - Test Gate: During import, loading spinner visible

- [x] Render LibraryClipCard components
  - Map over library array
  - Render LibraryClipCard for each clip
  - Pass clip data and onSelect callback
  - Test Gate: 3 imported clips → 3 cards rendered

- [x] Add scrollable container to Library
  - Container: overflow-y auto, max-height 100%
  - Test Gate: Import 15 clips, panel scrolls smoothly

---

## 10. App State Integration

- [x] Update `src/App.tsx` to manage library state
  - Add useState<VideoClip[]> for library
  - Pass library and setLibrary to Library component as props
  - Test Gate: Library state accessible in App.tsx

- [x] Pass import handlers to Library component
  - Create handleImportComplete callback in App.tsx
  - Callback receives array of VideoClip, updates library state
  - Pass to Library component
  - Test Gate: Import completes, App.tsx library state updates

---

## 11. Styling & Visual Polish

- [x] Add drag-over highlight styles to `src/index.css`
  - Class: .library-drag-over
  - Border: 2px dashed #0066cc
  - Background: rgba(0, 102, 204, 0.1)
  - Test Gate: Apply class, highlight visible

- [x] Add toast notification styles
  - Create toast container (fixed position, top-right)
  - Error toast: red background, white text
  - Warning toast: yellow background, dark text
  - Success toast: green background, white text
  - Test Gate: Show toast, appears in top-right corner

- [x] Add loading spinner component
  - CSS animation: rotating circle
  - Center in Library panel when importing
  - Test Gate: Spinner animates smoothly

---

## 12. Integration Testing

- [x] Test drag-and-drop import end-to-end
  - Drag single MP4 from Finder to Library
  - Verify: panel highlights, import starts, clip card appears
  - Test Gate: Clip card shows correct thumbnail, filename, duration

- [x] Test file picker import end-to-end
  - Click "Import Videos" button
  - Select 2 MP4 files
  - Verify: both import, both cards appear
  - Test Gate: Both clips in library with correct data

- [x] Test multiple file import
  - Drag 3 MP4 files simultaneously
  - Verify: progress shows "1 of 3", "2 of 3", "3 of 3"
  - Verify: all 3 cards appear
  - Test Gate: Library has 3 clips, all thumbnails loaded

- [x] Test unsupported format error
  - Try to import .avi file
  - Verify: error toast appears with message
  - Verify: no clip added to library
  - Test Gate: Error message: "Unsupported format: [filename]"

- [x] Test large file warning
  - Import 1.5GB MP4 file
  - Verify: yellow warning toast appears
  - Verify: import proceeds successfully
  - Test Gate: Warning message: "Large file: [filename]..."

- [x] Test file too large error
  - Attempt to import 5GB file (or mock file size check)
  - Verify: red error toast appears
  - Verify: import blocked
  - Test Gate: Error message: "File too large..."

- [x] Test corrupted file error
  - Import corrupted MP4 file
  - Verify: FFmpeg fails gracefully
  - Verify: error toast appears, app doesn't crash
  - Test Gate: Error message: "Could not read [filename]..."

---

## 13. Manual Testing with Real Files

- [x] Prepare test video files
  - 1x small MP4 (H.264, 1080p, 30fps, < 100MB)
  - 1x medium MOV (1080p, < 500MB)
  - 1x large MP4 (1080p, 1-2GB for warning test)
  - 1x .avi file (for error test)
  - Test Gate: Files ready in test folder

- [x] Test metadata extraction accuracy
  - Import test MP4
  - Check duration matches actual video length
  - Check resolution matches (1920x1080)
  - Check framerate matches (30fps)
  - Test Gate: All metadata fields accurate to 0.1s precision

- [x] Test thumbnail quality
  - Import test videos
  - Verify thumbnails show first frame (0.1s)
  - Verify thumbnails are clear and recognizable
  - Verify aspect ratio is 16:9
  - Test Gate: Thumbnails look correct, no distortion

- [x] Test import speed
  - Import typical 1080p MP4 (500MB, 2 minutes)
  - Time metadata extraction with stopwatch
  - Time thumbnail generation
  - Test Gate: Metadata < 2 seconds, thumbnail < 1 second

- [x] Test UI responsiveness during import
  - Start importing 3 large files
  - Try clicking buttons, scrolling timeline panel
  - Verify UI remains responsive
  - Test Gate: Can interact with UI while import running

---

## 14. Performance Verification

- [x] Test memory usage with 10 clips
  - Import 10 clips (mix of 1080p and 720p)
  - Open Activity Monitor
  - Check ollo memory usage
  - Wait 15 minutes, check again
  - Test Gate: Memory < 1GB, stable over time (< 100MB variance)

- [x] Test library scrolling performance
  - Import 15+ clips
  - Scroll up and down Library panel
  - Observe smoothness
  - Test Gate: 60fps scrolling, no stuttering

- [x] Test app load time with clips
  - Import 10 clips
  - Quit and relaunch app (note: no persistence yet, but check impact)
  - Time from launch to interactive
  - Test Gate: Launch still < 5 seconds

---

## 15. Error Handling & Edge Cases

- [x] Test empty Library state
  - Fresh app launch
  - Verify empty state message visible
  - Test Gate: "Drag & drop video files or click Import to get started" shown

- [x] Test drag-and-drop with mixed file types
  - Drag 2 MP4s + 1 .txt file
  - Verify: only MP4s import, .txt ignored
  - Test Gate: 2 clips in library, no error for .txt

- [x] Test file picker cancellation
  - Click "Import Videos"
  - Click "Cancel" in picker
  - Verify: no error, app remains stable
  - Test Gate: No console errors, Library unchanged

- [x] Test importing same file twice
  - Import same MP4 twice
  - Verify: both appear in library (duplicates allowed per prd-v1.md)
  - Test Gate: 2 separate clip cards, different UUIDs

---

## 16. Cross-Platform Testing (macOS)

- [x] Test on macOS (primary platform)
  - Run all manual tests on macOS
  - Verify file picker is native (NSOpenPanel)
  - Verify drag-and-drop works from Finder
  - Test Gate: All features work on macOS

- [x] Verify temp directory on macOS
  - Check thumbnails stored at: ~/Library/Application Support/ollo/thumbnails/
  - Verify directory permissions correct
  - Test Gate: Thumbnails accessible, no permission errors

---

## 17. Code Quality & Cleanup

- [x] Review TypeScript types
  - No `any` types used
  - All interfaces properly defined
  - Proper error typing in catch blocks
  - Test Gate: No TypeScript errors, strict mode passes

- [x] Add code comments
  - Comment FFmpeg command explanations
  - Comment IPC handler purposes
  - Comment complex state logic
  - Test Gate: Code is readable and documented

- [x] Check console for warnings/errors
  - Run app in dev mode
  - Import files, check console
  - Fix any warnings or errors
  - Test Gate: Console is clean (0 errors, 0 warnings)

- [x] Remove any debug code
  - Remove console.log statements
  - Remove test data/mock values
  - Test Gate: No debug code in final version

---

## 18. Documentation

- [x] Update README with import instructions
  - Add "Importing Videos" section
  - Document drag-and-drop and file picker methods
  - List supported formats (MP4, MOV)
  - Document file size limits (warn 1GB+, block 4GB+)
  - Test Gate: README is accurate and helpful

- [x] Add inline JSDoc comments to IPC handlers
  - Document parameters, return types, errors
  - Test Gate: JSDoc appears in IDE tooltips

---

## 19. Final Acceptance Gates

Review PRD Section 12 acceptance gates:

- [x] All happy path gates pass
  - Drag-and-drop import works
  - File picker import works
  - Multiple file import works
  - Metadata and thumbnails correct

- [x] All edge case gates pass
  - Unsupported format handled
  - Large file warning shown
  - File too large blocked
  - Corrupted file handled gracefully
  - Empty library state displays

- [x] All visual/UI gates pass
  - Clip cards display correctly
  - Library scrolling smooth
  - Loading states show properly

- [x] All performance gates pass
  - Import speed < 3 seconds per file
  - UI responsiveness maintained
  - Memory < 1GB with 10 clips
  - Scrolling 60fps

- [x] All FFmpeg integration gates pass
  - Metadata parsing correct
  - Thumbnail quality good
  - Mixed formats (MP4/MOV) work

---

## 20. PR Preparation

- [x] Run final build test
  - Build production version: `npm run make`
  - Test built app (ollo.app)
  - Verify import works in built version
  - Test Gate: Built app functions identically to dev mode

- [x] Create PR description
  - Summarize changes (file import + library display)
  - List new IPC handlers
  - List new components
  - Include testing checklist
  - Link to PRD: `docs/prds/pr-2-prd.md`

- [x] Verify branch is clean
  - No uncommitted changes
  - No leftover debug files
  - Test Gate: `git status` is clean

- [x] Push branch to remote
  - Push `feat/pr-2-import-library`
  - Test Gate: Branch visible in GitHub

- [x] Create pull request targeting develop
  - Title: "PR-2: Video Import & Library Management"
  - Description: Full details with checklist
  - Request review
  - Test Gate: PR created and linked

---

## Copyable Checklist (for PR description)

```markdown
## PR-2: Video Import & Library Management

### Summary
Implements video file import via drag-and-drop and file picker, FFmpeg metadata extraction, thumbnail generation, and Library panel display with clip cards.

### Changes
- **Electron IPC Handlers**: `selectFiles()`, `getMetadata()`, `getThumbnail()`
- **FFmpeg Integration**: Metadata extraction + thumbnail generation
- **Components**: LibraryClipCard, updated Library panel
- **Hooks**: useFileImport for import logic
- **Utilities**: formatDuration, fileValidation
- **Types**: VideoClip, VideoMetadata interfaces

### Testing Checklist
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Drag-and-drop import works (single + multiple files)
- [ ] File picker import works
- [ ] FFmpeg metadata extraction accurate (< 2s per file)
- [ ] Thumbnail generation works (< 1s per file)
- [ ] Library displays clip cards with thumbnails, filenames, durations
- [ ] Error handling for unsupported formats, large files, corrupted files
- [ ] File size validation (warn 1GB+, block 4GB+)
- [ ] Empty/loading states display correctly
- [ ] Manual testing with real MP4/MOV files completed
- [ ] Performance targets met (< 1GB memory with 10 clips, 60fps scrolling)
- [ ] All acceptance gates pass (see PRD Section 12)
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings/errors
- [ ] TypeScript compiles without errors
- [ ] Documentation updated
- [ ] Built app tested and works

### Links
- PRD: `docs/prds/pr-2-prd.md`
- TODO: `docs/todos/pr-2-todo.md`
```

---

## Notes

- Each task designed to take < 30 minutes
- Test gates defined for each task
- Tasks are sequential (dependencies listed)
- FFmpeg integration is new — allow extra time for debugging
- Use real video files for testing, not mocks
- Reference `prd-v1.md` for performance requirements
- Reference `.cursorrules` for code patterns

