import { useState } from 'react';
import { apiClient, mcpClient } from '../api/client';

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
      // Try MCP tool first for comprehensive OSINT unmasking
      const mcpResult = await mcpClient.callTool<{
        success: boolean;
        result: {
          email?: string;
          phone?: string;
          username?: string;
          domain?: string;
          name?: string;
          identities?: Array<{
            email?: string;
            phone?: string;
            username?: string;
            name?: string;
            socialMedia?: Array<{ platform: string; username: string; url: string }>;
          }>;
          breaches?: Array<{ name: string; date: string; description?: string }>;
          sources?: string[];
        };
      }>('osint_full_unmask', { email });

      if (mcpResult.success && mcpResult.data?.result) {
        // Transform MCP result to EmailLookupResult format
        const mcpData = mcpResult.data.result;
        const transformedResult: EmailLookupResult = {
          email: mcpData.email || email,
          verification: {
            valid: true, // Assume valid if MCP returns data
            deliverable: true,
            disposable: false,
            freeProvider: email.includes('gmail.com') || email.includes('yahoo.com') || email.includes('hotmail.com'),
            score: 0.8,
          },
          breaches: mcpData.breaches || [],
          domain: {
            name: email.split('@')[1] || '',
            mxRecords: [],
            spfRecord: false,
            dkimRecord: false,
          },
          socialMedia: mcpData.identities?.[0]?.socialMedia || [],
          timeline: [],
          sources: mcpData.sources || ['MCP OSINT'],
        };
        setResult(transformedResult);
      } else {
        // Fallback to REST API if MCP fails or returns no data
        throw new Error(mcpResult.error || 'MCP lookup returned no data');
      }
    } catch (mcpErr) {
      // Fallback to REST API
      try {
        const response = await apiClient.post<{ success: boolean; result: EmailLookupResult }>(
          '/admin/osint/email',
          { email }
        );
        setResult(response.result);
      } catch (restErr) {
        setError(restErr instanceof Error ? restErr.message : 'Lookup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[520px] mx-auto w-full">
      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              className="w-full px-4 py-2.5 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:ring-2 focus:ring-true-black-accent theme-light:focus:ring-light-accent theme-glass:focus:ring-glass-accent transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLookup}
              disabled={loading}
              className="px-6 py-2.5 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white font-medium disabled:opacity-50 transition-all duration-200"
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
          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
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
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
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
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
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

