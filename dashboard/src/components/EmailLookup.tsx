import { useState } from 'react';
import { apiClient } from '../api/client';

interface EmailLookupResult {
  email: string;
  verification: {
    valid: boolean;
    deliverable: boolean;
    disposable: boolean;
    freeProvider: boolean;
    score: number;
  };
  breaches: Array<{ name: string; date: string; description?: string }>;
  domain: { name: string; mxRecords?: string[]; spfRecord?: boolean; dkimRecord?: boolean };
  socialMedia: Array<{ platform: string; username: string; url: string }>;
  timeline: Array<{ date: string; event: string; source: string }>;
  sources: string[];
}

export default function EmailLookup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.post<{ success: boolean; result: EmailLookupResult }>(
        '/admin/osint/email',
        { email }
      );
      setResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
              onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLookup}
              disabled={loading}
              className="px-6 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white disabled:opacity-50"
            >
              {loading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
            <h3 className="font-header text-xl mb-4">Verification</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-true-black-text-muted">Valid</div>
                <div className="text-lg font-bold">{result.verification.valid ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-sm text-true-black-text-muted">Deliverable</div>
                <div className="text-lg font-bold">{result.verification.deliverable ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-sm text-true-black-text-muted">Score</div>
                <div className="text-lg font-bold">{result.verification.score.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-true-black-text-muted">Disposable</div>
                <div className="text-lg font-bold">{result.verification.disposable ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>

          {result.breaches.length > 0 && (
            <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
              <h3 className="font-header text-xl mb-4">Data Breaches ({result.breaches.length})</h3>
              <div className="space-y-2">
                {result.breaches.map((breach, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-true-black-border">
                    <div>
                      <div className="font-medium">{breach.name}</div>
                      {breach.description && <div className="text-sm text-true-black-text-muted">{breach.description}</div>}
                    </div>
                    <div className="text-sm text-true-black-text-muted">{breach.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.socialMedia.length > 0 && (
            <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
              <h3 className="font-header text-xl mb-4">Social Media</h3>
              <div className="space-y-2">
                {result.socialMedia.map((social, i) => (
                  <a
                    key={i}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 text-true-black-accent hover:underline"
                  >
                    {social.platform}: {social.username}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
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

