# ollo

**ollo** — Desktop video editor for macOS

A native Electron-based video editing application built with React, TypeScript, and FFmpeg.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **macOS**: 10.15 (Catalina) or higher (primary platform for MVP)

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gauntlet-03e
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## Development

### Start Development Mode

Launch the app with hot module replacement:

```bash
npm start
```

The app will open in Electron with DevTools enabled automatically. Any changes to React components or CSS will hot-reload instantly.

### Project Structure

```
gauntlet-03e/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script (contextBridge)
│   ├── renderer.ts          # React app entry point
│   ├── App.tsx              # Root React component
│   ├── index.css            # Global styles
│   ├── components/          # React components
│   │   ├── Library.tsx      # Left panel: video library
│   │   ├── VideoPlayer.tsx  # Center panel: video preview
│   │   └── Timeline.tsx     # Bottom panel: timeline
│   └── renderer/
│       └── types/
│           └── electron.d.ts # TypeScript definitions
├── index.html               # HTML entry point
├── forge.config.ts          # Electron Forge configuration
├── vite.*.config.ts         # Vite configuration files
└── package.json
```

### Architecture

- **Main Process** (`src/main.ts`): Electron main process, creates windows, handles app lifecycle
- **Preload Script** (`src/preload.ts`): Bridges main and renderer with contextBridge (security)
- **Renderer Process** (`src/renderer.ts`): React application running in browser context
- **IPC Communication**: Secure communication via contextBridge (handlers added in future PRs)

---

## Building

### Package Application

Build the application for your platform:

```bash
npm run package
```

Output: `out/ollo-darwin-{arch}/ollo.app`

### Create Distributable

Create platform-specific installers:

```bash
npm run make
```

Output: `out/make/` directory with distributable files

---

## Tech Stack

- **Electron**: Desktop application framework
- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **FFmpeg**: Video processing (ffmpeg-static bundled)

---

## Development Workflow

1. **Feature branches**: Create from `develop` branch
2. **Naming**: `feat/pr-{number}-{feature-name}`
3. **Pull requests**: Target `develop` branch (not `main`)
4. **Testing**: Manual validation with real video files (see `prd-v1.md`)

---

## Current Status

**Phase 1 - PR #1**: Application Launch & Window Setup ✅
- Electron app launches with three-panel layout
- Dark theme UI with empty states
- Window configuration (1200x800px, minimum 1280x720px)
- React + TypeScript foundation

**Upcoming**:
- PR #2: Video Import & Library Management
- PR #3: Timeline Editing
- PR #4: Video Playback
- PR #5: Video Export

---

## Performance Targets

Per `prd-v1.md`:
- **App load time**: < 5 seconds (cold start)
- **UI responsiveness**: < 50ms for interactions
- **Video playback**: Smooth 30fps minimum (1080p H.264)
- **Memory usage**: < 1GB with 10 clips
- **Export performance**: < 5 minutes for 2-minute 1080p video

---

## Documentation

- **PRD v1**: `prd-v1.md` — Complete product requirements
- **Feature PRDs**: `docs/prds/pr-{number}-prd.md`
- **Development Rules**: `.cursorrules` — Code standards and patterns

---

## License

MIT

---

## Support

macOS only for MVP. Windows support planned for future releases.
