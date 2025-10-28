# PRD: Application Launch & Window Setup

**Feature**: Application Launch

**Version**: 1.0

**Status**: Draft

**Agent**: Pete

**Target Release**: MVP Phase 1

**Links**: [prd-v1.md](../../prd-v1.md)

---

## 1. Summary

Enable users to launch ollo as a native macOS desktop application with a properly configured window, basic three-panel layout, and empty state UI ready for video import.

---

## 2. Problem & Goals

**Problem**: Users need a functional desktop application entry point before any video editing workflows can begin. Without a properly initialized Electron app, no video editing features can function.

**Why now**: This is the foundation requirement (Phase 1) that all other features depend on. Must be completed first.

**Goals** (ordered, measurable):
  - [x] G1 — User can launch ollo.app and see the application window within 5 seconds
  - [x] G2 — Window displays three-panel layout (Library 20%, Preview 40%, Timeline 30% height) with proper empty states
  - [x] G3 — Application is packaged as native macOS app with proper Electron + Vite + React + TypeScript configuration

---

## 3. Non-Goals / Out of Scope

- [x] Not implementing any video import functionality (PR-2)
- [x] Not implementing video playback (PR-4)
- [x] Not implementing timeline interactions (PR-3)
- [x] Not implementing FFmpeg integration yet (comes in PR-2)
- [x] Not implementing drag-and-drop (PR-2)
- [x] Windows or Linux support (macOS only for MVP)
- [x] Custom window controls or frame styling
- [x] Application menu customization beyond defaults

---

## 4. Success Metrics

**User-visible**:
- App launches to interactive UI in < 5 seconds (cold start)
- Window size is 1200x800px on launch
- Window is resizable (minimum 1280x720px per prd-v1.md)
- App title displays "ollo" in window chrome

**System**:
- Memory usage < 150MB on initial launch (empty state)
- No console errors or warnings in dev tools
- Hot module replacement (HMR) works in dev mode

**Quality**:
- 0 blocking bugs
- Crash-free launch >99.9%
- All acceptance gates pass

---

## 5. Users & Stories

- As a video editor, I want to launch ollo quickly so that I can start editing videos without delay
- As a content creator, I want to see a clean, organized interface on launch so that I understand where to begin
- As a first-time user, I want clear empty state messages so that I know what actions are available
- As a macOS user, I want a native application experience that follows platform conventions

---

## 6. Experience Specification (UX)

**Entry Points**:
- User double-clicks ollo.app in Applications folder
- User clicks ollo icon in Dock
- User opens ollo via Spotlight search

**Visual Behavior**:
- Window opens at 1200x800px centered on screen
- Dark theme background (#1a1a1a per prd-v1.md)
- Three distinct panels visible with borders (#333333)
- Empty states show helpful placeholder text:
  - Library: "Drag & drop video files or click Import to get started"
  - Preview: Gray placeholder with video icon
  - Timeline: "Drag video files here or click to import"

**Loading States**:
- Electron window appears immediately (no splash screen needed for MVP)
- React app mounts and renders within 5 seconds

**Error States**:
- If window fails to load, show Electron default error dialog
- Dev mode: console logs visible for debugging

**Performance Targets** (from prd-v1.md):
- App load time < 5 seconds (cold start to interactive UI)
- Initial memory usage < 150MB
- Window resize smooth at 60fps

---

## 7. Functional Requirements (Must/Should)

### MUST Requirements:

**M1: Electron Application Bootstrap**
- MUST initialize Electron with main process, preload script, and renderer process
- MUST enable context isolation for security (per prd-v1.md)
- MUST configure Vite for hot module replacement in dev mode
- [Gate] When app launches → window appears within 5 seconds
- [Gate] When checking security → contextIsolation is enabled

**M2: Window Configuration**
- MUST create BrowserWindow with dimensions 1200x800px
- MUST set minimum window size to 1280x720px
- MUST set window title to "ollo"
- MUST center window on screen at launch
- [Gate] When app launches → window is 1200x800px and centered
- [Gate] When user resizes window → cannot go below 1280x720px
- [Gate] When viewing window chrome → title shows "ollo"

**M3: React Application Mount**
- MUST render React app in renderer process
- MUST apply TypeScript configuration
- MUST implement three-panel layout structure (divs/containers)
- [Gate] When app loads → React DevTools shows component tree
- [Gate] When inspecting DOM → three panels present with correct IDs

**M4: Layout Structure**
- MUST implement left panel (Library) at 20% window width
- MUST implement center panel (Preview) at 40% window width (calculated)
- MUST implement bottom panel (Timeline) at 30% window height
- MUST apply dark theme colors from prd-v1.md
- [Gate] When measuring panels → dimensions match specifications
- [Gate] When resizing window → panels scale proportionally

**M5: Empty States**
- MUST display placeholder text in Library: "Drag & drop video files or click Import to get started"
- MUST display placeholder in Preview area (gray box with icon)
- MUST display placeholder text in Timeline: "Drag video files here or click to import"
- [Gate] When app launches empty → all three placeholders visible
- [Gate] When reading text → matches specifications exactly

### SHOULD Requirements:

**S1: Development Experience**
- SHOULD enable hot module replacement (HMR)
- SHOULD show helpful error messages in console
- SHOULD load dev tools automatically in dev mode

**S2: Visual Polish**
- SHOULD apply panel borders with #333333 color
- SHOULD apply 16px padding inside panels
- SHOULD use SF Pro or system sans-serif font

---

## 8. Data Model

### Application State (Initial/Empty)

```typescript
// Initial app state when launched
interface AppState {
  library: VideoClip[]; // Empty array []
  timeline: TimelineClip[]; // Empty array []
  selectedClipId: string | null; // null
  currentPlayheadPosition: number; // 0
  isExporting: boolean; // false
  exportProgress: number; // 0
  timelineZoom: number; // 1.0 (100% default)
  timelineScrollPosition: number; // 0
}

// No VideoClip or TimelineClip data on initial launch
// These types defined for future use:
interface VideoClip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  thumbnail: string;
  metadata: VideoMetadata;
}

interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;
  trimEnd: number;
  order: number;
}

interface VideoMetadata {
  width: number;
  height: number;
  framerate: number;
  codec: string;
}
```

**Validation Rules**:
- Window dimensions must not go below 1280x720px
- All state arrays start empty
- All numeric values initialize to 0 or specified defaults

---

## 9. API / Service Contracts

### Electron IPC Setup (Foundation Only)

This PR sets up IPC infrastructure but doesn't implement video-specific handlers yet.

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Placeholder structure for future handlers
  // Actual implementations come in PR-2+
});

// Type definitions for renderer
// src/renderer/types/electron.d.ts
export interface ElectronAPI {
  // Will be populated in future PRs
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

**Pre/Post-conditions**:
- Pre: Electron, React, TypeScript dependencies installed
- Post: contextBridge configured, window.electron available in renderer
- Error: If contextBridge fails, app won't launch (Electron handles error)

**No IPC handlers needed for this PR** — just infrastructure setup.

---

## 10. UI Components to Create/Modify

### New Files to Create:

**Main Process**:
- `src/main.ts` — Electron main process entry point, window creation, app lifecycle
- `src/preload.ts` — Preload script with contextBridge setup

**Renderer Process**:
- `src/renderer.ts` — React app entry point (ReactDOM.render)
- `src/App.tsx` — Root React component with three-panel layout
- `src/components/Library.tsx` — Left panel with empty state
- `src/components/VideoPlayer.tsx` — Center preview panel with placeholder
- `src/components/Timeline.tsx` — Bottom panel with empty state
- `src/index.css` — Global styles (dark theme, layout, spacing)
- `src/renderer/types/electron.d.ts` — TypeScript definitions for window.electron

**Configuration Files**:
- `forge.config.ts` — Electron Forge configuration for packaging
- `vite.main.config.ts` — Vite config for main process
- `vite.preload.config.ts` — Vite config for preload script
- `vite.renderer.config.ts` — Vite config for renderer process
- `tsconfig.json` — TypeScript configuration

---

## 11. Integration Points

**Electron Integration**:
- Main process creates BrowserWindow and loads Vite dev server (dev mode) or built files (production)
- Preload script bridges main and renderer processes via contextBridge
- Context isolation enabled for security

**React Integration**:
- React 18+ renders into #root div
- Functional components with TypeScript
- No state management needed yet (comes in PR-2)

**Vite Integration**:
- Hot module replacement for fast development
- Separate configs for main, preload, renderer processes
- TypeScript compilation

**File System**:
- No file system operations in this PR
- App launches without needing external files

**Cross-Platform**:
- macOS primary target (development and testing)
- Windows support deferred (out of scope for MVP Phase 1)

---

## 12. Test Plan & Acceptance Gates

### Happy Path

- [x] User launches app in dev mode (`npm start`)
  - Gate: Window appears within 5 seconds
  - Gate: No console errors shown
  - Gate: Three panels visible with placeholders

- [x] User launches app in production mode (packaged)
  - Gate: ollo.app opens from Applications folder
  - Gate: Window dimensions are 1200x800px
  - Gate: Window is centered on screen

- [x] User resizes window
  - Gate: Window resizes smoothly at 60fps
  - Gate: Cannot resize below 1280x720px
  - Gate: Panels maintain proportions (20%, 40%, 30%)

### Edge Cases

- [x] User launches with small display (e.g., 1440x900 laptop)
  - Gate: Window doesn't exceed screen bounds
  - Gate: Window is still usable

- [x] User launches with large display (e.g., 4K monitor)
  - Gate: Window opens at 1200x800, not maximized
  - Gate: Window is properly centered

- [x] User closes and reopens app multiple times
  - Gate: Each launch succeeds
  - Gate: No memory leaks (stable memory usage)

### Visual/UI Verification

- [x] Library panel present
  - Gate: Width is 20% of window
  - Gate: Shows "Drag & drop video files or click Import to get started"
  - Gate: Background is #1a1a1a (dark gray)

- [x] Preview panel present
  - Gate: Width is 40% of window (calculated from remaining space)
  - Gate: Shows gray placeholder
  - Gate: Positioned center of window

- [x] Timeline panel present
  - Gate: Height is 30% of window
  - Gate: Full width at bottom
  - Gate: Shows "Drag video files here or click to import"

- [x] Dark theme applied
  - Gate: Background color is #1a1a1a
  - Gate: Panel borders are #333333
  - Gate: Text is white (#ffffff)

### Performance (from prd-v1.md)

- [x] Cold start app load
  - Gate: Time from launch to interactive UI < 5 seconds

- [x] Memory usage on launch
  - Gate: Initial memory < 150MB (empty state)
  - Gate: Memory stable over 5 minutes idle

- [x] Window resize performance
  - Gate: Resize operations smooth 60fps
  - Gate: No layout flicker or jank

### Development Experience

- [x] Hot module replacement works
  - Gate: Edit React component → updates without full reload
  - Gate: Edit CSS → styles update instantly

- [x] TypeScript compilation
  - Gate: No TypeScript errors
  - Gate: Proper autocomplete in IDE

- [x] Build process
  - Gate: `npm run make` produces .app file
  - Gate: Built app launches successfully

---

## 13. Definition of Done

- [x] Electron main process configured with window creation
- [x] Preload script with contextBridge setup (structure only)
- [x] React app renders three-panel layout
- [x] All three panels show proper empty states
- [x] Window dimensions and constraints work correctly
- [x] Dark theme styling applied per prd-v1.md
- [x] App title shows "ollo"
- [x] All acceptance gates pass (Section 12)
- [x] No console errors or warnings
- [x] TypeScript compiles without errors
- [x] Dev mode works with HMR
- [x] Production build creates working .app file
- [x] Launch time < 5 seconds verified
- [x] Memory usage < 150MB verified
- [x] Documentation: README updated with launch instructions
- [x] Code follows .cursorrules TypeScript/React patterns

---

## 14. Risks & Mitigations

**Risk 1: Electron configuration complexity**
- Impact: App may not launch or HMR may not work
- Mitigation: Use Electron Forge Vite TypeScript template as starting point (proven pattern)
- Mitigation: Test both dev and production modes early

**Risk 2: Window sizing on different displays**
- Impact: Window may be too large/small or positioned off-screen
- Mitigation: Set maximum initial size constraints
- Mitigation: Use Electron's center() method for positioning
- Test on multiple display sizes

**Risk 3: Context isolation breaks IPC**
- Impact: Future IPC calls may fail if contextBridge not set up correctly
- Mitigation: Set up contextBridge structure in this PR even if empty
- Mitigation: Add TypeScript definitions for type safety
- Validate with simple test handler

**Risk 4: Performance degradation with Vite HMR**
- Impact: Dev mode may be slow or memory-intensive
- Mitigation: Use latest Vite version (5+) with optimized defaults
- Monitor memory during development

**Risk 5: TypeScript configuration issues**
- Impact: Type errors or missing autocomplete
- Mitigation: Use recommended tsconfig.json for Electron + React
- Test type definitions for window.electron early

---

## 15. Rollout & Telemetry

**Feature Flag**: No (foundational requirement)

**Manual Validation Steps**:
1. Launch app in dev mode: `npm start`
2. Verify window appears < 5 seconds
3. Verify three panels visible
4. Verify empty state messages
5. Test window resize (check minimum size constraint)
6. Build production: `npm run make`
7. Launch ollo.app from Applications
8. Verify same behavior as dev mode

**Metrics to Monitor**:
- Launch time (manual stopwatch for MVP)
- Memory usage (Activity Monitor on macOS)
- Console errors (count should be 0)

---

## 16. Open Questions

- Q1: Should we add a splash screen for branding during launch?
  - **Decision**: No — keep MVP minimal, add if launch takes >5 seconds
  
- Q2: Should window size/position be remembered between sessions?
  - **Decision**: Defer to future PR (nice-to-have, not critical for MVP)
  
- Q3: Should we customize the application menu (File, Edit, etc.)?
  - **Decision**: Use Electron defaults for MVP, customize later if needed

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future PRs:
- [x] Custom application menu
- [x] Window position/size persistence
- [x] Splash screen or loading animation
- [x] Custom window frame (frameless window)
- [x] Keyboard shortcuts (Cmd+Q, Cmd+W, etc.)
- [x] About dialog or preferences window
- [x] Application icon (using default for Phase 1)
- [x] Auto-updater integration
- [x] Crash reporting

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?**
   - User can launch ollo and see empty interface ready for video import

2. **Primary user and critical action?**
   - Video editor who needs to launch the app as first step of workflow

3. **Must-have vs nice-to-have?**
   - Must: Window launches, three panels visible, empty states
   - Nice: Custom icon, splash screen, menu customization

4. **Video processing requirements?**
   - None for this PR — pure UI/shell setup

5. **Performance constraints?**
   - Launch < 5 seconds, memory < 150MB, smooth resize 60fps

6. **Error/edge cases to handle?**
   - Small/large displays, multiple launches, dev vs production mode

7. **Data model changes?**
   - Define initial AppState structure (all empty arrays/null values)

8. **Electron IPC handlers required?**
   - None yet — just infrastructure/contextBridge setup

9. **UI entry points and states?**
   - Entry: App launch
   - States: Empty (Library, Preview, Timeline all show placeholders)

10. **File system implications?**
    - None — no file operations yet

11. **Dependencies or blocking integrations?**
    - None — this is the first PR that enables all others

12. **Rollout strategy and metrics?**
    - Manual testing, no feature flag, monitor launch time and memory

13. **What is explicitly out of scope?**
    - All video features, file import, FFmpeg, drag-and-drop, playback

---

## Authoring Notes

- This is Phase 1 foundation — keep it simple
- Focus on project structure and configuration correctness
- Test both dev and production modes thoroughly
- Empty states are crucial for UX even without functionality
- Proper TypeScript setup saves time in future PRs

