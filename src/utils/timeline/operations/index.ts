/**
 * Timeline Operations Index
 * 
 * Exports all timeline operation functions
 */

export { insertClip, type InsertClipParams, type InsertClipResult } from './insert';
export { deleteClip, type DeleteClipParams } from './delete';
export { moveClip, type MoveClipParams } from './move';
export { splitClip, type SplitClipParams, type SplitClipResult } from './split';
export { trimClip, type TrimClipParams } from './trim';

