# PR-17 TODO — AI-Powered Teleprompter

**Branch**: `feat/pr-17-ai-feature`  
**Source PRD**: `docs/prds/pr-17-ai.md`  
**Owner (Agent)**: Cody

---

## 0. UX Flow Structure Breakdown

### Complete User Journey

```
Step 1: Main App
  User clicks "Record" button (main app toolbar)
    ↓
  
Step 2: Recording Type Selection
  RecordingTypeModal appears with options
  User clicks "Webcam" option
    ↓
  
Step 3: Webcam Setup Modal
  WebcamRecordingModal opens (selection view)
  - Camera selection (if multiple cameras)
  - Audio settings (enable/disable microphone)
  - "Start Preview" button available
  User clicks "Start Preview"
    ↓
  
Step 4: Webcam Preview Screen
  Video preview appears with controls:
  - Video feed from selected camera
  - Timer (if recording)
  - Control buttons:
    * "Generate Script" button (new)
    * "Start Recording" button
    * "Cancel" button
  User clicks "Generate Script" button
    ↓
  
Step 5: Teleprompter Modal Opens
  TeleprompterModal opens (ScriptGenerator view)
  - Topic input field: "What should the script be about?"
  - Duration dropdown: 15s, 30s, 1min, 2min, 5min
  - "Generate Script" button
  User enters topic (e.g., "Introduction to video editing")
  User selects duration (e.g., "2 minutes")
  User clicks "Generate Script"
    ↓
  
Step 6: AI Generation (Loading State)
  Loading spinner shown
  Generate button disabled
  "Generating script..." message
  (Max 10 seconds timeout)
    ↓
  
Step 7: Script Preview View
  ScriptGenerator view switches to ScriptPreview view
  - Generated script displayed in text area
  - Estimated read time shown
  - Buttons:
    * "Accept" button (saves script and closes modal)
    * "Edit" button (opens editable text area)
    * "Regenerate" button (generates new script)
  User reviews script
  User clicks "Accept"
    ↓
  
Step 8: Return to Preview Screen
  TeleprompterModal closes
  User returns to webcam preview screen
  - Video preview still active
  - Script now saved in teleprompter store
  - "Generate Script" button still available (or changes to "Show Teleprompter")
  User clicks "Start Recording" button
    ↓
  
Step 9: Recording with Teleprompter Overlay
  Recording starts
  ScriptDisplay overlay appears over video preview:
  - Semi-transparent dark background
  - Large white scrolling text
  - Controls at bottom:
    * Play/Pause button
    * Speed slider (80-200 WPM)
    * Reset button
    * Close (X) button
  Script auto-scrolls at configured speed (default 150 WPM)
  User can pause/resume, adjust speed during recording
  User clicks "Stop Recording" when done
    ↓
  
Step 10: Recording Complete
  Recording stops and saves
  Teleprompter overlay can be closed or remains for next recording
  Script persists in session for reuse
```

### Key UX Integration Points

1. **Entry Point**: "Generate Script" button appears in webcam preview screen (Step 4)
2. **Modal Flow**: TeleprompterModal → ScriptGenerator → ScriptPreview → Close → Return to preview
3. **Overlay Display**: ScriptDisplay appears as overlay during recording (Step 9)
4. **State Persistence**: Script saved and accessible across modal open/close
5. **Recording Integration**: Teleprompter continues during active recording

---

## 0. Clarifying Questions & Assumptions

- **Questions**: 
  - Should "Generate Script" button be visible only in preview mode, or also in selection mode?
  - Should teleprompter overlay be toggleable before recording starts (for practice)?
  - Can user regenerate script while recording is active?
  
- **Assumptions (confirm in PR if needed)**:
  - "Generate Script" button appears in preview screen (after "Start Preview" clicked)
  - Script persists in session and survives modal close/reopen
  - Teleprompter overlay only appears during active recording (or can be toggled in preview)
  - User can generate new script even if one already exists (overwrites previous)
  - Overlay is hidden in exported video (not captured in recording)

---

## 1. Setup

- [ ] Create branch `feat/pr-17-ai-teleprompter` from develop
- [ ] Read PRD thoroughly (`docs/prds/pr-17-ai.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context and performance requirements
- [ ] Confirm environment and Electron dev server work
- [ ] Review existing WebcamRecordingModal implementation (`src/components/WebcamRecordingModal.tsx`)
- [ ] Set up `.env` file with `OPENAI_API_KEY` placeholder
- [ ] Install dependencies: `npm install openai dotenv`

---

## 2. Service Layer

Implement deterministic Electron IPC handlers for OpenAI API calls.

- [ ] Create `src/main/ipc-handlers/ai.ts` file
  - Implement `ai:generateScript` IPC handler
  - Validate topic (required, max 500 chars)
  - Validate duration (15-300 seconds)
  - Get OpenAI API key from `process.env.OPENAI_API_KEY`
  - Call OpenAI API (GPT-3.5-turbo or GPT-4-turbo based on env)
  - Handle errors: missing key, network failure, rate limit, timeout
  - Return `ScriptGenerationResponse` with script, wordCount, estimatedReadTime
  - Test Gate: Handler works for valid inputs, returns script in <10 seconds
  - Test Gate: Handler throws appropriate errors for invalid inputs/API failures

- [ ] Register AI handlers in `src/main.ts`
  - Import `registerAiHandlers` from `src/main/ipc-handlers/ai.ts`
  - Call `registerAiHandlers()` in main process initialization
  - Test Gate: IPC handler registered and accessible from renderer

- [ ] Add environment variable loading
  - Install `dotenv` package
  - Load `.env` file in main process (`src/main.ts`)
  - Create `.env.example` template with `OPENAI_API_KEY` placeholder
  - Test Gate: Environment variables loaded correctly

- [ ] Expose AI API in preload (`src/preload.ts`)
  - Add `window.electron.ai.generateScript()` method
  - Call `ipcRenderer.invoke('ai:generateScript', topic, duration, format)`
  - Test Gate: API accessible from renderer process

---

## 3. Data Model & File Operations

Define TypeScript interfaces and state management.

- [ ] Create `src/types/teleprompter.ts` file
  - Define `TeleprompterScript` interface
  - Define `TeleprompterState` interface
  - Define `ScriptGenerationRequest` interface
  - Define `ScriptGenerationResponse` interface
  - Test Gate: Interfaces compile without errors

- [ ] Create teleprompter state management
  - Option A: React Context (`src/contexts/TeleprompterContext.tsx`)
  - Option B: Zustand store (`src/store/teleprompterStore.ts`)
  - Store: script, isPlaying, scrollSpeed, currentPosition, fontSize, isVisible
  - Actions: setScript, togglePlayback, updateScrollSpeed, resetPosition, setFontSize, setVisibility
  - Test Gate: State updates correctly, persists in session

- [ ] Add script persistence to project session
  - Save script to auto-save project state
  - Restore script on app load/reopen
  - Test Gate: Script survives modal close/reopen and app restart

---

## 4. UI Components

Create/modify React components per PRD Section 10 and UX flow.

- [ ] Create `src/components/TeleprompterModal.tsx`
  - Modal container component with view state management
  - Views: 'generator' | 'preview' | null (closed)
  - Props: `isOpen`, `onClose`, `onScriptAccepted`
  - Handles view switching (ScriptGenerator → ScriptPreview)
  - Test Gate: Modal opens/closes correctly, view switching works

- [ ] Create `src/components/ScriptGenerator.tsx`
  - Form with topic input (placeholder: "What should the script be about?")
  - Duration dropdown (15s, 30s, 1min, 2min, 5min, or custom input)
  - "Generate Script" button (disabled during loading)
  - Loading state with spinner
  - Error message display
  - Props: `onGenerate`, `isLoading`, `error`
  - Validation: topic required, max 500 chars
  - Test Gate: Form validates inputs, calls onGenerate with correct params

- [ ] Create `src/components/ScriptPreview.tsx`
  - Display generated script in readable text area
  - Show estimated read time
  - "Accept" button (saves script and closes modal)
  - "Edit" button (opens editable text area)
  - "Regenerate" button (triggers new generation)
  - Props: `script`, `wordCount`, `estimatedReadTime`, `onAccept`, `onEdit`, `onRegenerate`
  - Test Gate: All buttons trigger correct actions

- [ ] Create `src/components/ScriptDisplay.tsx`
  - Overlay component with semi-transparent dark background (80% opacity)
  - Large white text (32px default, adjustable 24-48px)
  - Smooth auto-scroll animation (requestAnimationFrame, 60fps)
  - Scroll direction: bottom to top
  - Controls bar at bottom:
    * Play/Pause button
    * Speed slider (80-200 WPM) with current value display
    * Reset button (returns to start)
    * Close button (X) in top-right
  - Props: `script`, `isPlaying`, `scrollSpeed`, `onPlayPause`, `onSpeedChange`, `onReset`, `onClose`
  - Test Gate: Scroll animation smooth at 60fps, all controls work

- [ ] Modify `src/components/WebcamRecordingModal.tsx`
  - Add "Generate Script" button in preview screen (after video preview loads)
  - Button appears in modal-buttons section when `showPreview === true` and `session.status === 'preview'`
  - Add state for teleprompter script and visibility
  - Add toggle for showing teleprompter overlay
  - Integrate ScriptDisplay overlay when recording is active
  - Position overlay above video preview (z-index: 1000)
  - Overlay doesn't block video but scrolls text above it
  - Test Gate: Button appears in preview, opens TeleprompterModal, overlay displays during recording

---

## 5. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

- [ ] Wire up TeleprompterModal to WebcamRecordingModal
  - Add state: `const [showTeleprompterModal, setShowTeleprompterModal] = useState(false)`
  - "Generate Script" button opens modal: `onClick={() => setShowTeleprompterModal(true)}`
  - Handle script acceptance: save to state/context, close modal
  - Test Gate: Modal opens from preview screen, script saves on accept

- [ ] Integrate ScriptDisplay overlay with recording
  - Show overlay when `session.status === 'recording'` and script exists
  - Overlay positioned absolutely over video preview
  - Script continues scrolling during recording
  - Overlay hidden when recording stops (or can be toggled)
  - Test Gate: Overlay appears during recording, scrolls smoothly, doesn't impact recording performance

- [ ] Implement scroll animation logic
  - Calculate scroll position based on WPM and elapsed time
  - Use `requestAnimationFrame` for smooth 60fps animation
  - Pause/resume functionality
  - Reset to start position
  - Test Gate: Scroll smooth at all speeds (80-200 WPM), pause/resume works

- [ ] Add AI API error handling
  - Network failures: "Unable to connect. Check your internet connection."
  - Missing API key: "OpenAI API key not configured. See OPENAI_SETUP.md"
  - Rate limits: "API rate limit exceeded. Please try again in a moment."
  - Timeout: "Request timed out. Please try again."
  - Test Gate: All error states show clear messages, user can retry

- [ ] Create `OPENAI_SETUP.md` documentation
  - Instructions for obtaining API key
  - How to create `.env` file
  - Model selection (GPT-3.5-turbo vs GPT-4-turbo)
  - Cost considerations
  - Troubleshooting section

---

## 6. Manual Testing

Follow manual testing protocol from `prd-v1.md` and UX flow.

### UX Flow Testing

- [ ] **Test 1: Complete Happy Path Flow**
  - Click "Record" → Click "Webcam" → Click "Start Preview"
  - Click "Generate Script" → Enter topic "video editing basics" → Select "2 minutes"
  - Click "Generate Script" → Wait for generation (<10 seconds)
  - Review script in ScriptPreview → Click "Accept"
  - Verify modal closes, return to preview screen
  - Click "Start Recording" → Verify ScriptDisplay overlay appears
  - Verify script scrolls smoothly → Click "Stop Recording"
  - **Gate**: All steps complete without errors, script scrolls during recording

- [ ] **Test 2: Script Editing**
  - Generate script → Click "Edit" → Modify text → Save
  - Accept script → Start recording → Verify edited script displays
  - **Gate**: Edited script appears correctly in overlay

- [ ] **Test 3: Regenerate Script**
  - Generate script → Click "Regenerate" → New script generated
  - Accept new script → Verify previous script replaced
  - **Gate**: New script replaces old, no duplicate scripts

- [ ] **Test 4: Scroll Speed Adjustment**
  - Start recording with teleprompter → Drag speed slider to 120 WPM
  - Verify scroll speed changes in real-time
  - Drag to 200 WPM → Verify faster scroll
  - **Gate**: Speed updates smoothly without jank

- [ ] **Test 5: Play/Pause Controls**
  - Start recording with teleprompter → Click "Pause"
  - Verify scroll stops → Click "Play" → Verify scroll resumes
  - **Gate**: Pause/play works correctly

- [ ] **Test 6: Reset Button**
  - Scroll through script → Click "Reset"
  - Verify script returns to beginning
  - **Gate**: Reset works, scroll restarts from top

### Edge Case Testing

- [ ] **Test 7: Empty Topic Validation**
  - Click "Generate Script" without entering topic
  - **Gate**: Validation error shown, Generate button disabled

- [ ] **Test 8: Very Long Topic (>500 chars)**
  - Enter topic >500 characters
  - **Gate**: Truncation or error message shown

- [ ] **Test 9: API Timeout**
  - Disconnect internet → Generate script
  - **Gate**: Network error shown, Retry button available

- [ ] **Test 10: Missing API Key**
  - Remove API key from `.env` → Generate script
  - **Gate**: Clear error message with setup instructions

- [ ] **Test 11: Very Long Script (5 minutes)**
  - Generate 5-minute script → Verify full script displays
  - Start scroll → Verify no performance issues
  - **Gate**: Long script handled correctly, smooth scrolling

- [ ] **Test 12: Modal Closed Mid-Generation**
  - Start script generation → Close modal immediately
  - Reopen modal → Verify no orphaned loading state
  - **Gate**: Modal state resets correctly

### Integration Testing

- [ ] **Test 13: Recording Without Script**
  - Start preview → Click "Start Recording" (no script generated)
  - **Gate**: Recording works normally, no teleprompter overlay

- [ ] **Test 14: Multiple Recordings with Same Script**
  - Generate script → Record → Stop → Record again
  - **Gate**: Script persists, overlay appears on second recording

- [ ] **Test 15: Overlay Doesn't Block Video**
  - Record with teleprompter → Verify video visible behind overlay
  - **Gate**: Video preview remains visible, overlay is semi-transparent

- [ ] **Test 16: Script Persists Across Modal Close**
  - Generate script → Accept → Close preview → Reopen preview
  - Start recording → **Gate**: Script still available, overlay shows script

---

## 7. Performance

Verify targets from `prd-v1.md`.

- [ ] **Script generation < 10 seconds**
  - Test Gate: AI API call completes within timeout (10 seconds max)

- [ ] **Scroll animation 60fps**
  - Test Gate: ScriptDisplay scrolls at consistent 60fps, no frame drops

- [ ] **Modal open < 100ms**
  - Test Gate: TeleprompterModal opens instantly, no lag

- [ ] **Speed adjustment responsive**
  - Test Gate: Slider updates scroll speed immediately, no lag

- [ ] **Recording performance unchanged**
  - Test Gate: Recording with teleprompter has no performance impact
  - Memory usage remains stable during long recordings
  - No UI blocking during script generation or scrolling

- [ ] **Overlay rendering doesn't impact video**
  - Test Gate: Video preview maintains smooth 30fps with overlay active

---

## 8. Acceptance Gates

Check every gate from PRD Section 12.

### Happy Path Gates

- [ ] **HP-1**: Generate script with valid topic/duration → Script generated in <10 seconds
- [ ] **HP-2**: Accept generated script → Script saved and displayed in overlay
- [ ] **HP-3**: Start auto-scroll → Text scrolls smoothly at 60fps
- [ ] **HP-4**: Adjust scroll speed → Speed updates in real-time without jank
- [ ] **HP-5**: Record webcam with teleprompter → Overlay visible, scrolling continues

### Edge Case Gates

- [ ] **EC-1**: Empty topic input → Validation error shown, Generate disabled
- [ ] **EC-2**: Very long topic (>500 chars) → Truncation or error message
- [ ] **EC-3**: API timeout (>10 seconds) → Timeout error, Retry button available
- [ ] **EC-4**: Very long script (5 minutes) → Full script displayed, manual scroll available
- [ ] **EC-5**: Modal closed mid-generation → Script lost, user can regenerate
- [ ] **EC-6**: Speed slider at extremes (80/200 WPM) → Scroll works correctly at both speeds

### Error Case Gates

- [ ] **ERR-1**: Missing API key → Clear error message with setup instructions
- [ ] **ERR-2**: Invalid API key → Authentication error displayed
- [ ] **ERR-3**: Network failure → "Check internet connection" error
- [ ] **ERR-4**: API rate limit → Rate limit error with retry option
- [ ] **ERR-5**: Malformed API response → Graceful error handling

### Performance Gates

- [ ] **PERF-1**: Script generation completes in <10 seconds
- [ ] **PERF-2**: Scroll animation maintains 60fps
- [ ] **PERF-3**: Modal opens in <100ms
- [ ] **PERF-4**: Speed adjustment updates without lag
- [ ] **PERF-5**: Overlay doesn't impact video preview performance

---

## 9. Documentation & PR

- [ ] Add inline code comments for complex logic (scroll animation, AI API calls)
- [ ] Create `OPENAI_SETUP.md` with setup instructions
- [ ] Update `.env.example` with `OPENAI_API_KEY` placeholder
- [ ] Create PR description (use format from agents/cody-agent-template.md)
- [ ] Document UX flow in PR description
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Electron IPC handlers implemented for OpenAI API calls
- [ ] React components implemented (TeleprompterModal, ScriptGenerator, ScriptPreview, ScriptDisplay)
- [ ] TypeScript interfaces defined (teleprompter types)
- [ ] Integration with WebcamRecordingModal completed
- [ ] Script persistence in session state
- [ ] Smooth scroll animation (60fps) implemented
- [ ] All error states handled gracefully
- [ ] OpenAI API key configuration documented
- [ ] Manual testing complete with UX flow verified
- [ ] Performance targets met (generation <10s, scroll 60fps, modal <100ms)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] Documentation updated (OPENAI_SETUP.md, .env.example)
```

---

## Notes

- **UX Flow Priority**: Implement components following the exact UX flow structure (Record → Webcam → Preview → Generate Script → Accept → Record)
- **Entry Point**: "Generate Script" button must appear in preview screen (not selection screen)
- **State Management**: Script must persist across modal close/reopen and app sessions
- **Performance Critical**: Scroll animation must be smooth 60fps (use requestAnimationFrame)
- **Error Handling**: All API errors must show clear, actionable messages
- **Testing**: Test complete UX flow end-to-end, not just individual components
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- **Breaking Tasks**: Each component and integration step should be <30 min chunks

---

## UX Flow Summary (Quick Reference)

```
Main App → Record Button → RecordingTypeModal → Webcam → 
WebcamRecordingModal (Setup) → Start Preview → Preview Screen →
Generate Script Button → TeleprompterModal → ScriptGenerator → 
Generate → ScriptPreview → Accept → Return to Preview →
Start Recording → ScriptDisplay Overlay → Recording Active
```

