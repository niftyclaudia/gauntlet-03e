# PR-16 TODO — Advanced Export Options

**Branch**: `feat/pr-16-advanced-export-options`  
**Source PRD**: `docs/prds/pr-16-prd.md`  
**Owner (Agent)**: Pete/Cody

---

## 0. Clarifying Questions & Assumptions

- **Questions**: None (PRD is comprehensive)
- **Assumptions (confirm in PR if needed)**:
  - Export dialog will use tabbed interface (Basic/Advanced) rather than separate modals
  - Platform presets are fixed (no user customization of presets themselves)
  - Export settings are not persisted across app sessions (default to YouTube on launch)
  - Vertical presets (Instagram, TikTok) use letterboxing, not cropping

---

## 1. Setup

- [x] Create branch `feat/pr-16-advanced-export-options` from develop
- [x] Read PRD thoroughly (`docs/prds/pr-16-prd.md`)
- [x] Read `.cursorrules` for patterns and requirements
- [x] Read `prd-v1.md` for project context and performance requirements
- [x] Confirm environment and Electron dev server work
- [x] Review existing export implementation (`src/components/ExportDialog.tsx`, `src/hooks/useExport.ts`)

---

## 2. Service Layer

Implement deterministic Electron IPC handlers and FFmpeg export logic.

- [x] Update `export:start` IPC handler in `src/main/ipcHandlers.ts` to accept optional `AdvancedExportSettings` parameter
  - Test Gate: Handler accepts custom settings, calculates ExportSettings correctly
  
- [x] Implement `validateAdvancedExportSettings` function in new `src/utils/exportValidation.ts`
  - Test Gate: Validation catches invalid bitrate, framerate, resolution upscale scenarios
  
- [x] Modify FFmpeg export pipeline in `src/main/ffmpeg.ts` to use custom settings
  - Update `calculateExportSettings` to accept optional custom settings
  - Modify `generateConcatCommand` to use custom bitrate/framerate
  - Update `generateTrimCommand` to use custom resolution/framerate for normalization
  
- [x] Test Gate: Export with custom settings produces correct resolution/bitrate/framerate (verified with ffprobe)

---

## 3. Data Model & File Operations

Define new TypeScript interfaces and update export file organization.

- [x] Add `ExportPreset` interface to `src/types/video.ts`
  - Test Gate: Interface compiles without errors
  
- [x] Add `AdvancedExportSettings` interface to `src/types/video.ts`
  - Test Gate: Interface compiles without errors
  
- [x] Define `EXPORT_PRESETS` constant array in `src/utils/exportValidation.ts` or separate constants file
  - Test Gate: Presets can be imported and used in components
  
- [x] Update export file organization to save to `exports/YYYY-MM-DD/` folder structure
  - Modify `export:showSaveDialog` handler in `src/main/ipcHandlers.ts`
  - Create export folder if it doesn't exist
  - Test Gate: Export files saved to correct folder, folder created if missing

---

## 4. UI Components

Create/modify React components per PRD Section 10.

- [x] Create `src/components/AdvancedExportDialog.tsx` with tabbed interface (Basic/Advanced)
  - Test Gate: Component renders with Basic and Advanced tabs, zero console errors
  
- [x] Create `src/components/ExportPresetButton.tsx` for platform preset selection
  - Props: preset (ExportPreset), selected (boolean), onClick handler
  - Test Gate: Button highlights when selected, calls onClick
  
- [x] Create `src/components/ExportSettingsPanel.tsx` for custom configuration
  - Resolution dropdown (720p, 1080p, 4K, Custom)
  - Bitrate slider (1-20 Mbps) with text input
  - Framerate dropdown (24, 30, 60 fps)
  - Test Gate: All controls update state correctly, values validated
  
- [x] Create `src/components/ExportValidationWarning.tsx` for warnings/errors
  - Props: warnings (string[]), errors (string[])
  - Test Gate: Warnings shown in yellow, errors in red
  
- [x] Modify `src/components/ExportDialog.tsx` to integrate Advanced tab (or replace with AdvancedExportDialog)
  - Test Gate: Dialog shows both Basic and Advanced export options
  
- [x] Update `src/hooks/useExport.ts` to support advanced settings parameter
  - Add optional `advancedSettings` parameter to `startExport` function
  - Pass settings to IPC handler
  - Test Gate: Hook accepts and passes advanced settings to export handler

---

## 5. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

- [x] Wire up AdvancedExportDialog to App.tsx
  - Replace or extend existing export button handler
  - Test Gate: Clicking export opens advanced dialog
  
- [x] Integrate preset selection with export settings
  - Clicking preset auto-fills custom settings panel
  - Switching to Custom enables manual editing
  - Test Gate: Preset selection updates all setting fields correctly
  
- [x] Integrate validation with export flow
  - Call `validateAdvancedExportSettings` before export
  - Show warnings/errors in ExportValidationWarning component
  - Disable export button if errors present
  - Test Gate: Invalid settings show errors, export disabled
  
- [x] Update FFmpeg export pipeline to use advanced settings
  - Pass settings from IPC handler to `exportVideoSequence`
  - Verify trim commands use custom resolution/framerate
  - Test Gate: Export produces correct resolution/bitrate/framerate (ffprobe verified)

---

## 6. Manual Testing

Follow manual testing protocol from `prd-v1.md`.

- [x] **Test 1: YouTube Preset Export**
  - Select YouTube preset in dialog
  - Click Export, choose save location
  - **Gate**: Output file is 1920x1080, 30fps, ~12 Mbps (verified with ffprobe)
  
- [x] **Test 2: Instagram Preset Export**
  - Select Instagram preset (vertical 4:5)
  - Export timeline with horizontal clips
  - **Gate**: Output is 1080x1350 vertical with letterboxing
  
- [x] **Test 3: TikTok Vertical Export**
  - Select TikTok preset (vertical 9:16)
  - Export and verify aspect ratio
  - **Gate**: Output is 1080x1920 vertical (9:16 aspect ratio)
  
- [x] **Test 4: Custom Resolution Export**
  - Custom: 720p, 5Mbps, 30fps
  - Export and verify settings
  - **Gate**: Output matches exact settings (720p@30fps, 5Mbps)
  
- [x] **Test 5: Twitter Preset**
  - Select Twitter preset
  - Export and verify
  - **Gate**: Output is 1920x1080, 8 Mbps, 30fps
  
- [x] **Test 6: Upscale Warning**
  - Timeline has 720p source clips
  - Request 4K (3840x2160) resolution
  - **Gate**: Warning shown, export proceeds with upscaling
  
- [x] **Test 7: Invalid Bitrate**
  - Set bitrate to 0.5 Mbps (below minimum)
  - **Gate**: Validation error shown, export button disabled
  
- [x] **Test 8: Export Folder Structure**
  - Export multiple files on same day
  - **Gate**: All files saved to `exports/YYYY-MM-DD/` folder

- [x] **Test 9: Mixed Resolution Sources**
  - Timeline has 720p + 1080p clips
  - Export with YouTube preset
  - **Gate**: Export uses letterbox to normalize, final resolution is 1080p
  
- [x] **Test 10: Export Progress**
  - Export long video (2+ minutes)
  - Monitor progress bar updates
  - **Gate**: Progress updates smoothly every 1-2 seconds

---

## 7. Performance

Verify targets from `prd-v1.md`.

- [x] **App load time < 5 seconds**
  - Test Gate: Cold start to interactive UI measured
  
- [x] **Export duration < 5 minutes for 2-minute 1080p video**
  - Test Gate: Export completes within target time
  
- [x] **Export progress bar updates smoothly**
  - Test Gate: Progress updates every 1-2 seconds without lag
  
- [x] **UI remains responsive during export**
  - Test Gate: Can still interact with app, no blocking
  
- [x] **Memory usage stable during export**
  - Test Gate: No memory leaks during long exports

---

## 8. Acceptance Gates

Check every gate from PRD Section 12:

- [x] **Happy Path Tests**
  - [x] Test 1-4: All platform presets and custom settings work correctly
  - [x] All exports produce correct resolution/bitrate/framerate (ffprobe verified)
  
- [x] **Edge Case Tests**
  - [x] Test 5-8: Upscale warnings, validation errors, export folder creation
  - [x] All error cases handled gracefully with clear messages
  
- [x] **Performance Tests**
  - [x] Test 9-10: Export duration within target, progress updates smoothly
  - [x] All performance gates pass from Section 12

---

## 9. Documentation & PR

- [x] Add inline code comments for complex logic (validation, FFmpeg settings)
- [x] Update README if needed (export features section)
- [x] Create PR description (use format from agents/cody-agent-template.md)
- [x] Verify with user before creating PR
- [x] Open PR targeting develop branch
- [x] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [x] Branch created from develop
- [x] All TODO tasks completed
- [x] Electron IPC handlers updated to accept advanced settings
- [x] React components implemented (AdvancedExportDialog, ExportPresetButton, ExportSettingsPanel, ExportValidationWarning)
- [x] Export settings validation implemented
- [x] FFmpeg export pipeline modified to use custom settings
- [x] Export file organization implemented (YYYY-MM-DD folder structure)
- [x] Manual testing complete with real video exports
- [x] All acceptance gates pass (YouTube, Instagram, TikTok, Custom presets)
- [x] Performance targets met (export duration <5 min for 2-min 1080p)
- [x] Code follows .cursorrules patterns
- [x] No console warnings
- [x] Documentation updated
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- **Testing**: All exports should be verified with `ffprobe` to confirm resolution, bitrate, and framerate match configured settings

