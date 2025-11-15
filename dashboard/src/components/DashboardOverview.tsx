import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface ThreatMetrics {
  totalThreats: number;
  highThreatCount: number;
  activeAttackers24h: number;
  newThackers24h: number;
  averageThreatScore: number;
}

interface TopThreat {
  id: string;
  fingerprint?: string;
  ipAddress?: string;
  threatScore: number;
}

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<ThreatMetrics | null>(null);
  const [topThreats, setTopThreats] = useState<TopThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
    // Refresh every minute
    const interval = setInterval(loadOverview, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [metricsRes, threatsRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; metrics: ThreatMetrics }>('/admin/analytics/threat-metrics'),
        apiClient.get<{ success: boolean; threats: TopThreat[] }>('/admin/analytics/top-threats?limit=5'),
      ]);

      // Handle metrics response
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.metrics || {
          totalThreats: 0,
          highThreatCount: 0,
          activeAttackers24h: 0,
          newThackers24h: 0,
          averageThreatScore: 0,
        });
      } else {
        console.warn('Failed to load metrics:', metricsRes.reason);
        setMetrics({
          totalThreats: 0,
          highThreatCount: 0,
          activeAttackers24h: 0,
          newThackers24h: 0,
          averageThreatScore: 0,
        });
      }

      // Handle threats response
      if (threatsRes.status === 'fulfilled') {
        setTopThreats(threatsRes.value.threats || []);
      } else {
        console.warn('Failed to load top threats:', threatsRes.reason);
        setTopThreats([]);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Set defaults on error
      setMetrics({
        totalThreats: 0,
        highThreatCount: 0,
        activeAttackers24h: 0,
        newThackers24h: 0,
        averageThreatScore: 0,
      });
      setTopThreats([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-header text-3xl mb-6">Dashboard Overview</h2>
      
      {error && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-6 text-yellow-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">Total Threats</h3>
          <p className="text-4xl font-bold">
            {loading ? '...' : (metrics?.totalThreats ?? 0)}
          </p>
        </div>
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">High Threat</h3>
          <p className="text-4xl font-bold">
            {loading ? '...' : (metrics?.highThreatCount ?? 0)}
          </p>
        </div>
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">Active (24h)</h3>
          <p className="text-4xl font-bold">
            {loading ? '...' : (metrics?.activeAttackers24h ?? 0)}
          </p>
        </div>
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">New (24h)</h3>
          <p className="text-4xl font-bold">
            {loading ? '...' : (metrics?.newThackers24h ?? 0)}
          </p>
        </div>
      </div>

      <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
        <h3 className="font-header text-xl mb-4">Top Threats</h3>
        {loading ? (
          <p className="text-true-black-text-muted">Loading...</p>
        ) : topThreats.length > 0 ? (
          <div className="space-y-2">
            {topThreats.map((threat) => (
              <div
                key={threat.id}
                className="flex justify-between items-center p-3 bg-true-black-bg rounded"
              >
                <span className="text-sm">
                  {threat.fingerprint || threat.ipAddress || threat.id.substring(0, 8)}
                </span>
                <span className="text-xs text-true-black-text-muted">
                  Score: {((threat.threatScore || 0) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-true-black-text-muted text-center py-4">No threats found</p>
        )}
      </div>
    </div>
  );
}
