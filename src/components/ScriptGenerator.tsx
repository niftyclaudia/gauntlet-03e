/**
 * ScriptGenerator Component
 * 
 * Form component for generating scripts via AI
 * Accepts topic, duration, and optional format preference
 */

import React, { useState } from 'react';

interface ScriptGeneratorProps {
  onGenerate: (topic: string, duration: number, format?: 'bullets' | 'paragraphs') => void;
  isLoading: boolean;
  error: string | null;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
  onGenerate,
  isLoading,
  error,
}) => {
  const [topic, setTopic] = useState('');
  const [durationInSeconds, setDurationInSeconds] = useState<number>(30);
  const [format, setFormat] = useState<'bullets' | 'paragraphs'>('bullets');

  const durationOptions = [
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isLoading) {
      onGenerate(topic.trim(), durationInSeconds, format);
    }
  };

  return (
    <div className="script-generator">
      <h3 className="script-generator-title">Generate Script</h3>
      
      <form onSubmit={handleSubmit} className="script-generator-form">
        <div className="script-generator-field">
          <label htmlFor="topic" className="script-generator-label">
            What should the script be about?
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., five reason challenging yourself is good, overview of my mvp..."
            className="script-generator-textarea"
            maxLength={500}
            rows={3}
            disabled={isLoading}
            required
          />
          <div className="script-generator-char-count">
            {topic.length}/500 characters
          </div>
        </div>

        <div className="script-generator-field">
          <label htmlFor="duration" className="script-generator-label">
            Duration
          </label>
          <select
            id="duration"
            value={durationInSeconds}
            onChange={(e) => setDurationInSeconds(Number(e.target.value))}
            className="script-generator-select"
            disabled={isLoading}
            required
          >
            {durationOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="script-generator-field">
          <label htmlFor="format" className="script-generator-label">
            Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'bullets' | 'paragraphs')}
            className="script-generator-select"
            disabled={isLoading}
          >
            <option value="bullets">Bullet Points</option>
            <option value="paragraphs">Paragraphs</option>
          </select>
        </div>

        {error && (
          <div className="script-generator-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="script-generator-button"
          disabled={!topic.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <span className="script-generator-spinner"></span>
              Generating script...
            </>
          ) : (
            'Generate Script'
          )}
        </button>
      </form>
    </div>
  );
};

export default ScriptGenerator;

