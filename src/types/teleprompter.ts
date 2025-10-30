/**
 * Teleprompter type definitions
 * 
 * Defines interfaces for AI-powered teleprompter feature (PR-17)
 */

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
  scrollSpeed: number;                // Scroll speed in WPM (80-200, default 150)
}

/**
 * AI script generation request
 */
export interface ScriptGenerationRequest {
  topic: string;        // User-provided topic (max 500 chars)
  duration: number;     // Requested duration in seconds
  format?: 'bullets' | 'paragraphs';  // Optional format preference
  feedback?: string;    // Optional feedback for regeneration
}

/**
 * AI script generation response
 */
export interface ScriptGenerationResponse {
  script: string;       // Generated script text
  wordCount: number;    // Estimated word count
  estimatedReadTime: number;  // Estimated read time in seconds
}

