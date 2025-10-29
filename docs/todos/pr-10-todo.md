# PR-10 TODO — Build & Package for macOS

**Branch**: `feat/pr-10-build-package`  
**Source PRD**: `docs/prds/pr-10-prd.md`  
**Owner (Agent)**: Pete  
**Priority**: HIGH - Required for deployment and testing

---

## 0. Clarifying Questions & Assumptions

- Questions: None - requirements clear from PRD
- Assumptions (confirm in PR if needed):
  - macOS is primary target platform (as per prd-v1.md)
  - Simple text-based icon acceptable for MVP (can upgrade later)
  - DMG installer optional (ZIP sufficient for testing)
  - Code signing not required for MVP/testing phase

---

## 1. Setup

- [ ] Create branch `feat/pr-10-build-package` from current branch (feat/pr-8-export)
- [ ] Read PRD thoroughly (`docs/prds/pr-10-prd.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context (especially Phase 10 section)
- [ ] Verify current dev mode works: `npm start` launches app successfully
- [ ] Verify existing build scripts in package.json (`npm run make`, `npm run package`)

---

## 2. Electron Forge Configuration

Configure Electron Forge for macOS packaging.

- [ ] Review current `forge.config.ts` configuration
  - Test Gate: Understand existing Vite plugin, Fuses plugin setup
  - ⚠️ **CRITICAL**: Note that `plugin-auto-unpack-natives` is installed in package.json but NOT configured in forge.config.ts - must add this!
- [ ] **CRITICAL**: Add `AutoUnpackNativesPlugin` to plugins array in `forge.config.ts`
  - Import: `import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';`
  - Add to plugins array (this is required for FFmpeg binary bundling!)
  - Test Gate: Plugin imported and added to plugins array
- [ ] Add packagerConfig for macOS in `forge.config.ts`
  - Configure app name, bundle identifier (e.g., `com.ollo.app`), macOS-specific settings
  - Test Gate: macOS packagerConfig added with proper bundle identifier
- [ ] Configure macOS makers (DMG and/or ZIP) in `forge.config.ts`
  - MakerZIP already configured for darwin - verify it works
  - Optionally add MakerDMG for DMG creation (not required but nice to have)
  - Test Gate: Makers configured correctly for macOS
- [ ] Add app icon configuration to packagerConfig
  - Test Gate: Icon path specified (create icon asset next)

---

## 3. App Icon Creation

Create simple app icon for macOS.

- [ ] Create `assets/` directory if it doesn't exist
- [ ] Create simple app icon asset (text-based "ollo" or minimal design)
  - Options: 
    - Create `assets/icon.png` (512x512px) - Electron Forge can convert to .icns
    - Or generate .icns file directly if tool available
  - Test Gate: Icon file exists at configured path
- [ ] Reference icon in `forge.config.ts` packagerConfig
  - Test Gate: Icon path correctly specified in config

---

## 4. FFmpeg Binary Bundling Verification

Ensure FFmpeg binary is properly bundled and accessible.

- [ ] Review `src/main/ffmpeg.ts` FFmpeg path resolution logic
  - Test Gate: Understand how `app.asar.unpacked` replacement works (already implemented at line 16)
- [ ] **VERIFIED**: `@electron-forge/plugin-auto-unpack-natives` is in package.json devDependencies ✅
  - ⚠️ **CRITICAL**: Must ensure it's added to forge.config.ts plugins array (see Section 2)
- [ ] Test FFmpeg path resolution in dev mode (should still work)
  - Test Gate: Video import/extraction works in dev mode
- [ ] After adding AutoUnpackNativesPlugin, test first build to verify FFmpeg bundles correctly
  - Test Gate: FFmpeg binary exists in app.asar.unpacked after build
- [ ] Add logging/error handling if FFmpeg path resolution fails in packaged app
  - Test Gate: Clear error message if FFmpeg not found

---

## 5. Build Process

Set up and test the build process.

- [ ] Run initial build: `npm run make` (expect potential errors)
  - Test Gate: Build command executes, any errors are logged
- [ ] Fix any build configuration errors (icon paths, maker config, etc.)
  - Test Gate: Build completes without errors
- [ ] Verify build output structure in `out/make/` directory
  - Test Gate: .app bundle or DMG/ZIP file exists in output directory
- [ ] Check bundle size (target < 200MB)
  - Test Gate: Bundle size is reasonable, note actual size

---

## 6. Package Structure Verification

Verify the packaged app structure is correct.

- [ ] Inspect built .app bundle structure (right-click > Show Package Contents)
  - Test Gate: Standard macOS .app bundle structure (Contents/Resources, Contents/MacOS, etc.)
- [ ] Verify FFmpeg binary location in app.asar.unpacked
  - Test Gate: FFmpeg binary exists in expected location within .app bundle
- [ ] Verify app.asar contains application code
  - Test Gate: Main application files are in app.asar
- [ ] Check for any missing dependencies or broken paths
  - Test Gate: No obvious missing files or resources

---

## 7. Launch Testing

Test that the built app launches correctly.

- [ ] Double-click built .app bundle to launch
  - Test Gate: App launches, window appears, no immediate crashes
- [ ] Verify app window appears and UI renders
  - Test Gate: All UI components visible, layout correct
- [ ] Check console for errors (open with Cmd+Option+I if needed)
  - Test Gate: No blocking errors in console, note any warnings
- [ ] Measure app launch time (target < 5 seconds)
  - Test Gate: Launch time recorded, meets performance target

---

## 8. Functionality Testing in Packaged App

Test all core functionality in the built app.

- [ ] Test video import via drag & drop
  - Test Gate: Video files can be dropped, clips appear in library
- [ ] Test video import via file picker button
  - Test Gate: File picker opens, selected videos imported successfully
- [ ] Test metadata extraction (verify FFmpeg works)
  - Test Gate: Video metadata (duration, resolution) extracted correctly
- [ ] Test thumbnail generation
  - Test Gate: Thumbnails appear in library clips
- [ ] Test drag clip from library to timeline
  - Test Gate: Clip added to timeline, appears in correct position
- [ ] Test clip reordering on timeline
  - Test Gate: Clips can be dragged horizontally to reorder
- [ ] Test trim operations
  - Test Gate: Trim handles work, preview updates, trim data saved
- [ ] Test video preview playback
  - Test Gate: Preview plays correctly, playhead moves, controls work
- [ ] Test sequence preview (full timeline)
  - Test Gate: Entire sequence previews correctly with all clips

---

## 9. Export Testing in Packaged App

Test video export functionality in built app.

- [ ] Test export button opens file save dialog
  - Test Gate: Native save dialog appears, default filename suggested
- [ ] Test export process with timeline clips
  - Test Gate: Export progress shows, completes without errors
- [ ] Verify exported MP4 file is created at chosen location
  - Test Gate: MP4 file exists, file size reasonable (> 0 bytes)
- [ ] Test export with trimmed clips
  - Test Gate: Export applies trim points correctly
- [ ] Test export with multiple clips in sequence
  - Test Gate: All clips concatenated in correct order

---

## 10. External Player Validation

Verify exported videos work in external players.

- [ ] Open exported MP4 in QuickTime Player
  - Test Gate: Video plays, audio present, no playback errors
- [ ] Verify audio synchronization
  - Test Gate: Audio matches video, no delay or sync issues
- [ ] Verify trim points applied correctly
  - Test Gate: Exported video duration matches expected trimmed length
- [ ] Verify resolution and quality
  - Test Gate: Resolution correct (matches source or converted as expected)
- [ ] Test exported video in VLC (or another player)
  - Test Gate: Video plays correctly in multiple players
- [ ] Test exported video with different source formats
  - Test Gate: MP4 and MOV sources both export correctly

---

## 11. Edge Cases & Error Handling

Test edge cases and error scenarios.

- [ ] Test with large video files (500MB+)
  - Test Gate: Import and export work with large files, no crashes
- [ ] Test auto-save functionality in packaged app
  - Test Gate: Project state saves to app data directory
- [ ] Test session restore on app restart
  - Test Gate: Previous session restores (library, timeline, clips)
- [ ] Test file system permissions
  - Test Gate: Thumbnail cache directory writable, auto-save works
- [ ] Test with missing or corrupted video files
  - Test Gate: Graceful error handling, user-friendly error messages
- [ ] Test app behavior with no video files imported
  - Test Gate: Empty state displays correctly, no errors

---

## 12. Performance Validation

Verify performance targets are met in packaged app.

- [ ] Measure app launch time
  - Test Gate: < 5 seconds from double-click to interactive UI
- [ ] Test timeline UI responsiveness
  - Test Gate: Drag operations < 50ms response time
- [ ] Test video playback smoothness
  - Test Gate: 30fps minimum playback (1080p H.264 content)
- [ ] Test timeline scrolling with 10+ clips
  - Test Gate: Smooth 60fps scrolling
- [ ] Monitor memory usage during testing
  - Test Gate: < 1GB RAM with 10 clips, < 100MB variance over 15min

---

## 13. Build Artifacts & Distribution

Prepare build artifacts for distribution.

- [ ] Verify DMG file (if configured) mounts correctly
  - Test Gate: DMG file opens, .app bundle can be dragged to Applications
- [ ] Verify ZIP file (if configured) extracts correctly
  - Test Gate: ZIP extracts cleanly, .app bundle launches
- [ ] Document build process in README or separate BUILD.md
  - Test Gate: Build instructions clear and complete
- [ ] Note bundle size and build time for reference
  - Test Gate: Metrics documented

---

## 14. Acceptance Gates

Check every gate from PRD Section 12:

**Happy Path:**
- [ ] Gate: `npm run make` produces .app bundle without errors
- [ ] Gate: Double-click .app launches and window appears in < 5 seconds
- [ ] Gate: Video import works, metadata extracted successfully
- [ ] Gate: Export completes, MP4 file created
- [ ] Gate: Exported MP4 plays in QuickTime/VLC with synchronized audio, trim points correct
- [ ] Gate: FFmpeg accessible at runtime (no "ffmpeg not found" errors)

**Edge Cases:**
- [ ] Gate: FFmpeg binary accessible in packaged app
- [ ] Gate: App data directory writable, auto-save works
- [ ] Gate: Large video files process correctly
- [ ] Gate: App bundle structure correct, no missing files

**Video Processing:**
- [ ] Gate: FFmpeg operations complete in packaged app
- [ ] Gate: Performance targets met (launch < 5s, timeline responsive, playback smooth)

**Performance:**
- [ ] Gate: App launch < 5 seconds
- [ ] Gate: Bundle size < 200MB (or reasonable size noted)

---

## 15. Documentation & PR

- [ ] Add inline code comments for build configuration (if needed)
- [ ] Update README.md with build instructions
  - Test Gate: README includes `npm run make` instructions
- [ ] Document any build-time considerations or known issues
  - Test Gate: Build documentation complete
- [ ] Create PR description (use format from agents/cody-agent-template.md)
  - Include: Summary, changes, testing performed, build artifacts location
- [ ] Link PRD and TODO in PR description
- [ ] Verify with user before creating PR (if YOLO: false)
- [ ] Open PR targeting current branch or develop (as appropriate)

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from feat/pr-8-export
- [ ] All TODO tasks completed
- [ ] Electron Forge configured for macOS packaging
- [ ] App icon created and configured
- [ ] FFmpeg binary properly bundled in app.asar.unpacked
- [ ] `npm run make` produces valid .app bundle
- [ ] Built app launches successfully (double-click works)
- [ ] All functionality tested in built app (import, timeline, preview, export)
- [ ] Exported videos tested in external players (QuickTime, VLC)
- [ ] All acceptance gates pass
- [ ] Performance targets met (app launch < 5s)
- [ ] Build process documented
- [ ] No blocking console errors in packaged app
```

---

## Notes

- **Priority**: This PR is prioritized over PR-9 (Polish & Testing) for deployment readiness
- Break tasks into <30 min chunks
- Complete tasks sequentially
- Test early and often - don't wait until the end to test built app
- FFmpeg bundling is critical - verify it works immediately after first build
- If build fails, fix incrementally rather than changing multiple things at once
- Reference `prd-v1.md` and `.cursorrules` for patterns and requirements
- Document any build issues or workarounds discovered

## Build Command Reference

- `npm run make` - Build and package for current platform
- `npm run package` - Package without creating distributable (faster for testing)
- `npm start` - Development mode (for comparison testing)

