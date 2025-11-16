import { useState, useRef } from 'react';
import { apiClient } from '../api/client';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface ImageLookupResult {
  imageHash: string;
  reverseSearch: {
    tineye?: Array<{ url: string; domain: string; date?: string }>;
    google?: Array<{ url: string; title: string; source: string }>;
    yandex?: Array<{ url: string; title: string }>;
  };
  faceRecognition: {
    facesDetected: number;
    matches?: Array<{ confidence: number; identity?: string; source: string }>;
  };
  metadata: { width?: number; height?: number; format?: string };
  sources: string[];
}

export default function ImageLookup() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleLookup = async () => {
    if (!file) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.postFormData<{ success: boolean; result: ImageLookupResult }>(
        '/admin/osint/image',
        formData
      );
      setResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[520px] mx-auto w-full">
      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Image File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border-2 border-dashed border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-200 flex items-center justify-center gap-2 text-true-black-text theme-light:text-light-text theme-glass:text-glass-text"
            >
              <PhotoIcon className="w-6 h-6" />
              {file ? file.name : 'Select Image'}
            </button>
          </div>

          {preview && (
            <div className="mt-4">
              <img src={preview} alt="Preview" className="max-w-full max-h-64 rounded" />
            </div>
          )}

          <button
            onClick={handleLookup}
            disabled={loading || !file}
            className="w-full px-6 py-2.5 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white font-medium disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
            <h3 className="font-header text-xl mb-4">Face Recognition</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-true-black-text-muted">Faces Detected</div>
                <div className="text-lg font-bold">{result.faceRecognition.facesDetected}</div>
              </div>
              {result.faceRecognition.matches && result.faceRecognition.matches.length > 0 && (
                <div>
                  <div className="text-sm text-true-black-text-muted">Matches</div>
                  <div className="text-lg font-bold">{result.faceRecognition.matches.length}</div>
                </div>
              )}
            </div>
            {result.faceRecognition.matches && result.faceRecognition.matches.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.faceRecognition.matches.map((match, i) => (
                  <div key={i} className="p-3 bg-true-black-bg rounded">
                    <div className="flex justify-between">
                      <div>{match.identity || 'Unknown'}</div>
                      <div className="text-sm text-true-black-text-muted">
                        {(match.confidence * 100).toFixed(1)}% confidence
                      </div>
                    </div>
                    <div className="text-sm text-true-black-text-muted">{match.source}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {Object.keys(result.reverseSearch).length > 0 && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Reverse Image Search</h3>
              {result.reverseSearch.tineye && result.reverseSearch.tineye.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">TinEye ({result.reverseSearch.tineye.length} results)</h4>
                  <div className="space-y-2">
                    {result.reverseSearch.tineye.slice(0, 5).map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-2 text-true-black-accent hover:underline"
                      >
                        {r.domain} {r.date && `(${r.date})`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {result.reverseSearch.google && result.reverseSearch.google.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Google ({result.reverseSearch.google.length} results)</h4>
                  <div className="space-y-2">
                    {result.reverseSearch.google.slice(0, 5).map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-2 text-true-black-accent hover:underline"
                      >
                        {r.title} - {r.source}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
            <h3 className="font-header text-xl mb-4">Image Hash</h3>
            <code className="text-sm text-true-black-text-muted break-all">{result.imageHash}</code>
          </div>

          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
            <h3 className="font-header text-xl mb-4">Sources</h3>
            <div className="flex flex-wrap gap-2">
              {result.sources.map((source, i) => (
                <span key={i} className="px-3 py-1 bg-true-black-bg rounded text-sm">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

