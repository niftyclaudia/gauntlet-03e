/**
 * Export validation utilities for advanced export options
 * 
 * Validates export settings and provides warnings/errors for invalid configurations
 */

import { AdvancedExportSettings, ExportPreset, VideoClip } from '../types/video';

/**
 * Export preset definitions for platform-optimized exports
 */
export const EXPORT_PRESETS: ExportPreset[] = [
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

/**
 * Validation result for export settings
 */
export interface ExportValidationResult {
  /** Whether settings are valid (no errors) */
  valid: boolean;
  /** Warning messages (non-blocking) */
  warnings: string[];
  /** Error messages (blocking) */
  errors: string[];
}

/**
 * Validate advanced export settings against source clips
 * 
 * @param settings - Advanced export settings to validate
 * @param sourceClips - Source clips to check against
 * @returns Validation result with warnings/errors
 */
export function validateAdvancedExportSettings(
  settings: AdvancedExportSettings,
  sourceClips: VideoClip[]
): ExportValidationResult {
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
  
  // Minimum resolution check
  if (targetWidth < 480 || targetHeight < 270) {
    errors.push(`Resolution too low: minimum supported is 480x270 (got ${targetWidth}x${targetHeight})`);
  }
  
  // Maximum resolution check (4K)
  if (targetWidth > 3840 || targetHeight > 2160) {
    errors.push(`Resolution too high: maximum supported is 3840x2160 (4K) (got ${targetWidth}x${targetHeight})`);
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

/**
 * Get export preset by ID
 * 
 * @param id - Preset ID
 * @returns Export preset or undefined if not found
 */
export function getExportPreset(id: string): ExportPreset | undefined {
  return EXPORT_PRESETS.find(preset => preset.id === id);
}

/**
 * Get default export preset (YouTube)
 * 
 * @returns Default export preset
 */
export function getDefaultExportPreset(): ExportPreset {
  return EXPORT_PRESETS.find(preset => preset.id === 'youtube')!;
}

/**
 * Create advanced export settings from preset
 * 
 * @param presetId - Preset ID
 * @returns Advanced export settings with preset selected
 */
export function createAdvancedExportSettings(presetId: string): AdvancedExportSettings {
  const preset = getExportPreset(presetId) || getDefaultExportPreset();
  
  return {
    preset,
    customResolution: null,
    customBitrate: null,
    customFramerate: null
  };
}
