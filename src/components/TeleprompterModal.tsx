/**
 * TeleprompterModal Component
 * 
 * Main modal container for teleprompter feature
 * Manages view switching between ScriptGenerator and ScriptPreview
 */

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ScriptGenerator from './ScriptGenerator';
import ScriptPreview from './ScriptPreview';
import { TeleprompterScript } from '../types/teleprompter';

interface TeleprompterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScriptAccepted: (script: TeleprompterScript) => void;
  existingScript?: TeleprompterScript | null;
}

type ViewState = 'generator' | 'preview';

const TeleprompterModal: React.FC<TeleprompterModalProps> = ({
  isOpen,
  onClose,
  onScriptAccepted,
  existingScript,
}) => {
  const [view, setView] = useState<ViewState>('generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [estimatedReadTime, setEstimatedReadTime] = useState<number>(0);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentDuration, setCurrentDuration] = useState<number>(30);
  const [currentFormat, setCurrentFormat] = useState<'bullets' | 'paragraphs'>('bullets');
  const [regenerationFeedback, setRegenerationFeedback] = useState<string | undefined>();

  if (!isOpen) return null;

  const handleGenerate = async (
    topic: string,
    duration: number,
    format?: 'bullets' | 'paragraphs'
  ) => {
    setIsGenerating(true);
    setError(null);
    setCurrentTopic(topic);
    setCurrentDuration(duration);
    setCurrentFormat(format || 'bullets');

    try {
      const response = await window.electron.ai.generateScript(
        topic,
        duration,
        format,
        regenerationFeedback
      );

      setGeneratedScript(response.script);
      setWordCount(response.wordCount);
      setEstimatedReadTime(response.estimatedReadTime);
      setView('preview');
      setRegenerationFeedback(undefined); // Clear feedback after use
    } catch (err: any) {
      setError(err.message || 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    const script: TeleprompterScript = {
      id: uuidv4(),
      content: generatedScript,
      topic: currentTopic,
      duration: currentDuration,
      wordCount,
      estimatedReadTime,
      createdAt: Date.now(),
      isAiGenerated: true,
    };

    onScriptAccepted(script);
    onClose();
  };

  const handleEdit = (editedScript: string) => {
    setGeneratedScript(editedScript);
    // Recalculate word count for edited script
    const newWordCount = editedScript.split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(newWordCount);
    setEstimatedReadTime(Math.round((newWordCount / 150) * 60));
  };

  const handleRegenerate = (feedback?: string) => {
    setRegenerationFeedback(feedback);
    handleGenerate(currentTopic, currentDuration, currentFormat);
  };

  const handleClose = () => {
    // Reset state when closing
    setView('generator');
    setError(null);
    setGeneratedScript('');
    setRegenerationFeedback(undefined);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <h2 className="modal-title">AI Teleprompter</h2>

        {view === 'generator' && (
          <ScriptGenerator
            onGenerate={handleGenerate}
            isLoading={isGenerating}
            error={error}
          />
        )}

        {view === 'preview' && (
          <ScriptPreview
            script={generatedScript}
            wordCount={wordCount}
            estimatedReadTime={estimatedReadTime}
            onAccept={handleAccept}
            onEdit={handleEdit}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
};

export default TeleprompterModal;

