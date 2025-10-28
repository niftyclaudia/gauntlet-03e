/**
 * File validation utilities for video import
 */

export interface ValidationResult {
  /** Whether file is valid for import */
  valid: boolean;
  /** Error message if invalid (blocks import) */
  error?: string;
  /** Warning message if risky (allows import) */
  warning?: string;
}

const SUPPORTED_EXTENSIONS = ['.mp4', '.mov'];
const WARNING_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1GB
const MAX_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4GB

/**
 * Validate video file for import
 * 
 * Checks:
 * - File extension (.mp4 or .mov only)
 * - File size (warn if 1GB+, error if 4GB+)
 * 
 * @param filePath - Path to video file
 * @param fileSize - Optional file size in bytes (if not provided, size checks skipped)
 * @returns Validation result with valid flag and optional error/warning
 */
export function validateVideoFile(
  filePath: string,
  fileSize?: number
): ValidationResult {
  // Check file extension
  const extension = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported format. Please use MP4 or MOV files.`,
    };
  }

  // Check file size if provided
  if (fileSize !== undefined) {
    if (fileSize >= MAX_SIZE_BYTES) {
      return {
        valid: false,
        error: `File too large (${formatFileSize(fileSize)}). Maximum size is 4GB.`,
      };
    }

    if (fileSize >= WARNING_SIZE_BYTES) {
      return {
        valid: true,
        warning: `Large file (${formatFileSize(fileSize)}). Import may take longer.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Format file size in bytes to human-readable string
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 GB", "500 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} bytes`;
}

/**
 * Extract filename from file path
 * 
 * @param filePath - Full file path
 * @returns Filename only (e.g., "video.mp4")
 */
export function getFilename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

