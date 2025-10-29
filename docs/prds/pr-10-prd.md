# PRD: Build & Package for macOS

**Feature**: Build & Package

**Version**: 1.0

**Status**: Draft

**Agent**: Pete

**Target Release**: MVP Phase 10 (Prioritized over Phase 9)

**Priority**: HIGH - Required for deployment and testing

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md) | [pr-3-prd.md](./pr-3-prd.md) | [pr-4-prd.md](./pr-4-prd.md) | [pr-5-prd.md](./pr-5-prd.md) | [pr-6-prd.md](./pr-6-prd.md) | [pr-7-prd.md](./pr-7-prd.md) | [pr-8-prd.md](./pr-8-prd.md)

---

## 1. Summary

Enable building and packaging the ollo desktop video editor as a native macOS application (.app bundle) that can be launched, tested, and distributed. The packaged app bundles FFmpeg binary correctly, includes a simple app icon, and functions identically to dev mode. This is critical for deployment and end-to-end testing in a production-like environment.

---

## 2. Problem & Goals

**Problem**: The application currently only runs in development mode (`npm start`). Without proper packaging, it cannot be tested as a standalone application, distributed to users, or validated that all functionality works in a production environment. FFmpeg binary may not be bundled correctly, app icon is missing, and there's no way to verify the app works outside dev mode.

**Why now**: This is Phase 10 and is prioritized over Phase 9 (Polish & Testing) because the team needs to build, deploy, and test ASAP. End-to-end testing requires a packaged application. Without a built app, we cannot verify that:
- FFmpeg binary is properly bundled and accessible
- All Electron IPC handlers work in packaged mode
- Auto-save and file system operations work correctly
- Video export produces playable files outside the app
- The app launches and runs independently

**Goals** (ordered, measurable):
  - [ ] G1 — Configure Electron Forge for macOS packaging with proper maker settings (DMG and ZIP formats)
  - [ ] G2 — Ensure FFmpeg binary from `ffmpeg-static` is properly bundled in app.asar.unpacked directory so it's accessible at runtime
  - [ ] G3 — Create simple app icon (lowercase "ollo" text) and configure it in packager config
  - [ ] G4 — Verify `npm run make` produces a valid .app bundle that launches on macOS
  - [ ] G5 — Test built app: app launches successfully, window appears, all UI renders correctly
  - [ ] G6 — Test built app: video import works (drag & drop, file picker), metadata extraction succeeds
  - [ ] G7 — Test built app: timeline operations work (drag clips, reorder, trim), preview playback works
  - [ ] G8 — Test built app: export completes successfully, produces valid MP4 file that plays in external players (QuickTime, VLC)
  - [ ] G9 — Verify exported videos from built app work correctly (audio synchronized, correct trim points applied)

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing code signing or notarization (development/testing build only)
- [ ] Not creating app store distribution package (only local .app bundle)
- [ ] Not implementing auto-update mechanism (out of scope for MVP)
- [ ] Not creating installer (.pkg or .dmg installer with custom UI) - basic DMG is acceptable
- [ ] Not implementing universal binary (Apple Silicon + Intel) - platform-specific builds acceptable
- [ ] Not bundling dependencies that aren't required (keep bundle size reasonable)
- [ ] Not implementing Windows build configuration (macOS only for MVP)
- [ ] Not adding elaborate app icon design (simple text-based icon sufficient)

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:

**User-visible:**
- App launches from Finder (double-click .app) in < 5 seconds
- All functionality works identically to dev mode
- Exported videos play correctly in external players

**System:**
- Built app bundle size: < 200MB (includes Electron + FFmpeg + dependencies)
- App launch performance: < 5 seconds from double-click to interactive UI (see prd-v1.md)
- FFmpeg binary accessible and functional in packaged app

**Quality:**
- 0 blocking bugs preventing app launch
- All acceptance gates pass
- Exported videos are valid MP4 files with synchronized audio
- No console errors in packaged app (or errors are non-blocking)

---

## 5. Users & Stories

- As a developer, I want to build the app so that I can test it in a production-like environment
- As a developer, I want the app to be properly packaged so that I can distribute it for testing
- As a developer, I want FFmpeg bundled correctly so that all video operations work in the packaged app
- As a user, I want the app to launch from Finder so that I can use it without running terminal commands
- As a user, I want exported videos to play in external players so that I can share and use my edited videos

---

## 6. Experience Specification (UX)

**Entry points and flows:**
- Double-click .app bundle in Finder → app launches, window appears
- Or launch from terminal: `open ollo.app`
- App behavior identical to dev mode (no visible differences)

**Visual behavior:**
- App icon appears in Dock and Finder (lowercase "ollo" text)
- Window appears with same layout as dev mode
- All UI components render correctly
- Loading states work as expected

**Loading/disabled/error states:**
- App launch shows native macOS app startup (spinning beach ball briefly acceptable)
- If FFmpeg missing: error message in console/UI (should not happen with proper bundling)
- If bundled incorrectly: app may fail to launch (test and fix)

**Performance:**
- App launch: < 5 seconds from double-click to interactive UI (see prd-v1.md)
- All other performance targets from prd-v1.md remain same (timeline UI responsive, video playback smooth)

---

## 7. Functional Requirements (Must/Should)

**MUST:**
- Configure Electron Forge packagerConfig for macOS with proper app bundle name
- Configure Electron Forge makers to produce DMG and ZIP for macOS
- Ensure FFmpeg binary from `ffmpeg-static` is placed in app.asar.unpacked directory
- Create app icon (simple text-based "ollo" icon) and reference in packagerConfig
- Built app launches successfully (no crashes on startup)
- All Electron IPC handlers work in packaged app
- Video import works (drag & drop and file picker both function)
- Video metadata extraction works (FFmpeg accessible and functional)
- Timeline operations work (drag clips, reorder, trim)
- Video preview playback works (HTML5 video element functions)
- Video export works and produces valid MP4 files
- Exported MP4 files play correctly in external players with synchronized audio

**SHOULD:**
- App bundle has reasonable size (< 200MB including FFmpeg)
- DMG file is properly formatted and mounts correctly
- ZIP file extracts cleanly and .app launches

**Acceptance gates per requirement:**
- [Gate] When developer runs `npm run make` → produces .app bundle without errors
- [Gate] When user double-clicks .app → app launches and window appears in < 5 seconds
- [Gate] When user imports video in built app → metadata extracted successfully, clip appears in library
- [Gate] When user exports video in built app → export completes, MP4 file created
- [Gate] When user opens exported MP4 in QuickTime/VLC → video plays with synchronized audio, trim points correct
- [Gate] When FFmpeg needed in built app → binary accessible at runtime (no "ffmpeg not found" errors)

---

## 8. Data Model

No new data model changes. Existing data structures remain:
- VideoClip, TimelineClip, VideoMetadata types unchanged
- Project state structure unchanged
- File paths remain absolute paths to video files

**Special considerations:**
- FFmpeg binary path needs to resolve correctly in packaged app (use `app.asar.unpacked` pattern)
- Thumbnail cache directory needs to be writable in packaged app
- Auto-save project state location needs to be accessible in packaged app

---

## 9. API / Service Contracts

No new Electron IPC handlers required. Existing handlers must work in packaged app:

```typescript
// All existing IPC handlers must function identically:
window.electron.extractVideoMetadata(filePath: string): Promise<VideoMetadata>
window.electron.generateThumbnail(filePath: string): Promise<string>
window.electron.exportVideo(clips: TimelineClip[], outputPath: string): Promise<void>
window.electron.openFileDialog(): Promise<string[]>
window.electron.saveFileDialog(defaultPath: string): Promise<string | null>
```

**FFmpeg binary path resolution:**
- In dev mode: `ffmpegStatic` resolves to node_modules path
- In packaged app: `ffmpegPath.replace('app.asar', 'app.asar.unpacked')` ensures binary is accessible
- Verify this pattern works in both environments

---

## 10. UI Components to Create/Modify

**Files to modify:**
- `forge.config.ts` — Add macOS packagerConfig, icon configuration, maker settings
- `src/main/ffmpeg.ts` — Verify FFmpeg path resolution works in packaged app (may already be correct)
- `package.json` — Add app icon asset path, verify build scripts

**Files to create:**
- `assets/icon.icns` or `assets/icon.png` — Simple app icon (lowercase "ollo" text)
  - Or use text-based icon generation if no design tool available
  - Electron Forge can generate .icns from .png if needed

**No new React components required** — all UI works as-is in packaged app

---

## 11. Integration Points

**Electron Forge:**
- Packager configuration for macOS app bundle structure (needs to be added)
- Maker configuration for DMG and ZIP output formats (MakerZIP exists for darwin, MakerDMG optional)
- Vite plugin integration (already configured ✅)
- Fuses plugin for security settings (already configured ✅)
- **⚠️ CRITICAL**: `AutoUnpackNativesPlugin` must be added to plugins array (installed in package.json but not configured)

**FFmpeg bundling:**
- `@electron-forge/plugin-auto-unpack-natives` installed in package.json but NOT configured in forge.config.ts - **MUST ADD THIS**
- `ffmpeg-static` package provides binary (already in dependencies ✅)
- Binary must be in app.asar.unpacked for accessibility
- Path resolution already implemented in `src/main/ffmpeg.ts` (line 16) ✅

**File system:**
- App data directory (for auto-save, thumbnails) must be writable in packaged app
- Video file paths remain absolute (user-selected files)
- Export output path user-selected

**macOS platform:**
- App bundle structure follows macOS conventions
- Info.plist configuration (Electron Forge handles this)
- Icon set configuration

---

## 12. Test Plan & Acceptance Gates

Define BEFORE implementation. Use checkboxes.

**Happy Path:**
- [ ] Run `npm run make` command → completes successfully without errors
  - Gate: Build produces `.app` bundle in `out/` directory
- [ ] Double-click built .app → app launches successfully
  - Gate: Window appears, UI renders, no console errors
- [ ] Import video file in built app → works correctly
  - Gate: Clip appears in library, metadata extracted, thumbnail generated
- [ ] Drag clip to timeline, trim, preview → all operations work
  - Gate: Timeline updates, preview plays, trim handles function
- [ ] Export video in built app → completes successfully
  - Gate: MP4 file created at chosen location, export progress shows
- [ ] Open exported MP4 in external player → plays correctly
  - Gate: Video plays, audio synchronized, trim points correct, resolution correct

**Edge Cases:**
- [ ] FFmpeg binary accessible in packaged app → no "not found" errors
  - Gate: Video operations (import, export) work without FFmpeg errors
- [ ] App data directory writable → auto-save works, thumbnails saved
  - Gate: Project state persists, thumbnails appear after restart
- [ ] Large video files imported and exported → works without crashing
  - Gate: 500MB+ video files process correctly
- [ ] App bundle structure correct → no missing files or broken paths
  - Gate: All resources load, no 404 errors in console

**Video Processing:**
- [ ] FFmpeg operations complete in packaged app
  - Gate: Metadata extraction, thumbnail generation, export all succeed
- [ ] Performance targets met (see prd-v1.md)
  - Gate: App launch < 5s, timeline responsive, playback smooth 30fps

**Performance:**
- [ ] App load time < 5 seconds
  - Gate: Measured from double-click to interactive UI
- [ ] Bundle size reasonable
  - Gate: .app bundle < 200MB total

**Cross-platform:**
- [ ] macOS (Apple Silicon) → built app launches and functions
- [ ] macOS (Intel) → built app launches and functions (if possible with same build)

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:
- [ ] Electron Forge configured for macOS packaging
- [ ] App icon created and configured
- [ ] FFmpeg binary properly bundled in app.asar.unpacked
- [ ] `npm run make` produces valid .app bundle
- [ ] Built app launches successfully (double-click works)
- [ ] All functionality tested in built app (import, timeline, preview, export)
- [ ] Exported videos tested in external players (QuickTime, VLC)
- [ ] All acceptance gates pass
- [ ] Build process documented
- [ ] No console errors in packaged app (or errors are documented and acceptable)

---

## 14. Risks & Mitigations

**Risk:** FFmpeg binary not accessible in packaged app → **Mitigation:** ⚠️ **CRITICAL** - Must add `AutoUnpackNativesPlugin` to forge.config.ts plugins array (currently installed but not configured). Path resolution already implemented in ffmpeg.ts, but plugin must be active to unpack the binary correctly. Test early after adding plugin.

**Risk:** App bundle too large (> 200MB) → **Mitigation:** Monitor bundle size, exclude unnecessary dependencies, consider code splitting if needed

**Risk:** App fails to launch in packaged mode → **Mitigation:** Test immediately after first build, check console for errors, verify all paths are relative/resolved correctly

**Risk:** Exported videos don't play in external players → **Mitigation:** Test with multiple players (QuickTime, VLC), verify codec settings match prd-v1.md specs, test audio sync

**Risk:** Auto-save or file system operations fail in packaged app → **Mitigation:** Test file system paths, ensure app data directory is writable, verify permissions

**Risk:** Icon not showing correctly → **Mitigation:** Use proper .icns format or let Electron Forge convert PNG, test on clean system

---

## 15. Rollout & Telemetry

**Feature flag?** No — this is build infrastructure, not a user-facing feature

**Metrics:**
- Build time (should be reasonable, < 2 minutes)
- Bundle size (target < 200MB)
- App launch time (target < 5 seconds)
- Export functionality success rate in built app

**Manual validation steps:**
1. Run `npm run make`
2. Locate .app bundle in `out/make/`
3. Double-click to launch
4. Perform full workflow: import → timeline → trim → preview → export
5. Open exported MP4 in external player
6. Verify audio sync and trim points

---

## 16. Open Questions

- Q1: Should we create DMG installer or just ZIP? → Start with ZIP (simpler), add DMG if needed
- Q2: Universal binary (Apple Silicon + Intel) or platform-specific? → Start with current platform, add universal later if needed
- Q3: Icon design - text-based or image? → Simple text-based icon for MVP, upgrade later
- Q4: Code signing required for testing? → No, not for MVP/testing phase

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Code signing and notarization for distribution
- [ ] App store packaging and submission
- [ ] Auto-update mechanism
- [ ] Universal binary (Apple Silicon + Intel in one bundle)
- [ ] Windows build configuration
- [ ] Custom DMG installer with drag-to-install UI
- [ ] Professional app icon design
- [ ] App bundle optimization (smaller size)

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?** User can build app with `npm run make`, launch built .app, and export a video that plays in external players

2. **Primary user and critical action?** Developer needs to build and test packaged app; action is running build command and launching built app

3. **Must-have vs nice-to-have?** Must-have: build works, app launches, export works. Nice-to-have: DMG installer, optimized bundle size

4. **Video processing requirements?** FFmpeg must be accessible and functional in packaged app - this is critical

5. **Performance constraints?** App launch < 5s, bundle size < 200MB, all other targets from prd-v1.md apply

6. **Error/edge cases to handle?** FFmpeg not found, app fails to launch, exported videos don't play, file system permissions

7. **Data model changes?** None - existing structures work as-is

8. **Electron IPC handlers required?** None new - existing handlers must work in packaged mode

9. **UI entry points and states?** Same as dev mode - no differences

10. **File system implications?** App data directory must be writable, FFmpeg binary must be accessible, user file paths remain absolute

11. **Dependencies or blocking integrations?** Electron Forge packaging, FFmpeg bundling via auto-unpack-natives plugin

12. **Rollout strategy and metrics?** Build locally, test immediately, iterate if issues found

13. **What is explicitly out of scope?** Code signing, app store, auto-update, Windows build, universal binary, custom installer UI

---

## Authoring Notes

- This PR is prioritized over PR 9 (Polish & Testing) for deployment readiness
- Focus on getting build working and basic functionality verified
- FFmpeg bundling is critical - test early and often
- Simple icon sufficient for MVP - can upgrade later
- Test full workflow in built app to catch any packaged-mode issues
- Reference `prd-v1.md` and `.cursorrules` for patterns and requirements

