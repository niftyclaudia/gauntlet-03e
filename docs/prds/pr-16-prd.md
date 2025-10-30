# PRD: Advanced Export Options

**Feature**: Advanced Export Options

**Version**: 1.0

**Status**: Ready for Development

**Agent**: Pete

**Target Release**: Sprint 16

**Links**: [TODO], [Designs], [Tracking Issue]

---

## 1. Summary

Advanced Export Options enables users to export their video projects at different resolutions, bitrates, framerates, and platform-optimized presets (YouTube, Instagram, TikTok, etc.). Users can configure custom export settings or choose from predefined presets for streamlined publishing workflows.

**Key Outcome**: User selects export preset or custom settings → export dialog shows configuration options → video exported at specified quality → file saved with correct encoding parameters verified.

---

## 2. Problem & Goals

- **What video editing problem are we solving?** Content creators need to export videos optimized for different platforms (YouTube vs Instagram vs TikTok), but the current export only uses fixed settings. Users must manually re-encode files or use external tools, creating workflow friction.
- **Why now?** MVP export (PR-6) is complete with fixed settings. Advanced export is a natural enhancement to enable multi-platform publishing workflows and is a required feature for Phase 6.
- **Goals (ordered, measurable):**
  - [x] G1 — Provide platform presets (YouTube, Instagram, TikTok) with one-click export
  - [x] G2 — Enable custom resolution, bitrate, and framerate configuration
  - [x] G3 — Validate export settings and warn about unsupported configurations

---

## 3. Non-Goals / Out of Scope

**Intentionally Excluded:**
- ❌ **Custom codec selection**: Always H.264/AAC (MP4 format)
- ❌ **Batch export**: Export multiple timelines with different settings (single export only)
- ❌ **Export to cloud**: Local file system only (no upload to YouTube/Instagram)
- ❌ **Video upscaling**: Warn if requested resolution exceeds source (no AI upscale)
- ❌ **Custom aspect ratios**: Letterbox only (no crop or distort)
- ❌ **Export queue**: Process multiple exports sequentially
- ❌ **Export templates**: Save custom preset configurations (future feature)
- ❌ **Audio-only export**: Video clips only (no audio extraction)

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- **User-visible**: Export completes with custom settings in <5 minutes for 2-minute 1080p video
- **System**: [See performance requirements in prd-v1.md]
  - Export duration: <5 minutes for 2-minute 1080p video
  - File size matches expected bitrate (within 10% tolerance)
  - Resolution/bitrate verified with ffprobe after export
  - Timeline UI responsive during export (progress bar updates smoothly)
- **Quality**: [0 blocking bugs, all gates pass, crash-free >99%]

---

## 5. Users & Stories

- As a **content creator**, I want to export my video at different resolutions so that I can optimize for multiple platforms without external tools.
- As a **YouTuber**, I want a YouTube preset so that I can export with optimal settings for YouTube upload.
- As a **social media creator**, I want Instagram and TikTok presets so that I can create platform-specific exports quickly.

---

## 6. Experience Specification (UX)

### Entry Points and Flows

1. **Export Button**: Opens export dialog with advanced options tab
2. **Platform Presets**: Quick-select buttons for YouTube, Instagram, TikTok, Custom

### Happy Path Flow

```
User clicks "Export" button
  ↓
[Export Dialog Opens] - Shows "Advanced Options" tab
  ↓
[User selects preset OR custom settings]
  - YouTube: 1080p@30fps, 12Mbps, H.264
  - Instagram: 1080x1350, 5Mbps, H.264 (vertical)
  - TikTok: 1080x1920, 5Mbps, H.264 (vertical)
  - Custom: User sets resolution, bitrate, framerate
  ↓
[User clicks "Export"]
  ↓
[Save Dialog] - Default filename with timestamp
  ↓
[Export Progress] - Progress bar shows encoding status
  ↓
[Export Complete] - File saved, "Reveal in Finder" dialog
```

### Visual Behavior

- Export dialog has two tabs: "Basic" and "Advanced Options"
- Platform preset buttons (YouTube, Instagram, TikTok, Twitter, Custom)
- Custom settings panel: resolution dropdown, bitrate slider, framerate dropdown
- Validation warnings for unsupported configurations
- Export progress bar with estimated time remaining

### States

| State | Appearance | Actions | Notes |
|-------|-----------|---------|-------|
| **Dialog Open** | Export dialog with tabs | Select preset or custom | Ready to configure |
| **Preset Selected** | Preset highlight, values auto-filled | Edit if needed, click Export | Configuration locked |
| **Custom Mode** | Manual settings visible | Adjust resolution/bitrate/framerate | Free configuration |
| **Invalid Config** | Warning message shown | Adjust settings | Cannot export yet |
| **Exporting** | Progress bar, cancel button | Wait for completion | Background processing |

---

## 7. Functional Requirements (Must/Should)

### MUST (Core Export Configuration)

**REQ-1: Export Settings Configuration**
- Export dialog displays "Advanced Options" tab alongside "Basic" (current default export)
- Preset selection: YouTube, Instagram, TikTok, Twitter, Custom
- Custom settings panel shows:
  - Resolution: dropdown with presets (720p, 1080p, 4K) + custom input
  - Bitrate: slider (1-20 Mbps) + text input
  - Framerate: dropdown (24, 30, 60 fps)
- Preset values auto-populate settings (read-only until Custom selected)
- Custom mode allows manual adjustment of all settings

**REQ-2: Platform Presets**
- **YouTube Preset**:
  - Resolution: 1920x1080 (1080p)
  - Bitrate: 12 Mbps
  - Framerate: 30 fps
  - Format: MP4, H.264/AAC
- **Instagram Preset**:
  - Resolution: 1080x1350 (vertical 4:5)
  - Bitrate: 5 Mbps
  - Framerate: 30 fps
  - Format: MP4, H.264/AAC
- **TikTok Preset**:
  - Resolution: 1080x1920 (vertical 9:16)
  - Bitrate: 5 Mbps
  - Framerate: 30 fps
  - Format: MP4, H.264/AAC
- **Twitter Preset**:
  - Resolution: 1920x1080 (1080p)
  - Bitrate: 8 Mbps
  - Framerate: 30 fps
  - Format: MP4, H.264/AAC

**REQ-3: Export Settings Validation**
- Resolution cannot exceed source clip dimensions (warn if upscale requested)
- Minimum resolution: 480x270 (lowest supported)
- Maximum resolution: 3840x2160 (4K) - only if supported by hardware
- Bitrate range: 1-20 Mbps (enforce bounds)
- Framerate: 24, 30, or 60 fps only (no arbitrary values)
- Validation message shows what's invalid and how to fix

**REQ-4: Export File Organization**
- Export files saved to `exports/YYYY-MM-DD/` folder (relative to user data directory)
- Filename format: `ollo_[preset]_YYYYMMDD_HHMMSS.mp4` (e.g., `ollo_youtube_20241201_143025.mp4`)
- Allow user to override default filename in save dialog
- Create export folder if it doesn't exist

### SHOULD (Nice-to-Have Enhancements)

**REQ-5: Export Preview** (Post-MVP)
- Show estimated file size based on settings
- Display estimated export time
- Show source vs output resolution comparison

**REQ-6: Export History** (Post-MVP)
- Keep list of recent exports with settings
- Quick re-export with same settings

### Acceptance Gates

| Scenario | Input | Expected Output | Pass Criteria |
|----------|-------|-----------------|---------------|
| **Happy Path 1: YouTube Preset** | Select YouTube → Export | 1080p@30fps, 12Mbps MP4 | Resolution/bitrate verified with ffprobe |
| **Happy Path 2: Custom 720p** | Custom: 720p, 5Mbps, 30fps → Export | 720p@30fps, 5Mbps MP4 | Settings match configured values |
| **Happy Path 3: Vertical Instagram** | Select Instagram → Export | 1080x1350 vertical MP4 | 4:5 aspect ratio verified |
| **Edge Case 1: Upscale Warning** | Request 4K when source is 720p | Warning shown, allow or adjust | User can proceed or change settings |
| **Edge Case 2: Invalid Bitrate** | Set bitrate to 0.5 Mbps | Validation error, export disabled | Clear error message shown |
| **Edge Case 3: Export Folder** | First export in session | `exports/YYYY-MM-DD/` created | Folder exists, file saved inside |

---

## 8. Data Model

### New Interface

```typescript
// Export preset configuration
interface ExportPreset {
  id: string;                    // 'youtube', 'instagram', 'tiktok', 'twitter', 'custom'
  name: string;                  // Display name
  resolution: { width: number; height: number };
  bitrate: number;               // Mbps
  framerate: number;             // fps
}

// Advanced export settings
interface AdvancedExportSettings {
  preset: ExportPreset;          // Selected preset
  customResolution: { width: number; height: number } | null;
  customBitrate: number | null;  // Mbps
  customFramerate: number | null; // fps
}

// Modified ExportSettings to include advanced options
interface ExportSettings {
  format: 'mp4';
  videoCodec: 'libx264';
  audioCodec: 'aac';
  framerate: number;
  width: number;
  height: number;
  videoBitrate: number;          // Mbps
  audioBitrate: 128;             // kbps
  aspectRatioMode: 'letterbox';
}
```

### Preset Definitions

```typescript
const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    resolution: { width: 1920, height: 1080 },
    bitrate: 12,
    framerate: 30
  },
  {
    id: 'instagram',
    name: 'Instagram',
    resolution: { width: 1080, height: 1350 },
    bitrate: 5,
    framerate: 30
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    resolution: { width: 1080, height: 1920 },
    bitrate: 5,
    framerate: 30
  },
  {
    id: 'twitter',
    name: 'Twitter',
    resolution: { width: 1920, height: 1080 },
    bitrate: 8,
    framerate: 30
  },
  {
    id: 'custom',
    name: 'Custom',
    resolution: { width: 1920, height: 1080 },
    bitrate: 5,
    framerate: 30
  }
];
```

---

## 9. API / Service Contracts

### Modified IPC Handler

```typescript
// Updated export:start handler to accept custom settings
ipcMain.handle('export:start', async (
  event,
  clips: TimelineClip[],
  libraryClips: VideoClip[],
  outputPath: string,
  exportSettings?: AdvancedExportSettings,  // Optional custom settings
  projectState?: SavedProjectState
): Promise<void> => {
  // Use custom settings if provided, else calculate from sources
  let settings: ExportSettings;
  if (exportSettings) {
    const preset = exportSettings.preset;
    settings = {
      format: 'mp4',
      videoCodec: 'libx264',
      audioCodec: 'aac',
      framerate: exportSettings.customFramerate || preset.framerate,
      width: exportSettings.customResolution?.width || preset.resolution.width,
      height: exportSettings.customResolution?.height || preset.resolution.height,
      videoBitrate: exportSettings.customBitrate || preset.bitrate,
      audioBitrate: 128,
      aspectRatioMode: 'letterbox'
    };
  } else {
    settings = calculateExportSettings(clips, libraryClips);
  }
  
  await exportVideoSequence({ clips, libraryClips, outputPath, settings }, onProgress);
});
```

### New Validation Utility

```typescript
/**
 * Validate advanced export settings
 * @param settings - Advanced export settings to validate
 * @param sourceClips - Source clips to check against
 * @returns Validation result with warnings/errors
 */
export function validateAdvancedExportSettings(
  settings: AdvancedExportSettings,
  sourceClips: VideoClip[]
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Get max source resolution
  const maxWidth = Math.max(...sourceClips.map(c => c.metadata.width));
  const maxHeight = Math.max(...sourceClips.map(c => c.metadata.height));
  
  // Resolution validation
  const targetWidth = settings.customResolution?.width || settings.preset.resolution.width;
  const targetHeight = settings.customResolution?.height || settings.preset.resolution.height;
  
  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    warnings.push(`Requested resolution (${targetWidth}x${targetHeight}) exceeds source (${maxWidth}x${maxHeight}). Upscaling will occur.`);
  }
  
  // Bitrate validation
  const bitrate = settings.customBitrate || settings.preset.bitrate;
  if (bitrate < 1 || bitrate > 20) {
    errors.push(`Bitrate must be between 1 and 20 Mbps (got ${bitrate} Mbps)`);
  }
  
  // Framerate validation
  const framerate = settings.customFramerate || settings.preset.framerate;
  if (![24, 30, 60].includes(framerate)) {
    errors.push(`Framerate must be 24, 30, or 60 fps (got ${framerate} fps)`);
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}
```

---

## 10. UI Components to Create/Modify

### New Components

- `src/components/AdvancedExportDialog.tsx` — Main advanced export dialog with preset selection and custom settings
- `src/components/ExportPresetButton.tsx` — Platform preset button (YouTube, Instagram, etc.)
- `src/components/ExportSettingsPanel.tsx` — Custom settings panel (resolution, bitrate, framerate controls)
- `src/components/ExportValidationWarning.tsx` — Shows validation warnings/errors

### Modified Components

- `src/App.tsx` — Integrate advanced export dialog
- `src/components/ExportDialog.tsx` — Add tabs (Basic/Advanced) or modal approach
- `src/hooks/useExport.ts` — Add advanced settings parameter support
- `src/types/video.ts` — Add AdvancedExportSettings, ExportPreset interfaces
- `src/utils/exportValidation.ts` — New validation utility functions

---

## 11. Integration Points

- **FFmpeg export pipeline**: Modified generateTrimCommand and generateConcatCommand to use custom settings
- **IPC handlers**: Updated export:start handler to accept custom settings
- **Export dialog**: Tabs or modal to switch between Basic and Advanced modes
- **File system**: Export file organization to `exports/YYYY-MM-DD/` folder
- **State management**: Export settings stored in React state during dialog interaction

---

## 12. Test Plan & Acceptance Gates

### Happy Path Tests

- [x] **Test 1: YouTube Preset Export**
  - Select YouTube preset, click Export
  - **Gate**: Output file is 1920x1080, 30fps, ~12 Mbps (verified with ffprobe)

- [x] **Test 2: Instagram Preset Export**
  - Select Instagram preset, click Export
  - **Gate**: Output file is 1080x1350 vertical, 30fps (4:5 aspect ratio verified)

- [x] **Test 3: Custom Resolution Export**
  - Custom: 720p, 5Mbps, 30fps → Export
  - **Gate**: Output matches exact settings (720p@30fps, 5Mbps)

- [x] **Test 4: TikTok Vertical Export**
  - Select TikTok preset → Export
  - **Gate**: Output is 1080x1920 vertical (9:16 aspect ratio verified)

### Edge Case Tests

- [x] **Test 5: Upscale Warning**
  - Source is 720p, request 4K
  - **Gate**: Warning shown, export proceeds with upscaling

- [x] **Test 6: Invalid Bitrate**
  - Set bitrate to 0.5 Mbps (below minimum)
  - **Gate**: Validation error, export button disabled

- [x] **Test 7: Export Folder Creation**
  - First export creates `exports/YYYY-MM-DD/` folder
  - **Gate**: Folder created, file saved inside correctly

- [x] **Test 8: Export with Different Source Resolutions**
  - Timeline has mixed resolutions (720p + 1080p clips)
  - **Gate**: Export uses letterbox to normalize, final resolution matches preset

### Performance Tests

- [x] **Test 9: Export Duration**
  - Export 2-minute 1080p video with YouTube preset
  - **Gate**: Export completes in <5 minutes

- [x] **Test 10: File Size Verification**
  - Export 1-minute video at 5 Mbps
  - **Gate**: File size ~37.5 MB (within 10% tolerance)

- [x] **Test 11: Progress Bar Updates**
  - Export long video, monitor progress bar
  - **Gate**: Progress updates smoothly every 1-2 seconds

---

## 13. Definition of Done

- [x] `AdvancedExportDialog.tsx` implemented with preset buttons and custom settings panel
- [x] `ExportPresetButton.tsx` implemented with preset highlights
- [x] `ExportSettingsPanel.tsx` implemented with resolution/bitrate/framerate controls
- [x] `ExportValidationWarning.tsx` implemented with warning/error display
- [x] Export settings validation implemented in `exportValidation.ts`
- [x] IPC handler updated to accept advanced settings parameter
- [x] FFmpeg export pipeline modified to use custom settings
- [x] Export file organization implemented (YYYY-MM-DD folder structure)
- [x] All happy path tests pass (Tests 1-4)
- [x] All edge case tests pass (Tests 5-8)
- [x] Performance targets met (Tests 9-11)
- [x] No console warnings or errors
- [x] Code follows .cursorrules patterns

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Upscaling artifacts** | Poor quality exports when upscaling | Warn user, recommend source resolution match |
| **Export duration increases** | Long exports at high bitrates | Use faster FFmpeg preset (medium), show progress |
| **Mixed aspect ratios** | Letterboxing may not match expectations | Show preview of letterboxed output in dialog |
| **Custom resolution validation** | User enters invalid dimensions | Enforce standard aspect ratios or show warning |
| **File organization conflicts** | Multiple exports same day overwrite | Append timestamp or counter to filename |

---

## 15. Rollout & Telemetry

- **Feature flag?** No (direct release)
- **Metrics**: Preset usage rates, custom settings frequency, export duration by preset
- **Manual validation steps**: All test gates from Section 12

---

## 16. Open Questions

- **Q1: Vertical video handling?** Should we auto-crop horizontal clips for vertical presets or always letterbox?
  - **Decision**: Always letterbox (no cropping) to preserve content
- **Q2: Export file naming?** Should filename include preset name or just date/time?
  - **Decision**: Include preset name for clarity (e.g., `ollo_youtube_20241201_143025.mp4`)
- **Q3: Custom resolution constraints?** Should we only allow standard resolutions or any dimensions?
  - **Decision**: Allow any dimensions, but warn if non-standard (platforms prefer standard sizes)
- **Q4: Export settings persistence?** Should we remember last used preset/settings?
  - **Decision**: Yes, save to localStorage, default to YouTube on first use

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Batch export (multiple timelines, different settings)
- [ ] Export templates (save custom presets)
- [ ] Cloud export (upload to YouTube/Instagram directly)
- [ ] Video upscaling with AI
- [ ] Audio-only export
- [ ] Export queue with progress tracking
- [ ] Export preview before encoding

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?** User selects YouTube preset → clicks Export → file saved at 1080p@30fps, 12Mbps.
2. **Primary user and critical action?** Content creator optimizing for platform; needs preset configuration with one click.
3. **Must-have vs nice-to-have?** MUST: Platform presets, custom settings, validation. NICE: Export preview, settings persistence.
4. **Video processing requirements?** FFmpeg parameters for resolution, bitrate, framerate applied during export.
5. **Performance constraints?** Export <5 min for 2-min 1080p, progress bar updates smoothly.
6. **Error/edge cases to handle?** Upscale requests, invalid bitrate/framerate, mixed source resolutions.
7. **Data model changes?** Add AdvancedExportSettings, ExportPreset interfaces to types.
8. **Electron IPC handlers required?** Update export:start handler to accept custom settings parameter.
9. **UI entry points and states?** Export button → dialog with presets → configuration → export → progress → complete.
10. **File system implications?** Export files organized in `exports/YYYY-MM-DD/` folder structure.
11. **Dependencies or blocking integrations?** None (builds on existing export infrastructure).
12. **Rollout strategy and metrics?** Direct release, track preset usage and export duration.
13. **What is explicitly out of scope?** Batch export, cloud upload, audio-only export, export templates.

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep export settings deterministic
- React components are configuration UI
- Test with real video exports (ffprobe verification)
- Reference `prd-v1.md` and `.cursorrules` throughout

