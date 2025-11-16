import { useState } from 'react';
import { apiClient } from '../api/client';

interface BusinessLookupResult {
  businessName: string;
  registration: {
    registeredName?: string;
    registrationNumber?: string;
    registrationDate?: string;
    jurisdiction?: string;
    status?: string;
    owners?: Array<{ name: string; role: string }>;
  };
  directory: {
    linkedIn?: { url: string; employees?: number; industry?: string; headquarters?: string };
    crunchbase?: { url: string; funding?: number; employees?: number };
    website?: string;
    description?: string;
  };
  financial?: { revenue?: number; employees?: number; industry?: string };
  domains: string[];
  emails: string[];
  timeline: Array<{ date: string; event: string; source: string }>;
  sources: string[];
}

export default function BusinessLookup() {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BusinessLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!businessName) {
      setError('Please enter a business name');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.post<{ success: boolean; result: BusinessLookupResult }>(
        '/admin/osint/business',
        { businessName }
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
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Company Name Inc."
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
          {Object.keys(result.registration).length > 0 && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Registration</h3>
              <div className="grid grid-cols-2 gap-4">
                {result.registration.registeredName && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Registered Name</div>
                    <div className="text-lg">{result.registration.registeredName}</div>
                  </div>
                )}
                {result.registration.registrationNumber && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Registration Number</div>
                    <div className="text-lg">{result.registration.registrationNumber}</div>
                  </div>
                )}
                {result.registration.jurisdiction && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Jurisdiction</div>
                    <div className="text-lg">{result.registration.jurisdiction}</div>
                  </div>
                )}
                {result.registration.status && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Status</div>
                    <div className="text-lg">{result.registration.status}</div>
                  </div>
                )}
              </div>
              {result.registration.owners && result.registration.owners.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-true-black-text-muted mb-2">Owners</div>
                  <div className="space-y-1">
                    {result.registration.owners.map((owner, i) => (
                      <div key={i} className="text-sm">
                        {owner.name} - {owner.role}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {Object.keys(result.directory).length > 0 && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Directory Information</h3>
              {result.directory.website && (
                <div className="mb-4">
                  <div className="text-sm text-true-black-text-muted">Website</div>
                  <a href={result.directory.website} target="_blank" rel="noopener noreferrer" className="text-true-black-accent hover:underline">
                    {result.directory.website}
                  </a>
                </div>
              )}
              {result.directory.linkedIn && (
                <div className="mb-4">
                  <div className="text-sm text-true-black-text-muted">LinkedIn</div>
                  <a href={result.directory.linkedIn.url} target="_blank" rel="noopener noreferrer" className="text-true-black-accent hover:underline">
                    {result.directory.linkedIn.url}
                  </a>
                  {result.directory.linkedIn.employees && (
                    <div className="text-sm text-true-black-text-muted mt-1">
                      {result.directory.linkedIn.employees} employees
                    </div>
                  )}
                </div>
              )}
              {result.directory.description && (
                <div>
                  <div className="text-sm text-true-black-text-muted">Description</div>
                  <div className="text-sm">{result.directory.description}</div>
                </div>
              )}
            </div>
          )}

          {result.financial && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Financial Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {result.financial.revenue && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Revenue</div>
                    <div className="text-lg">${result.financial.revenue.toLocaleString()}</div>
                  </div>
                )}
                {result.financial.employees && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Employees</div>
                    <div className="text-lg">{result.financial.employees}</div>
                  </div>
                )}
                {result.financial.industry && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Industry</div>
                    <div className="text-lg">{result.financial.industry}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.domains.length > 0 && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Associated Domains</h3>
              <div className="space-y-1">
                {result.domains.map((domain, i) => (
                  <div key={i} className="text-sm">{domain}</div>
                ))}
              </div>
            </div>
          )}

          {result.emails.length > 0 && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Associated Emails</h3>
              <div className="space-y-1">
                {result.emails.map((email, i) => (
                  <div key={i} className="text-sm">{email}</div>
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

