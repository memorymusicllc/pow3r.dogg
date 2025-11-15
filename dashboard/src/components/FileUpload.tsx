import { useState, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  attackerId?: string;
  onUploadComplete?: () => void;
}

export default function FileUpload({ attackerId, onUploadComplete }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedBy, setUploadedBy] = useState('system');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAttackerId, setSelectedAttackerId] = useState(attackerId || '');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/markdown' && !selectedFile.name.endsWith('.md')) {
        setError('File must be a Markdown file (.md)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(false);

      // Preview file content
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsText(selectedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!selectedAttackerId) {
      setError('Please select or enter an attacker ID');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('attackerId', selectedAttackerId);
      formData.append('uploadedBy', uploadedBy);

      await apiClient.postFormData<{ success: boolean; result: unknown }>(
        '/admin/files/upload',
        formData
      );

      setSuccess(true);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'text/markdown' && !droppedFile.name.endsWith('.md')) {
        setError('File must be a Markdown file (.md)');
        return;
      }
      setFile(droppedFile);
      setError(null);
      setSuccess(false);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsText(droppedFile);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
        <h3 className="font-header text-xl mb-4">Upload Markdown File</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Attacker ID</label>
            <input
              type="text"
              value={selectedAttackerId}
              onChange={(e) => setSelectedAttackerId(e.target.value)}
              placeholder="Enter attacker ID"
              className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
              disabled={!!attackerId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Uploaded By</label>
            <input
              type="text"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="Your name or identifier"
              className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Markdown File</label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-true-black-border rounded-lg p-8 text-center hover:border-true-black-accent transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,text/markdown"
                onChange={handleFileSelect}
                className="hidden"
              />
              <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-true-black-text-muted" />
              <p className="text-true-black-text-muted mb-2">
                {file ? file.name : 'Click or drag to upload Markdown file'}
              </p>
              <p className="text-sm text-true-black-text-muted">Only .md files are supported</p>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="p-2 text-red-400 hover:bg-red-900/20 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              <span className="text-sm text-true-black-text-muted">{file.name}</span>
              <span className="text-sm text-true-black-text-muted">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 text-green-400">
              File uploaded successfully! Knowledge graph data has been extracted and stored.
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !file || !selectedAttackerId}
            className="w-full px-6 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-4">File Preview</h3>
          <div className="bg-true-black-bg rounded p-4 max-h-96 overflow-auto">
            <pre className="text-sm text-true-black-text whitespace-pre-wrap font-mono">
              {preview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

