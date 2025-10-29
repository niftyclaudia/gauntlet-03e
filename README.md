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

## Using the Packaged Native App

Once you've built the application, you can run it as a standalone macOS application.

### Building the App

1. Build the distributable:
   ```bash
   npm run make
   ```

2. The built app will be located at:
   ```
   out/make/zip/darwin/arm64/ollo-darwin-arm64-1.0.0.zip
   ```
   (or `x64` for Intel Macs)

### Installing & Launching

1. **Extract the ZIP file:**
   - Double-click the ZIP file to extract it
   - This creates an `ollo.app` bundle

2. **Move to Applications (optional):**
   - Drag `ollo.app` to your Applications folder for easy access

3. **Launch the app:**
   - Double-click `ollo.app` in Finder, or
   - Open from Terminal: `open ollo.app`
   - First launch may take a few seconds (< 5 seconds)

4. **Allow app permissions (first launch):**
   - macOS may prompt for permission to access files/folders
   - Grant permissions when prompted to enable video import/export

### Using the App

Once launched, the app functions identically to development mode:

- **Import videos**: Drag & drop MP4/MOV files into the library panel, or use File → Import
- **Edit timeline**: Drag clips from library to timeline, reorder by dragging, trim using handles
- **Preview**: Use playback controls to preview your sequence
- **Export**: Click Export button, choose output location, wait for processing

**Supported formats:**
- **Import**: MP4, MOV files
- **Export**: MP4 files (compatible with QuickTime, VLC, and other players)

### Troubleshooting

**App won't launch:**
- Ensure you're on macOS 10.15 (Catalina) or higher
- Check Console.app for error messages
- Try launching from Terminal: `open ollo.app`

**Video import/export fails:**
- Verify file permissions are granted
- Check that video files are valid MP4/MOV format
- Ensure you have sufficient disk space for exports

**FFmpeg errors:**
- The FFmpeg binary is bundled with the app
- If errors occur, check Console.app for detailed error messages

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

**Phase 2 - PR #2**: Video Import & Library Management ✅
- Drag & drop video import (MP4, MOV)
- File picker integration
- Video metadata extraction via FFmpeg
- Thumbnail generation
- Library panel with clip cards
- Error handling and validation

**Phase 3 - PR #3**: Timeline Editing ✅
- Drag clips from library to timeline
- Timeline reordering via drag & drop
- Timeline zoom controls (2% to 1000%)
- Playhead positioning
- Clip selection and highlighting

**Phase 4 - PR #4**: Video Playback ✅
- HTML5 video player integration
- Playback controls (play/pause, seek)
- Timeline synchronization
- Sequence preview mode
- Keyboard shortcuts (spacebar, arrow keys)

**Phase 5 - PR #5**: Auto-save & Session Recovery ✅
- Automatic project state saving (every 30 seconds)
- Session restore on app restart
- Graceful error handling for corrupted saves

**Phase 6 - PR #6**: Video Trimming ✅
- Trim handles on timeline clips
- Real-time trim preview
- Trim data persistence
- Visual trim indicators

**Phase 7 - PR #7**: Sequence Preview ✅
- Full timeline sequence playback
- Multi-clip preview with transitions
- Sequence timing calculations
- Preview controls

**Phase 8 - PR #8**: Video Export ✅
- FFmpeg-based video export pipeline
- Progress tracking and UI
- Export dialog with success/error states
- File format validation and processing

**Phase 9 - PR #9**: Error States & Polish ✅
- Toast notifications with auto-dismiss
- Library clip deletion with confirmation
- Improved error handling and user feedback
- Countdown timers for notifications

**Phase 10 - PR #10**: Build & Package ✅
- macOS app bundle creation
- FFmpeg binary bundling
- Standalone application distribution
- Performance optimization for packaged app

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
