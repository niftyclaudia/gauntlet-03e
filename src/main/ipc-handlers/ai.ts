/**
 * AI IPC handlers for OpenAI script generation
 * 
 * Handles AI-powered teleprompter script generation using OpenAI API
 * All API calls made from main process to keep API key secure
 */

import { ipcMain } from 'electron';
import OpenAI from 'openai';
import { ScriptGenerationRequest, ScriptGenerationResponse } from '../../types/teleprompter';

/**
 * Register AI IPC handlers
 * Called from main.ts on app initialization
 */
export function registerAiHandlers(): void {
  console.log('[AI] Registering AI IPC handlers...');

  /**
   * Handler: ai:generateScript
   * Generates script using OpenAI API
   * @param topic - User-provided topic string
   * @param duration - Requested duration in seconds
   * @param format - Optional format preference ('bullets' | 'paragraphs')
   * @param feedback - Optional feedback for regeneration
   * @returns Promise<ScriptGenerationResponse>
   */
  ipcMain.handle('ai:generateScript', async (
    _event,
    topic: string,
    duration: number,
    format?: 'bullets' | 'paragraphs',
    feedback?: string
  ): Promise<ScriptGenerationResponse> => {
    try {
      // Validate inputs
      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        throw new Error('Topic is required');
      }

      if (topic.length > 500) {
        throw new Error('Topic must be 500 characters or less');
      }

      if (typeof duration !== 'number' || isNaN(duration) || duration < 15 || duration > 300) {
        throw new Error('Duration must be between 15 and 300 seconds');
      }

      // Get API key from environment
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your-openai-api-key-here') {
        throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file. See OPENAI_SETUP.md for instructions.');
      }

      // Get model from environment (default: gpt-3.5-turbo)
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Calculate target word count (150 WPM is standard reading speed)
      const wordsPerSecond = 150 / 60; // 2.5 words per second
      const targetWordCount = Math.round(duration * wordsPerSecond);

      // Build prompt based on format preference
      const formatInstruction = format === 'bullets' 
        ? 'Format the script as bullet points, with each bullet being a concise statement or phrase.'
        : 'Format the script as flowing paragraphs with natural transitions.';

      const feedbackInstruction = feedback 
        ? `\n\nImportant: Please incorporate this feedback: ${feedback}`
        : '';

      const systemPrompt = `You are a professional script writer creating teleprompter scripts for video content.
Your scripts should be clear, conversational, and easy to read while maintaining eye contact with the camera.
Write scripts that sound natural when spoken aloud.`;

      const userPrompt = `Write a teleprompter script about: "${topic.trim()}"
Target duration: ${duration} seconds (approximately ${targetWordCount} words at 150 words per minute).
${formatInstruction}
${feedbackInstruction}

Please write a script that matches the target duration when read at a natural pace of 150 words per minute.`;

      console.log(`[AI] Generating script: topic="${topic}", duration=${duration}s, format=${format || 'default'}`);

      // Call OpenAI API with timeout
      const completionPromise = openai.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: Math.round(targetWordCount * 1.5), // Allow some buffer for tokens
      });

      // Add 10-second timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
      });

      const completion = await Promise.race([completionPromise, timeoutPromise]);
      
      const generatedText = completion.choices[0]?.message?.content?.trim() || '';

      if (!generatedText) {
        throw new Error('Received empty response from OpenAI API');
      }

      // Calculate word count and estimated read time
      const wordCount = generatedText.split(/\s+/).filter(word => word.length > 0).length;
      const estimatedReadTime = Math.round((wordCount / 150) * 60); // in seconds

      console.log(`[AI] Script generated successfully: ${wordCount} words, ~${estimatedReadTime}s read time`);

      return {
        script: generatedText,
        wordCount,
        estimatedReadTime,
      };
    } catch (error: any) {
      console.error('[AI] Script generation error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
          throw new Error('Unable to connect to OpenAI API. Please check your internet connection and try again.');
        }

        // Authentication errors
        if (error.message.includes('401') || error.message.includes('Invalid API key') || error.message.includes('authentication')) {
          throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in the .env file.');
        }

        // Rate limit errors
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error('API rate limit exceeded. Please try again in a moment.');
        }

        // Timeout errors
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          throw new Error('Request timed out. Please try again.');
        }

        // Re-throw original error if not handled above
        throw error;
      }

      // Unknown error type
      throw new Error(`Failed to generate script: ${error?.message || 'Unknown error'}`);
    }
  });

  console.log('[AI] AI handlers registered successfully');
}

