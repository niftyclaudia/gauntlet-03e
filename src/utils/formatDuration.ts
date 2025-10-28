/**
 * Utility to format duration in seconds to MM:SS display format
 */

/**
 * Format duration from seconds to MM:SS string
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "02:05" for 125 seconds)
 * 
 * @example
 * formatDuration(125) // "02:05"
 * formatDuration(65) // "01:05"
 * formatDuration(3725) // "62:05" (over 1 hour shows as minutes)
 */
export function formatDuration(seconds: number): string {
  // Handle edge cases
  if (seconds < 0 || isNaN(seconds)) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  // Pad with leading zeros
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(remainingSeconds).padStart(2, '0');

  return `${minutesStr}:${secondsStr}`;
}

