# PRD: AI-Powered Teleprompter

**Feature**: AI-Powered Teleprompter

**Version**: 1.0

**Status**: Ready for Development

**Agent**: Cody

**Target Release**: Sprint 17

**PR Number**: 17

**Links**: [TODO], [Tracking Issue]

---

## 1. Summary

AI-Powered Teleprompter enables video creators to generate scripts using OpenAI and display them as a scrolling teleprompter overlay during webcam recordings. Users can input topics and desired duration, generate scripts via AI, edit them manually, and display them as auto-scrolling text over their video preview. This eliminates the need to memorize lines or look away from the camera, enabling professional-quality video creation.

**Key Outcome**: User opens teleprompter modal → generates script via AI with topic/duration → edits bullets or accepts script → script displays as scrolling overlay during webcam recording → user records while reading smoothly scrolling text.

---

## 2. Problem & Goals

- **What video editing problem are we solving?** Content creators struggle to deliver natural, scripted videos because they must memorize lines, read from external screens, or constantly look away from the camera. This breaks eye contact and reduces video quality.
- **Why now?** Webcam recording (PR-11) is complete. AI teleprompter is a natural enhancement that transforms basic recording into professional content creation workflow.
- **Goals (ordered, measurable):**
  - [ ] G1 — Enable AI script generation from topic/duration inputs via OpenAI API
  - [ ] G2 — Display generated scripts as smooth auto-scrolling teleprompter overlay
  - [ ] G3 — Provide manual script editing and playback controls (speed, pause, reset)
  - [ ] G4 — Integrate teleprompter seamlessly with webcam recording workflow

---

## 3. Non-Goals / Out of Scope

**Intentionally Excluded:**
- ❌ **Real-time AI transcription**: Generating scripts from live speech
- ❌ **Multiple language support**: Only English for MVP
- ❌ **Voice tone/style selection**: Generic script generation only
- ❌ **Script templates**: Pre-written templates or categories
- ❌ **Collaborative editing**: Multi-user script editing
- ❌ **Export scripts**: Save scripts as separate text files
- ❌ **Teleprompter for screen recording**: Only webcam recording supported
- ❌ **Mirror mode**: Flipping text horizontally (future enhancement)
- ❌ **Custom fonts/styling**: Standard font with size adjustment only
- ❌ **Remote teleprompter control**: Separate window/device control

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- **User-visible**: 
  - Script generation completes in <10 seconds
  - Teleprompter scrolls smoothly at 60fps with no jank
  - Users can record videos without looking away from camera
- **System**: [See performance requirements in prd-v1.md]
  - AI API call timeout: 10 seconds
  - Scroll animation: 60fps minimum
  - Modal render: <100ms
  - Script generation: <10 seconds response time
- **Quality**: [0 blocking bugs, all gates pass, crash-free >99%]

---

## 5. Users & Stories

- As a **content creator**, I want to generate scripts from topics so that I can create professional videos without writing scripts manually.
- As a **video editor**, I want an auto-scrolling teleprompter so that I can maintain eye contact with the camera while reading my lines.
- As a **tutorial maker**, I want to regenerate scripts with feedback so that I can refine the content iteratively until it matches my style.
- As a **live streamer**, I want adjustable scroll speed so that I can read at my natural pace.

---

## 6. Experience Specification (UX)

### Entry Points and Flows

1. **Teleprompter Button**: "Generate Script" button appears in webcam preview screen (after "Start Preview" clicked)
2. **Chat-like Generation Flow**: User enters topic + duration → clicks Generate → AI generates script → user can Accept or Regenerate with feedback → loops until accepted
3. **Teleprompter Display**: Accepted script displays in modal with controls (manual/auto scroll, WPM, pause/play) OR as overlay during recording

### Happy Path Flow

```
Step 1: User clicks "Record" → Selects "Webcam" → Clicks "Start Preview"
  ↓
Step 2: Webcam Preview Screen
  Video preview active, control buttons visible:
  - "Generate Script" button (new)
  - "Start Recording" button
  - "Cancel" button
  ↓
Step 3: User clicks "Generate Script"
  TeleprompterModal opens (ScriptGenerator view)
  ↓
Step 4: Script Generation
  User enters:
  - Topic: "benefits of creatine" (text input)
  - Duration: "30" (seconds, dropdown: 15s, 30s, 1min, 2min, 5min)
  User clicks "Generate"
  ↓
Step 5: AI Generation (Loading)
  Loading spinner shown
  "Generating script..." message
  (Max 10 seconds timeout)
  ↓
Step 6: Script Preview View
  Generated script displayed in preview area
  Estimated read time shown
  Buttons:
  - "Accept" → Script moves to display mode
  - "Regenerate" → Returns to Step 4, user can add feedback (e.g., "shorter, more casual")
  User clicks "Accept"
  ↓
Step 7: Script Display Mode (in Modal)
  Large text area with script
  Controls:
  - Manual/Auto scroll toggle
  - Manual: Up/Down arrow buttons (line-by-line)
  - Auto: WPM slider (80-200 WPM, default 150), Play/Pause buttons
  - Font size slider (adjustable text size)
  User can close modal (script saved to session)
  ↓
Step 8: User clicks "Start Recording" (in webcam preview)
  Recording starts
  Optional: ScriptDisplay overlay appears over video (if enabled)
  Teleprompter continues during recording
  User can pause/resume/adjust speed
```

### Visual Behavior

- **Teleprompter Modal**: Centered modal with three views:
  - **ScriptGenerator**: Form with topic input, duration input, Generate button
  - **ScriptPreview**: Generated script displayed with Accept/Edit/Regenerate buttons
  - **ScriptDisplay**: Full-screen overlay with scrolling text and controls
- **Script Generator**: 
  - Text input for topic (placeholder: "What should the script be about?")
  - Duration dropdown or input (15s, 30s, 1min, 2min, 5min)
  - Generate button (disabled during loading)
  - Loading spinner during AI generation
- **Script Preview**:
  - Generated script displayed in readable text area
  - Accept, Edit, and Regenerate buttons
  - Estimated read time displayed
- **Script Display** (in modal or overlay):
  - Large readable text (font size adjustable via slider, default 32px)
  - Manual/Auto scroll toggle
  - **Manual mode**: Up/Down arrow buttons for line-by-line scrolling
  - **Auto mode**: WPM slider (80-200 WPM, default 150), Play/Pause buttons
  - Reset button (returns to start)
  - Font size slider (24-48px range)
  - If overlay: Semi-transparent dark background (80% opacity), positioned over video
  - Close button (X) closes modal/overlay
- **Scroll Animation**: 
  - Smooth vertical scrolling using requestAnimationFrame
  - Text scrolls from bottom to top
  - Pause button stops scrolling, Play resumes
  - Reset button returns to start of script

### States

| State | Appearance | Actions | Notes |
|-------|-----------|---------|-------|
| **Initial (No Script)** | ScriptGenerator view with empty inputs | Enter topic, duration, click Generate | Ready for script generation |
| **Generating** | Loading spinner, Generate button disabled | Wait for AI response | API call in progress |
| **Script Generated** | ScriptPreview shows generated text | Accept, Edit, or Regenerate | Script ready for review |
| **Editing** | Editable text area with script content | Edit bullets, Save changes | Manual editing mode |
| **Displaying (Paused)** | ScriptDisplay overlay with static text | Play, Reset, Close | Teleprompter ready to play |
| **Displaying (Playing)** | ScriptDisplay overlay with scrolling text | Pause, Adjust speed, Reset, Close | Active teleprompter |
| **Error** | Error message displayed | Retry, Cancel | API failure or validation error |

---

## 7. Functional Requirements (Must/Should)

### MUST (Core Teleprompter Functionality)

**REQ-1: AI Script Generation**
- User enters topic (text input, required, max 500 characters)
- User selects duration (dropdown: 15s, 30s, 1min, 2min, 5min, or custom input)
- Click "Generate Script" triggers OpenAI API call via IPC handler
- API call uses GPT-4-turbo or GPT-3.5-turbo (configurable via environment)
- Generated script formatted as bullet points or paragraphs (user preference)
- Script length matches requested duration (estimated words per minute: 150 WPM)
- Loading state shown during generation (max 10 seconds timeout)
- Error handling for API failures (network, rate limit, invalid key)

**REQ-2: Script Management & Regeneration**
- Generated script displayed in ScriptPreview component
- User can **Accept** script → Script moves to display mode, saved to session
- User can **Regenerate** script → Returns to generation input, user can provide feedback (e.g., "shorter", "more casual", "add bullet points")
- Regeneration uses original topic + duration + feedback → AI generates new script
- Loop until user accepts (no limit on regenerations)
- Script persists in project session (in-memory for MVP, survives modal close/reopen)
- Script cleared when user starts new generation (one script per session)

**REQ-3: Teleprompter Display & Controls**
- ScriptDisplay component shows accepted script in modal (or as overlay during recording)
- Text displayed in large, readable font (configurable size via slider, default 32px)
- **Manual Scroll Mode**: Up/Down arrow buttons move text line-by-line
- **Auto-Scroll Mode**: Toggle to enable auto-scroll at configurable WPM (80-200 WPM, default 150)
- Scroll direction: bottom to top (standard teleprompter behavior)
- Smooth animation using requestAnimationFrame (60fps)
- Play/Pause button controls auto-scroll (only active in auto mode)
- Reset button returns to script start
- Font size slider for text size adjustment (24-48px range)
- Close button closes modal/overlay (script remains saved in session)
- Overlay mode: Semi-transparent background, doesn't block video when used as overlay

**REQ-4: Scroll Speed Control**
- Speed slider ranges from 80 WPM (slow) to 200 WPM (fast)
- Default speed: 150 WPM
- Speed adjustment updates scroll animation in real-time
- Current WPM displayed on slider
- Scroll pauses when user adjusts speed slider (resumes after release)

**REQ-5: Integration with Webcam Recording**
- Teleprompter button in WebcamRecordingModal opens TeleprompterModal
- Script saved in teleprompter store accessible from recording modal
- Toggle to show/hide teleprompter overlay during recording
- Teleprompter continues scrolling during active recording
- Teleprompter overlay positioned above video preview (z-index: 1000)

**REQ-6: Secure API Key Storage**
- OpenAI API key stored in environment variable (.env file)
- API key never exposed to renderer process
- All AI API calls made from Electron main process via IPC
- Error handling for missing/invalid API key
- Setup instructions provided in OPENAI_SETUP.md

### SHOULD (Nice-to-Have Enhancements)

**REQ-7: Script Formatting Options** (Post-MVP)
- Toggle between bullet points and paragraph format
- Font family selection
- Text color customization
- Background opacity adjustment

**REQ-8: Advanced Controls** (Post-MVP)
- Jump to specific section in script
- Bookmark positions in script
- Mirror mode (flip text horizontally)
- Keyboard shortcuts (Space to pause, Arrow keys to adjust speed)

### Acceptance Gates

| Scenario | Input | Expected Output | Pass Criteria |
|----------|-------|-----------------|---------------|
| **Happy Path 1: Generate & Display** | Enter topic "video editing basics", duration "2min" → Generate → Accept | Script generated, displayed in overlay | Script visible, scrolls smoothly |
| **Happy Path 2: Edit Script** | Generate script → Click Edit → Modify text → Save | Edited script saved and displayed | Changes persist |
| **Happy Path 3: Adjust Speed** | Display script → Drag speed slider to 120 WPM | Scroll speed updates in real-time | Smooth transition, no jank |
| **Edge Case 1: Empty Topic** | Click Generate without entering topic | Validation error shown | Error message displayed |
| **Edge Case 2: API Timeout** | Generate script, API takes >10 seconds | Timeout error, Retry button shown | Graceful error handling |
| **Edge Case 3: Very Long Script** | Generate 5-minute script (750 words) | Full script displayed, user can scroll manually | No performance degradation |
| **Error Case 1: Invalid API Key** | Generate with missing/invalid key | Clear error message | User informed, can retry |
| **Error Case 2: Network Failure** | Generate script while offline | Network error message | Graceful degradation |
| **Performance Test 1: Smooth Scroll** | Display script, enable auto-scroll | 60fps animation, no frame drops | Smooth scrolling verified |

---

## 8. Data Model

### New Interfaces

```typescript
// src/types/teleprompter.ts

/**
 * Teleprompter script content
 */
export interface TeleprompterScript {
  id: string;                    // Unique identifier (UUID)
  content: string;               // Script text (plain text or markdown)
  topic: string;                 // Original topic used for generation
  duration: number;              // Requested duration in seconds
  wordCount: number;             // Estimated word count
  estimatedReadTime: number;     // Estimated read time in seconds (at 150 WPM)
  createdAt: number;             // Timestamp (Date.now())
  isAiGenerated: boolean;        // Whether script was AI-generated
}

/**
 * Teleprompter playback state
 */
export interface TeleprompterState {
  script: TeleprompterScript | null;  // Current script
  isGenerating: boolean;              // Whether AI generation in progress
  error: string | null;               // Error message if generation fails
  scrollPosition: number;             // Line index for manual scroll
  isAutoScrolling: boolean;           // Toggle state (manual vs auto)
  isPaused: boolean;                  // Pause state during auto-scroll
  fontSize: number;                   // Text size in pixels (24-48, default 32)
}

/**
 * AI script generation request
 */
export interface ScriptGenerationRequest {
  topic: string;        // User-provided topic (max 500 chars)
  duration: number;     // Requested duration in seconds
  format?: 'bullets' | 'paragraphs';  // Optional format preference
}

/**
 * AI script generation response
 */
export interface ScriptGenerationResponse {
  script: string;       // Generated script text
  wordCount: number;    // Estimated word count
  estimatedReadTime: number;  // Estimated read time in seconds
}
```

### State Management

```typescript
// Store pattern (can use React Context or Zustand)
interface TeleprompterStore {
  script: TeleprompterScript | null;
  state: TeleprompterState;
  
  // Actions
  setScript: (script: TeleprompterScript) => void;
  updateScrollSpeed: (speed: number) => void;
  togglePlayback: () => void;
  resetPosition: () => void;
  setFontSize: (size: number) => void;
  setVisibility: (visible: boolean) => void;
}
```

### Persistence

- Script saved to project session state (via auto-save)
- Teleprompter state (speed, font size) saved to localStorage
- API key stored in `.env` file (not in git)

---

## 9. API / Service Contracts

### Electron IPC Handlers

```typescript
// src/main/ipc-handlers/ai.ts

/**
 * Handler: ai:generateScript
 * Generates script using OpenAI API
 * @param topic - User-provided topic string
 * @param duration - Requested duration in seconds
 * @param format - Optional format preference ('bullets' | 'paragraphs')
 * @returns Promise<ScriptGenerationResponse>
 */
ipcMain.handle('ai:generateScript', async (
  event,
  topic: string,
  duration: number,
  format?: 'bullets' | 'paragraphs'
): Promise<ScriptGenerationResponse> => {
  // Validate inputs
  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic is required');
  }
  if (duration < 15 || duration > 300) {
    throw new Error('Duration must be between 15 and 300 seconds');
  }
  
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. See OPENAI_SETUP.md');
  }
  
  // Call OpenAI API
  // ... implementation
  
  return {
    script: generatedText,
    wordCount: estimatedWordCount,
    estimatedReadTime: estimatedReadTime
  };
});
```

### Preload API

```typescript
// src/preload.ts additions

contextBridge.exposeInMainWorld('electron', {
  // ... existing APIs
  
  /**
   * Generates script using OpenAI API
   * @param topic - User-provided topic
   * @param duration - Requested duration in seconds
   * @param format - Optional format preference
   * @returns Generated script with metadata
   */
  ai: {
    generateScript: (
      topic: string,
      duration: number,
      format?: 'bullets' | 'paragraphs'
    ): Promise<ScriptGenerationResponse> => {
      return ipcRenderer.invoke('ai:generateScript', topic, duration, format);
    }
  }
});
```

### Usage in Renderer

```typescript
// In React component
const handleGenerateScript = async () => {
  try {
    setIsLoading(true);
    const response = await window.electron.ai.generateScript(
      topic,
      duration,
      'bullets'
    );
    setScript(response.script);
    setWordCount(response.wordCount);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Error Handling

- **Missing API Key**: Clear error message, link to setup docs
- **Network Failure**: "Unable to connect to OpenAI API. Check your internet connection."
- **Rate Limit**: "API rate limit exceeded. Please try again in a moment."
- **Timeout**: "Request timed out. Please try again."
- **Invalid Input**: Validation errors shown before API call

---

## 10. UI Components to Create/Modify

### New Components

- `src/components/TeleprompterModal.tsx` — Main modal container with view switching (Generator/Preview/Display)
- `src/components/ScriptGenerator.tsx` — Form for topic/duration input and Generate button
- `src/components/ScriptPreview.tsx` — Generated script display with Accept/Edit/Regenerate buttons
- `src/components/ScriptDisplay.tsx` — Scrolling teleprompter overlay with controls
- `src/types/teleprompter.ts` — TypeScript interfaces for teleprompter data structures

### Modified Components

- `src/components/WebcamRecordingModal.tsx` — Add teleprompter button and overlay integration
- `src/preload.ts` — Add AI API exposure
- `src/main.ts` — Register AI IPC handlers
- `src/main/ipc-handlers/ai.ts` — New IPC handler file for OpenAI integration

### Optional Store/State Management

- `src/store/teleprompterStore.ts` — Zustand store for teleprompter state (optional, can use React Context)

---

## 11. Integration Points

### Electron IPC Integration

- All AI API calls made from main process (never from renderer)
- IPC handler in `src/main/ipc-handlers/ai.ts`
- Registered in `src/main.ts` via `registerAiHandlers()`
- Preload exposes `window.electron.ai.generateScript()`

### Environment Configuration

- `.env` file for API key (not committed to git)
- `.env.example` template provided
- `dotenv` package loads environment variables in main process
- Setup instructions in `OPENAI_SETUP.md`

### State Management

- React Context or Zustand store for teleprompter state
- Script persists in project session (auto-save integration)
- Settings (speed, font size) in localStorage

### Webcam Recording Integration

- TeleprompterModal opens from Webcam stimulatingModal
- ScriptDisplay overlay renders above video preview
- Toggle visibility during recording
- State synchronized between modal and overlay

### OpenAI API

- Uses `openai` npm package (v4+)
- Model: GPT-4-turbo (default) or GPT-3.5-turbo (configurable)
- Prompt engineering: Generate script matching duration at 150 WPM
- Timeout: 10 seconds
- Error handling for all failure modes

---

## 12. Test Plan & Acceptance Gates

Reference testing standards from `prd-v1.md`.

### Happy Path

- [ ] **HP-1**: User generates script with valid topic/duration → Script generated in <10 seconds
- [ ] **HP-2**: User accepts generated script → Script saved and displayed in overlay
- [ ] **HP-3**: User starts auto-scroll → Text scrolls smoothly at 60fps
- [ ] **HP-4**: User adjusts scroll speed → Speed updates in real-time without jank
- [ ] **HP-5**: User records webcam with teleprompter → Overlay visible, scrolling continues

### Edge Cases

- [ ] **EC-1**: Empty topic input → Validation error shown, Generate disabled
- [ ] **EC-2**: Very long topic (>500 chars) → Truncation or error message
- [ ] **EC-3**: API timeout (>10 seconds) → Timeout error, Retry button available
- [ ] **EC-4**: Very long script (5 minutes) → Full script displayed, manual scroll available
- [ ] **EC-5**: Modal closed mid-generation → Script lost, user can regenerate
- [ ] **EC-6**: Speed slider at extremes (80/200 WPM) → Scroll works correctly at both speeds

### Error Cases

- [ ] **ERR-1**: Missing API key → Clear error message with setup instructions
- [ ] **ERR-2**: Invalid API key → Authentication error displayed
- [ ] **ERR-3**: Network failure → "Check internet connection" error
- [ ] **ERR-4**: API rate limit → Rate limit error with retry option
- [ ] **ERR-5**: Malformed API response → Graceful error handling

### Performance

- [ ] **PERF-1**: Script generation completes in <10 seconds
- [ ] **PERF-2**: Scroll animation maintains 60fps
- [ ] **PERF-3**: Modal opens in <100ms
- [ ] **PERF-4**: Speed adjustment updates without lag
- [ ] **PERF-5**: Overlay doesn't impact video preview performance

### Video Processing

- [ ] **VID-1**: Teleprompter overlay doesn't interfere with recording
- [ ] **VID-2**: Overlay hidden in exported video (not recorded)
- [ ] **VID-3**: Recording performance unchanged with teleprompter enabled

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:

- [ ] All UI components created (TeleprompterModal, ScriptGenerator, ScriptPreview, ScriptDisplay)
- [ ] TypeScript interfaces defined in `src/types/teleprompter.ts`
- [ ] AI IPC handler implemented in `src/main/ipc-handlers/ai.ts`
- [ ] Preload API exposes `window.electron.ai.generateScript()`
- [ ] OpenAI integration tested with real API calls
- [ ] TeleprompterModal integrated into WebcamRecordingModal
- [ ] Script persistence works (survives modal close/reopen)
- [ ] Scroll animation smooth at 60fps
- [ ] All error states handled gracefully
- [ ] Environment setup documented (`.env.example`, `OPENAI_SETUP.md`)
- [ ] All acceptance gates pass
- [ ] Manual testing checklist complete
- [ ] No console errors during test scenarios
- [ ] Code reviewed and ready for merge

---

## 14. Risks & Mitigations

- **Risk**: OpenAI API unavailable or slow → **Mitigation**: 10-second timeout, clear error message, retry button
- **Risk**: API costs unpredictable → **Mitigation**: Use GPT-3.5-turbo as default (cheaper), document costs in setup
- **Risk**: Script too long for duration → **Mitigation**: Show estimated read time, allow WPM adjustment
- **Risk**: Scroll jank during playback → **Mitigation**: Use requestAnimationFrame, test on various hardware
- **Risk**: API key security → **Mitigation**: Store in `.env` (not git), validate in main process only
- **Risk**: Network dependency → **Mitigation**: Clear offline error messages, allow manual script input
- **Risk**: Overlay impacts recording performance → **Mitigation**: Optimize render, ensure overlay not captured in video

---

## 15. Rollout & Telemetry

- **Feature flag**: No (always available if API key configured)
- **Metrics to track**:
  - Script generation success rate
  - Average generation time
  - Teleprompter usage during recordings
  - Scroll speed preferences
  - API error rates
- **Manual validation steps**:
  1. Generate script with valid inputs
  2. Verify script matches requested duration
  3. Test scroll speed adjustment
  4. Record video with teleprompter enabled
  5. Verify overlay not captured in exported video

---

## 16. Open Questions

- **Q1**: Should we support multiple scripts per session? → **Decision**: Single script for MVP, clear and regenerate for new script
- **Q2**: Should scripts be exportable as text files? → **Decision**: Out of scope for MVP
- **Q3**: Default model (GPT-4-turbo vs GPT-3.5-turbo)? → **Decision**: GPT-3.5-turbo for cost, configurable via env
- **Q4**: Should we cache generated scripts? → **Decision**: No caching for MVP, regenerate on demand

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future PRs:

- [ ] **Multi-language support**: Generate scripts in other languages
- [ ] **Script templates**: Pre-written templates by category
- [ ] **Voice tone/style**: Adjust script tone (formal, casual, technical)
- [ ] **Real-time transcription**: Generate scripts from live speech
- [ ] **Mirror mode**: Flip text horizontally for mirror setups
- [ ] **Remote control**: Control teleprompter from separate device
- [ ] **Script export**: Save scripts as .txt or .docx files
- [ ] **Collaboration**: Share and edit scripts with team
- [ ] **Custom fonts**: Font family and styling options
- [ ] **Keyboard shortcuts**: Space to pause, arrows to adjust speed
- [ ] **Scene markers**: Jump to specific sections in script
- [ ] **Teleprompter for screen recording**: Extend to screen capture mode

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?**
   - User generates script from topic → displays in teleprompter overlay → records video while reading

2. **Primary user and critical action?**
   - Content creator generating and reading scripts during webcam recording

3. **Must-have vs nice-to-have?**
   - Must: AI generation, scrolling display, speed control
   - Nice: Script editing, advanced formatting, mirror mode

4. **Video processing requirements?**
   - No FFmpeg usage (display-only overlay)
   - Overlay must not impact recording performance

5. **Performance constraints?**
   - Script generation: <10 seconds
   - Scroll animation: 60fps
   - Modal render: <100ms

6. **Error/edge cases to handle?**
   - Missing API key, network failure, API timeout, invalid inputs, very long scripts

7. **Data model changes?**
   - New TeleprompterScript and TeleprompterState interfaces
   - Script saved in project session state

8. **Electron IPC handlers required?**
   - `ai:generateScript` handler in main process

9. **UI entry points and states?**
   - Button in WebcamRecordingModal → TeleprompterModal → ScriptGenerator → ScriptPreview → ScriptDisplay

10. **File system implications?**
    - `.env` file for API key (user-created, not in git)
    - Script persisted in project session (auto-save)

11. **Dependencies or blocking integrations?**
    - `openai` npm package (v4+)
    - `dotenv` for environment variables
    - OpenAI API key (user-provided)

12. **Rollout strategy and metrics?**
    - Always available if API key configured
    - Track generation success, usage, error rates

13. **What is explicitly out of scope?**
    - Multi-language, templates, real-time transcription, mirror mode, export, collaboration

---

## Authoring Notes

- OpenAI API key must be stored securely (`.env` file, not in code)
- All AI calls from main process (never expose API key to renderer)
- Smooth scroll animation critical for user experience (use requestAnimationFrame)
- Error handling must be clear and actionable
- Script generation prompt should specify format and duration requirements
- Test with real OpenAI API key before considering complete
- Document setup process clearly in `OPENAI_SETUP.md`
- Reference `prd-v1.md` and `.cursorrules` throughout implementation

