import { useState } from 'react';
import { apiClient } from '../api/client';

interface AddressLookupResult {
  address: string;
  validated: boolean;
  geocoding: {
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  propertyRecords?: {
    owner?: string;
    propertyType?: string;
    assessedValue?: number;
    yearBuilt?: number;
  };
  associatedIdentities: Array<{
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  }>;
  timeline: Array<{ date: string; event: string; source: string }>;
  sources: string[];
}

export default function AddressLookup() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AddressLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!address) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.post<{ success: boolean; result: AddressLookupResult }>(
        '/admin/osint/address',
        { address }
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
            <label className="block text-sm font-medium mb-2">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State, ZIP"
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
            <h3 className="font-header text-xl mb-4">Validation & Geocoding</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-true-black-text-muted">Validated</div>
                <div className="text-lg font-bold">{result.validated ? 'Yes' : 'No'}</div>
              </div>
              {result.geocoding.latitude && result.geocoding.longitude && (
                <>
                  <div>
                    <div className="text-sm text-true-black-text-muted">Latitude</div>
                    <div className="text-lg font-bold">{result.geocoding.latitude.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-true-black-text-muted">Longitude</div>
                    <div className="text-lg font-bold">{result.geocoding.longitude.toFixed(6)}</div>
                  </div>
                </>
              )}
            </div>
            {result.geocoding.formattedAddress && (
              <div className="mt-4">
                <div className="text-sm text-true-black-text-muted">Formatted Address</div>
                <div className="text-lg">{result.geocoding.formattedAddress}</div>
              </div>
            )}
          </div>

          {result.propertyRecords && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Property Records</h3>
              <div className="grid grid-cols-2 gap-4">
                {result.propertyRecords.owner && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Owner</div>
                    <div className="text-lg">{result.propertyRecords.owner}</div>
                  </div>
                )}
                {result.propertyRecords.propertyType && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Type</div>
                    <div className="text-lg">{result.propertyRecords.propertyType}</div>
                  </div>
                )}
                {result.propertyRecords.assessedValue && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Assessed Value</div>
                    <div className="text-lg">${result.propertyRecords.assessedValue.toLocaleString()}</div>
                  </div>
                )}
                {result.propertyRecords.yearBuilt && (
                  <div>
                    <div className="text-sm text-true-black-text-muted">Year Built</div>
                    <div className="text-lg">{result.propertyRecords.yearBuilt}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.associatedIdentities.length > 0 && (
            <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 animate-fadeIn">
              <h3 className="font-header text-xl mb-4">Associated Identities ({result.associatedIdentities.length})</h3>
              <div className="space-y-2">
                {result.associatedIdentities.map((identity, i) => (
                  <div key={i} className="p-3 bg-true-black-bg rounded">
                    {identity.name && <div className="font-medium">{identity.name}</div>}
                    {identity.email && <div className="text-sm text-true-black-text-muted">{identity.email}</div>}
                    {identity.phone && <div className="text-sm text-true-black-text-muted">{identity.phone}</div>}
                    {identity.relationship && (
                      <div className="text-sm text-true-black-text-muted">Relationship: {identity.relationship}</div>
                    )}
                  </div>
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

