/**
 * TypeScript definitions for window.electron API
 * 
 * This file provides type safety for the Electron API exposed via contextBridge
 * in preload.ts. As IPC handlers are added in future PRs, update this interface.
 */

export interface ElectronAPI {
  // IPC handlers will be added in PR-2+ for video operations:
  // extractVideoMetadata?: (filePath: string) => Promise<VideoMetadata>;
  // generateThumbnail?: (filePath: string) => Promise<string>;
  // exportVideo?: (clips: TimelineClip[], outputPath: string) => Promise<void>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

