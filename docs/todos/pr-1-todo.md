# PR-1 TODO — Application Launch & Window Setup

**Branch**: `feat/pr-1-application-launch`  
**Source PRD**: `docs/prds/pr-1-prd.md`  
**Owner (Agent)**: Pete → Cody (for implementation)

---

## 0. Clarifying Questions & Assumptions

**Assumptions**:
- Electron Forge with Vite + TypeScript template will be used
- React 18+ with functional components
- FFmpeg integration deferred to PR-2
- Development on macOS (primary platform)
- Node.js v18+ and npm v9+ already installed

**No blocking questions** — PRD is clear and complete.

---

## 1. Setup

- [ ] Create branch `feat/pr-1-application-launch` from develop
  - Test Gate: `git branch` shows new branch checked out
  
- [ ] Read PRD thoroughly (`docs/prds/pr-1-prd.md`)
  - Test Gate: Understand all MUST requirements (M1-M5)
  
- [ ] Read `.cursorrules` for Electron + React patterns
  - Test Gate: Familiar with TypeScript requirements and code quality standards
  
- [ ] Read `prd-v1.md` Section: "Technical Architecture" and "Implementation Phases - Phase 1"
  - Test Gate: Understand project structure and tech stack
  
- [ ] Verify prerequisites installed
  - Test Gate: `node --version` shows v18+, `npm --version` shows v9+

---

## 2. Project Initialization

- [ ] Initialize Electron Forge project with Vite + TypeScript template
  - Command: `npm create @electron-forge/app@latest . -- --template=vite-typescript` (in current directory)
  - Test Gate: Project files created (package.json, forge.config.ts, src/ folder)
  
- [ ] Install React dependencies
  - Command: `npm install react react-dom`
  - Command: `npm install -D @types/react @types/react-dom`
  - Test Gate: package.json shows react 18+ and type definitions
  
- [ ] Install additional dependencies
  - Command: `npm install uuid` (for future clip IDs)
  - Command: `npm install -D @types/uuid`
  - Test Gate: Dependencies listed in package.json
  
- [ ] Install ffmpeg-static (for future PRs, but include in setup)
  - Command: `npm install ffmpeg-static`
  - Test Gate: ffmpeg-static in package.json
  
- [ ] Verify dev server works
  - Command: `npm start`
  - Test Gate: Electron window opens with default template content

---

## 3. Main Process Configuration

- [ ] Create/modify `src/main.ts` with window configuration
  - Implement: BrowserWindow creation with 1200x800 size
  - Implement: Center window on screen
  - Implement: Set minimum size 1280x720
  - Implement: Set title to "ollo"
  - Test Gate: Window opens with correct dimensions and title
  
- [ ] Configure window properties
  - Set: `width: 1200, height: 800`
  - Set: `minWidth: 1280, minHeight: 720`
  - Set: `title: "ollo"`
  - Set: `center: true`
  - Set: `webPreferences: { contextIsolation: true, preload: path }`
  - Test Gate: All window properties apply correctly
  
- [ ] Add app lifecycle handlers
  - Implement: `app.on('ready', createWindow)`
  - Implement: `app.on('window-all-closed')` quit behavior
  - Implement: `app.on('activate')` macOS behavior
  - Test Gate: App quits properly, reopens on macOS dock click

---

## 4. Preload Script Setup

- [ ] Create/modify `src/preload.ts` with contextBridge
  - Import: `contextBridge, ipcRenderer` from electron
  - Implement: `contextBridge.exposeInMainWorld('electron', {})`
  - Add comment: "// IPC handlers will be added in PR-2+"
  - Test Gate: File compiles without errors
  
- [ ] Create TypeScript definitions for window.electron
  - Create: `src/renderer/types/electron.d.ts`
  - Define: `ElectronAPI` interface (empty for now)
  - Define: `Window` interface extension
  - Test Gate: TypeScript recognizes window.electron type

---

## 5. React Renderer Setup

- [ ] Create React entry point `src/renderer.ts`
  - Import: React, ReactDOM
  - Implement: `ReactDOM.createRoot(document.getElementById('root')!).render(<App />)`
  - Test Gate: File compiles, React app mounts
  
- [ ] Create root HTML file `index.html`
  - Add: `<div id="root"></div>`
  - Add: Dark background color (#1a1a1a)
  - Link: Vite script imports
  - Test Gate: HTML loads correctly in dev mode
  
- [ ] Create root component `src/App.tsx`
  - Implement: Functional component with JSX
  - Implement: Three-panel layout structure (divs)
  - Add: classNames for Library, Preview, Timeline
  - Test Gate: Component renders, React DevTools shows structure

---

## 6. UI Components - Layout Structure

- [ ] Create `src/components/Library.tsx`
  - Implement: Functional component returning panel div
  - Add: Empty state text "Drag & drop video files or click Import to get started"
  - Add: className "library-panel"
  - Test Gate: Component renders with placeholder text
  
- [ ] Create `src/components/VideoPlayer.tsx`
  - Implement: Functional component returning preview div
  - Add: Gray placeholder box
  - Add: className "preview-panel"
  - Test Gate: Component renders with gray background
  
- [ ] Create `src/components/Timeline.tsx`
  - Implement: Functional component returning timeline div
  - Add: Empty state text "Drag video files here or click to import"
  - Add: className "timeline-panel"
  - Test Gate: Component renders with placeholder text
  
- [ ] Wire up components in `src/App.tsx`
  - Import: Library, VideoPlayer, Timeline components
  - Add: Three components in layout structure
  - Add: Container divs with proper layout classes
  - Test Gate: All three components render in correct positions

---

## 7. Styling - Dark Theme

- [ ] Create `src/index.css` with base styles
  - Add: CSS reset (margin, padding, box-sizing)
  - Add: Body background #1a1a1a
  - Add: White text color #ffffff
  - Add: Sans-serif font (system font stack)
  - Test Gate: Dark theme applies to entire window
  
- [ ] Add layout styles for three-panel structure
  - Add: `.app-container` with flexbox layout
  - Add: `.main-content` for top section (Library + Preview)
  - Add: `.library-panel` width 20%
  - Add: `.preview-panel` flex-grow (takes remaining ~40%)
  - Add: `.timeline-panel` height 30%, full width
  - Test Gate: Panels positioned correctly with proper dimensions
  
- [ ] Add panel visual styles
  - Add: Panel borders #333333 (1px solid)
  - Add: Panel padding 16px
  - Add: Gap between panels 0
  - Test Gate: Borders visible, spacing correct
  
- [ ] Add empty state text styles
  - Add: Gray text color #999999 for placeholders
  - Add: Centered text alignment
  - Add: Font size 14px
  - Test Gate: Placeholder text readable and styled correctly
  
- [ ] Add preview panel placeholder styling
  - Add: Gray background #333333
  - Add: Centered content (flex center)
  - Add: Aspect ratio consideration (16:9 maintained if possible)
  - Test Gate: Preview area looks visually balanced

---

## 8. Vite Configuration

- [ ] Verify `vite.main.config.ts` is correct
  - Check: Entry point set to src/main.ts
  - Check: Build target is electron-main
  - Test Gate: Main process builds without errors
  
- [ ] Verify `vite.preload.config.ts` is correct
  - Check: Entry point set to src/preload.ts
  - Check: Build target is electron-preload
  - Test Gate: Preload script builds without errors
  
- [ ] Verify `vite.renderer.config.ts` is correct
  - Check: Entry point set to src/renderer.ts
  - Check: React plugin configured
  - Check: Build target is browser
  - Test Gate: Renderer builds without errors, HMR works

---

## 9. TypeScript Configuration

- [ ] Verify `tsconfig.json` is properly configured
  - Check: Strict mode enabled
  - Check: React JSX support
  - Check: ES2020+ target
  - Test Gate: TypeScript compiles without errors
  
- [ ] Verify all type definitions are in place
  - Check: @types/react installed
  - Check: @types/react-dom installed
  - Check: electron.d.ts created
  - Test Gate: No type errors in IDE, autocomplete works

---

## 10. Electron Forge Configuration

- [ ] Verify `forge.config.ts` for packaging
  - Check: Vite plugin configured for all processes
  - Check: macOS makers configured
  - Check: App name set to "ollo"
  - Test Gate: Configuration valid, no syntax errors
  
- [ ] Test development build
  - Command: `npm start`
  - Test Gate: App launches in dev mode with HMR
  - Test Gate: Making edits triggers hot reload
  
- [ ] Test production build
  - Command: `npm run make`
  - Test Gate: Build completes successfully
  - Test Gate: Creates out/ folder with .app file (macOS)

---

## 11. Manual Testing - Happy Path

- [ ] Test: Launch app in dev mode
  - Command: `npm start`
  - Test Gate: Window appears within 5 seconds
  - Test Gate: Window is 1200x800px (measure with ruler or screenshot)
  - Test Gate: Window is centered on screen
  
- [ ] Test: Verify three-panel layout
  - Test Gate: Library panel visible on left (~20% width)
  - Test Gate: Preview panel visible in center (~40% width)
  - Test Gate: Timeline panel visible at bottom (~30% height)
  - Test Gate: All panels have dark background (#1a1a1a)
  
- [ ] Test: Verify empty state messages
  - Test Gate: Library shows "Drag & drop video files or click Import to get started"
  - Test Gate: Preview shows gray placeholder
  - Test Gate: Timeline shows "Drag video files here or click to import"
  
- [ ] Test: Window resizing
  - Action: Drag window corners to resize
  - Test Gate: Window resizes smoothly (no lag or jank)
  - Test Gate: Panels scale proportionally
  - Test Gate: Cannot resize below 1280x720px
  
- [ ] Test: Window title
  - Test Gate: Title bar shows "ollo"

---

## 12. Manual Testing - Edge Cases

- [ ] Test: Launch on small display (simulate 1440x900)
  - Test Gate: Window doesn't exceed screen bounds
  - Test Gate: Window is usable, not cut off
  
- [ ] Test: Close and reopen app multiple times
  - Test Gate: Each launch succeeds
  - Test Gate: No error messages in console
  
- [ ] Test: Check Developer Tools
  - Open: Cmd+Option+I (or View > Toggle Developer Tools)
  - Test Gate: No errors in console
  - Test Gate: No warnings in console
  - Test Gate: React DevTools shows component tree

---

## 13. Manual Testing - Production Build

- [ ] Build production app
  - Command: `npm run package`
  - Test Gate: Builds complete successfully
  - Test Gate: out/ollo-darwin-arm64/ollo.app exists (or x64 variant)
  
- [ ] Test: Launch production app
  - Action: Double-click ollo.app
  - Test Gate: App launches within 5 seconds
  - Test Gate: Same behavior as dev mode
  - Test Gate: Three panels visible with empty states
  
- [ ] Test: Launch from Applications folder
  - Action: Move ollo.app to /Applications, launch
  - Test Gate: Launches successfully
  - Test Gate: Icon appears in Dock

---

## 14. Performance Verification

All targets from prd-v1.md Section 4:

- [ ] Measure app load time
  - Method: Stopwatch from click to interactive UI
  - Test Gate: < 5 seconds cold start (PRD requirement)
  
- [ ] Measure initial memory usage
  - Method: Activity Monitor > ollo > Memory
  - Test Gate: < 150MB on launch (PRD requirement)
  
- [ ] Measure memory stability
  - Method: Monitor memory over 5 minutes idle
  - Test Gate: No significant increase, stays under 200MB
  
- [ ] Test window resize performance
  - Method: Visual observation during resize
  - Test Gate: Smooth 60fps, no visible stuttering
  - Test Gate: No layout flicker or jank

---

## 15. Code Quality Checks

- [ ] Run TypeScript compiler
  - Command: `npx tsc --noEmit`
  - Test Gate: 0 TypeScript errors
  
- [ ] Check console for runtime errors
  - Open: Developer Tools console
  - Test Gate: 0 errors, 0 warnings
  
- [ ] Verify code follows .cursorrules patterns
  - Check: Functional React components
  - Check: TypeScript strict mode
  - Check: No `any` types
  - Check: Proper component structure
  - Test Gate: Code matches project standards
  
- [ ] Check for unused imports/variables
  - Review: All source files
  - Test Gate: No unused imports, clean code

---

## 16. Documentation

- [ ] Update README.md with setup instructions
  - Add: Prerequisites (Node.js, npm versions)
  - Add: Installation steps (`npm install`)
  - Add: Dev mode command (`npm start`)
  - Add: Build command (`npm run make`)
  - Add: Project structure overview
  - Test Gate: README is clear and accurate
  
- [ ] Add inline code comments for complex logic
  - Add: Comments in main.ts (window creation)
  - Add: Comments in preload.ts (contextBridge explanation)
  - Test Gate: Code is well-documented
  
- [ ] Verify all files have proper naming
  - Check: Components use PascalCase (Library.tsx)
  - Check: Utilities use camelCase
  - Check: CSS uses kebab-case classes
  - Test Gate: Naming conventions consistent

---

## 17. Acceptance Gates Review

Review every gate from PRD Section 12:

- [ ] M1: Electron Bootstrap
  - [ ] App launches within 5 seconds ✓
  - [ ] contextIsolation enabled ✓
  
- [ ] M2: Window Configuration
  - [ ] Window is 1200x800px and centered ✓
  - [ ] Cannot resize below 1280x720px ✓
  - [ ] Title shows "ollo" ✓
  
- [ ] M3: React Application
  - [ ] React DevTools shows component tree ✓
  - [ ] Three panels present with correct IDs ✓
  
- [ ] M4: Layout Structure
  - [ ] Panel dimensions match specifications ✓
  - [ ] Panels scale proportionally on resize ✓
  
- [ ] M5: Empty States
  - [ ] All three placeholders visible ✓
  - [ ] Text matches specifications ✓
  
- [ ] Performance
  - [ ] Launch time < 5 seconds ✓
  - [ ] Memory < 150MB ✓
  - [ ] Resize smooth 60fps ✓

---

## 18. Pre-Commit Checklist

- [ ] All TODO tasks completed (checkboxes above)
- [ ] All acceptance gates pass
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] Code follows .cursorrules patterns
- [ ] README.md updated
- [ ] Manual testing complete (dev + production)
- [ ] Performance verified

---

## 19. PR Preparation

- [ ] Review all changed files
  - Test Gate: Only necessary files modified
  
- [ ] Create PR description using Cody agent template
  - Include: Link to PRD
  - Include: Link to this TODO
  - Include: Screenshots of three-panel layout
  - Include: Performance measurements
  - Test Gate: PR description is comprehensive
  
- [ ] Verify with user before opening PR
  - Action: Show summary of changes
  - Test Gate: User approves PR creation
  
- [ ] Open PR targeting develop branch
  - Title: "PR-1: Application Launch & Window Setup"
  - Body: Use template from agents/cody-agent-template.md
  - Test Gate: PR created successfully

---

## Copyable Checklist (for PR description)

```markdown
## PR-1 Completion Checklist

- [ ] Branch created from develop: `feat/pr-1-application-launch`
- [ ] All TODO tasks completed (95 tasks)
- [ ] Electron main process configured with window creation
- [ ] Preload script with contextBridge setup
- [ ] React app with TypeScript renders three-panel layout
- [ ] Library panel (20% width) with empty state
- [ ] Preview panel (40% width) with placeholder
- [ ] Timeline panel (30% height) with empty state
- [ ] Dark theme styling applied (#1a1a1a background, #333333 borders)
- [ ] Window title shows "ollo"
- [ ] Window constraints work (1200x800 initial, 1280x720 minimum)
- [ ] Manual testing complete (dev + production builds)
- [ ] Performance verified:
  - [ ] Launch time < 5 seconds ✓
  - [ ] Memory < 150MB ✓
  - [ ] Resize smooth 60fps ✓
- [ ] All acceptance gates pass (PRD Section 12)
- [ ] TypeScript compiles with 0 errors
- [ ] No console warnings or errors
- [ ] Code follows .cursorrules patterns
- [ ] README.md updated with setup instructions
- [ ] Production build (.app) tested and working

## Test Results

**Launch Performance**:
- Cold start time: [X.X] seconds (target: < 5s) ✓
- Initial memory: [XX] MB (target: < 150MB) ✓

**Build Verification**:
- Dev mode: Working ✓
- Production build: Working ✓
- App launches from Applications folder ✓

**Visual Verification**:
- Three panels visible ✓
- Empty states display correctly ✓
- Dark theme applied ✓
- Window resizing smooth ✓
```

---

## Notes

- Each task designed to take < 30 minutes
- Tasks are sequential — complete in order
- Check off each task immediately after completion
- If blocked, document the blocker and notify team
- Reference `prd-v1.md` for additional context on requirements
- Reference `.cursorrules` for code quality standards
- This is foundation work — keep it clean and well-structured for future PRs

**Estimated Total Time**: 6-8 hours for full implementation and testing

**Dependencies**: None — this is the first PR

**Blocks**: All future PRs depend on this foundation

