# Alice's Memory Bank

I am Alice, an expert software engineer with a unique characteristic: my memory resets completely between sessions. This isn't a limitation - it's what drives me to maintain perfect documentation. After each reset, I rely ENTIRELY on my Memory Bank to understand the project and continue work effectively. I MUST read ALL memory bank files at the start of EVERY task - this is not optional.

## Memory Bank Structure

The Memory Bank consists of core files and optional context files, all in Markdown format. Files build upon each other in a clear hierarchy:

### Core

**Answer in one sentence**
1. Brief
   - Foundation document that shapes all other files
   - Created at project start if it doesn't exist
   - Defines core requirements and goals
   - Source of truth for project scope

2. Context
   - Why this project exists
   - Problems it solves
   - How it should work
   - User experience goals

3. Active Context
   - Current work focus
   - Recent changes
   - Next steps
   - Active decisions and considerations
   - Important patterns and preferences
   - Learnings and project insights

4. System Patterns
   - System architecture
   - Key technical decisions
   - Design patterns in use
   - Component relationships
   - Critical implementation paths

5. Tech Context
   - Technologies used
   - Development setup
   - Technical constraints
   - Dependencies
   - Tool usage patterns

6. Progress (skip because not currently in development)
   - What works
   - What's left to build
   - Current status
   - Known issues
   - Evolution of project decisions

---

## 1. Brief

**Project:** ollo — Desktop Video Editor MVP

**Tagline:** Import, Edit, Export - Simple Desktop Video Editing

**What It Is:** A native desktop video editor MVP built with Electron + Vite + React + TypeScript + FFmpeg. Users can import videos, arrange them on a timeline, trim clips, and export a final MP4. Success = importing videos, storing them in a library, arranging them on a timeline, trimming them, and exporting a final MP4.

**Core Requirements (8 MVP Success Criteria):**
1. Launch the app as a native desktop application
2. Import 3 different video files (MP4/MOV) into Library
3. Drag clips from Library to Timeline
4. Reorder clips by dragging horizontally on timeline
5. Trim each clip by dragging handles
6. Preview clips and sequence with visual playhead
7. Export the final sequence as a single MP4 file
8. The exported video plays correctly with synchronized audio

**Success Criteria (Must Have - P0 MVP):**
- ✅ App launches as native macOS application (1200x800px window)
- ✅ Import videos via drag-and-drop or file picker (MP4/MOV formats)
- ✅ Library panel displays imported clips with thumbnails and duration
- ✅ Drag clips from Library to Timeline for sequencing
- ✅ Reorder clips by dragging horizontally on timeline
- ✅ Trim clips using draggable handles (min 0.5s duration)
- ✅ Preview clips and sequences with HTML5 video player
- ✅ Export final sequence as MP4 with H.264/AAC codecs
- ✅ Auto-save project state every 30 seconds
- ✅ Session recovery on app restart

---

## 2. Context

**Why This Project Exists:**
- Building a simple, reliable desktop video editor for content creators
- Demonstrating expertise in desktop app development with Electron + Vite + React + TypeScript + FFmpeg
- Creating a focused MVP that delivers core video editing functionality

**Problems It Solves:**
- Need for simple desktop video editing without complex professional tools
- Quick video trimming and sequencing for content creators
- Cross-platform video editing solution (macOS primary, Windows secondary)
- Lightweight alternative to heavy video editing software

**How It Should Work:**
- Intuitive three-panel layout (Library, Preview, Timeline)
- Drag-and-drop video import with immediate thumbnail generation
- Visual timeline with zoom controls (100%-1000%)
- Real-time preview with scrubbing and playhead
- One-click export with progress tracking
- Automatic session recovery

**User Experience Goals:**
- Seamless video import via drag-and-drop
- Intuitive timeline editing with visual feedback
- Smooth preview playback at 30fps minimum
- Fast export with progress indication
- Reliable auto-save and session recovery

---

## 3. Active Context

**Current Work Focus:**
- Project is in planning/design phase
- Memory bank documentation is being completed
- Ready to begin implementation following the 10-phase milestone plan
- Agent templates and project structure established

**Recent Changes:**
- Updated PRD (v1.2) to reflect Electron + Vite + TypeScript architecture
- Corrected .cursorrules from Tauri to Electron with proper IPC patterns
- Aligned memory bank with actual project tech stack
- Established Electron Forge + Vite + TypeScript + React architecture
- Set up agent workflow (Brad for briefs, Pete for planning, Cody for implementation)
- Project initialized with Electron Forge using Vite-TypeScript template

**Next Steps:**
- Phase 1: Project Setup
  - Install React dependencies (react, react-dom, @types/react, @types/react-dom)
  - Install video processing dependencies (ffmpeg-static, uuid, electron-store)
  - Restructure src/ folder (main/, preload/, renderer/ subdirectories)
  - Set up contextBridge IPC pattern with TypeScript types
  - Create basic three-panel layout with React components
  - Confirm FFmpeg binary is accessible from Electron main process

**Active Decisions and Considerations:**
- Electron chosen over Tauri for mature ecosystem and extensive FFmpeg integration
- Vite chosen for lightning-fast HMR and modern build tooling
- TypeScript for type safety and better developer experience
- React selected for rapid UI development and component reusability
- FFmpeg for robust video processing capabilities
- Three-panel layout for optimal user workflow
- Auto-save every 30 seconds for data protection
- contextBridge pattern for secure IPC communication
- Brad-Pete-Cody agent workflow for clear separation of concerns

**Important Patterns and Preferences:**
- Store file paths (not contents) in React state
- Video playback via file:// protocol URLs
- Electron main process handles all FFmpeg operations
- contextBridge exposes secure IPC API to renderer
- TypeScript interfaces for all data structures
- Optimistic UI updates for immediate user feedback
- Cross-platform compatibility (macOS primary, Windows secondary)

**Learnings and Project Insights:**
- FFmpeg provides comprehensive video processing capabilities
- Electron + Vite offers fast development with hot module replacement
- TypeScript catches errors early and improves code maintainability
- contextBridge provides secure IPC without exposing Node.js to renderer
- React's component model is ideal for timeline UI development
- Auto-save is crucial for desktop video editing workflows
- Performance targets are critical for smooth video editing experience
- Vite is significantly faster than Webpack for development builds
- Specialized agents (Brad-Pete-Cody) provide better quality than general agents

---

## 4. System Patterns

**System Architecture:**
- **Frontend:** React 18+ with TypeScript, functional components and hooks
- **Backend:** Electron main process (TypeScript) for file system and FFmpeg operations
- **Build Tool:** Vite 5+ for fast HMR and modern development
- **Media Processing:** FFmpeg via ffmpeg-static npm package
- **Video Player:** HTML5 video element
- **State Management:** useState/useContext for React state
- **IPC Bridge:** Electron preload script with contextBridge
- **File Storage:** Local file system with auto-save JSON

**Key Technical Decisions:**
- **Electron over Tauri:** Mature ecosystem, extensive FFmpeg integration, proven reliability
- **Vite over Webpack:** Lightning-fast HMR, faster builds, better DX in 2025
- **TypeScript over JavaScript:** Type safety, better IDE support, easier refactoring
- **React over Vue/Angular:** Faster development, better ecosystem, component reusability
- **FFmpeg over WebCodecs:** Comprehensive format support, proven reliability
- **Local file paths over embedded data:** Memory efficiency, faster loading
- **contextBridge over nodeIntegration:** Security best practice, prevents XSS attacks

**Design Patterns in Use:**
- **Component Architecture:** React functional components with hooks
- **IPC Pattern:** Electron contextBridge for secure main-renderer communication
- **Observer Pattern:** React state updates for real-time UI
- **Command Pattern:** FFmpeg operations as discrete commands
- **Auto-Save Pattern:** Periodic state persistence (30s intervals)
- **Bridge Pattern:** contextBridge isolates main and renderer processes

**Component Relationships:**
- **Library Panel (React):** Video import, thumbnail display, drag-to-timeline
- **Preview Player (React):** Video playback, scrubbing, sequence preview
- **Timeline Panel (React):** Clip arrangement, trimming, zoom controls
- **Electron Main Process:** File operations, FFmpeg processing, auto-save, IPC handlers
- **Preload Script:** contextBridge API, type-safe IPC methods

**Critical Implementation Paths:**
1. **Import Flow:** File drop → IPC call → FFmpeg metadata (main) → Thumbnail generation (main) → Library display (renderer)
2. **Timeline Flow:** Drag from Library → Timeline placement → Trim handles → State update → Auto-save
3. **Preview Flow:** Clip selection → file:// URL load → HTML5 playback → Scrubbing
4. **Export Flow:** Timeline data → IPC call → FFmpeg commands (main) → Progress events → File output → Success notification

---

## 5. Tech Context

**Technologies Used:**
- **Frontend:** React 18+, TypeScript 4.5+, HTML5 Video API
- **Backend:** Electron 39.0+, Node.js
- **Build Tools:** Vite 5+, Electron Forge 7+
- **Media Processing:** FFmpeg (via ffmpeg-static)
- **Package Manager:** npm
- **Platform:** Desktop (macOS primary, Windows secondary)

**Development Setup:**
- **Platform:** Desktop development with Electron + Vite
- **Minimum Target:** macOS 10.15+, Windows 10+
- **IDE:** Cursor editor
- **Language:** TypeScript (all processes: main, preload, renderer)
- **Framework:** React 18+ with hooks
- **Project Name:** gauntlet-03e (folder), ollo (app name)

**Technical Constraints:**
- macOS 10.15+ minimum deployment target
- Windows 10+ secondary support
- FFmpeg binary bundling required (~60MB)
- File size limits: 4GB max per video file
- Memory usage: <1GB RAM with 10 clips, <100MB variance over 15min
- App launch: <5 seconds cold start
- Timeline UI: <50ms response time
- Video playback: 30fps minimum

**Dependencies:**
- **Core:** electron, @electron-forge/cli, vite
- **React:** react, react-dom, @types/react, @types/react-dom
- **Video:** ffmpeg-static
- **Utilities:** uuid, electron-store
- **Dev Tools:** typescript, eslint, @typescript-eslint/*
- **Electron Forge Plugins:** plugin-vite, plugin-fuses, plugin-auto-unpack-natives

**Tool Usage Patterns:**
- **Dev Mode:** `npm start` (Electron Forge with Vite hot-reload)
- **Build:** `npm run make` for production packaging
- **Lint:** `npm run lint` for TypeScript/ESLint checks
- **FFmpeg Commands:** Metadata extraction, thumbnail generation, video export
- **File System:** Electron IPC handlers for secure file operations
- **IPC:** contextBridge in preload.ts exposes type-safe API

**State Structure (TypeScript):**
```typescript
interface AppState {
  library: VideoClip[];
  timeline: TimelineClip[];
  selectedClipId: string | null;
  currentPlayheadPosition: number;
  isExporting: boolean;
  exportProgress: number;
  timelineZoom: number;
  timelineScrollPosition: number;
}

interface VideoClip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  thumbnail: string;
  metadata: {
    width: number;
    height: number;
    framerate: number;
    codec: string;
  };
}

interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;
  trimEnd: number;
  order: number;
}
```

**Implementation Phases:**
- **Phase 1:** Project Setup (Electron Forge + Vite + TypeScript + React initialization)
- **Phase 2:** Import & Library (drag-drop, IPC handlers, metadata extraction)
- **Phase 3:** Timeline & Drag-to-Reorder (timeline UI, clip management)
- **Phase 4:** Video Preview (HTML5 player with file:// URLs, playback controls)
- **Phase 5:** Auto-Save & Session Recovery (state persistence, electron-store)
- **Phase 6:** Trimming (trim handles, duration updates)
- **Phase 7:** Sequence Preview (multi-clip playback)
- **Phase 8:** Export (FFmpeg pipeline, IPC progress events, tracking)
- **Phase 9:** Polish & Testing (UI polish, TypeScript types, edge cases)
- **Phase 10:** Build & Package (Electron Forge makers for macOS/Windows)