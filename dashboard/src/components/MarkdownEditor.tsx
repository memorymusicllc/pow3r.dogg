import { useState } from 'react';

interface MarkdownEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  onCancel?: () => void;
}

export default function MarkdownEditor({ initialContent = '', onSave, onCancel }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);

  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-header text-xl">Markdown Editor</h3>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-true-black-surface border border-true-black-border rounded text-true-black-text hover:bg-true-black-bg"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white"
          >
            Save
          </button>
        </div>
      </div>

      <div className="bg-true-black-surface border border-true-black-border rounded-lg">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-96 px-4 py-3 bg-true-black-bg border-0 rounded-lg text-true-black-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-true-black-accent"
          placeholder="# Markdown Content

## Entities
- Person: John Doe
- Organization: Acme Corp
- Location: New York, NY

## Relationships
- John Doe is related to Acme Corp
- Acme Corp located at New York, NY

## Facts
- John Doe - works_at - Acme Corp
- Acme Corp - founded_in - 2020"
        />
      </div>

      <div className="bg-true-black-surface border border-true-black-border rounded-lg p-4">
        <h4 className="font-medium mb-2">Preview</h4>
        <div className="prose prose-invert max-w-none">
          <div className="text-sm text-true-black-text whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}

