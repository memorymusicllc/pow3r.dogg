import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useConfigStore } from '../stores/config-store';
import { getRenderingConfig, getThemeConfig } from '../utils/config-validator';
import { emitComponentEvent } from '../utils/observability';
import { Renderer2D, Renderer3D, RendererReactFlow } from './renderers';
import { Box, Text } from '@react-three/drei';
import type { Node, Edge } from 'reactflow';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

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

const COMPONENT_ID = 'dashboard-overview';

export default function DashboardOverview() {
  const { renderingMode, getComponentConfig, theme } = useConfigStore();
  const componentConfig = getComponentConfig(COMPONENT_ID);
  const [metrics, setMetrics] = useState<ThreatMetrics | null>(null);
  const [topThreats, setTopThreats] = useState<TopThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<ThreatMetrics | null>(null);

  const themeConfig = getThemeConfig(componentConfig, theme);
  const chartColors = (themeConfig?.chart_colors as string[]) || ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let retryCount = 0;
    let loadSuccessful = false;
    const MAX_RETRIES = 2;
    
    const loadWithRetry = async () => {
      if (!mounted) return;
      try {
        await loadOverview();
        retryCount = 0; // Reset on success
        loadSuccessful = true; // Mark as successful
        
        // Only set interval if load was successful and not already set
        if (mounted && loadSuccessful && !intervalId) {
          intervalId = setInterval(() => {
            if (mounted) loadOverview();
          }, 60000);
        }
      } catch (err) {
        loadSuccessful = false; // Mark as failed
        retryCount++;
        // If auth error or too many retries, don't retry automatically
        if (err instanceof Error && (err.message.includes('401') || retryCount >= MAX_RETRIES)) {
          console.warn('Authentication required or too many failures. Stopping automatic refresh.');
          return;
        }
      }
    };
    
    loadWithRetry();
    
    // Listen for auth-required events to stop retries
    const handleAuthRequired = (e: CustomEvent) => {
      if (e.detail?.stopRetries) {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        loadSuccessful = false;
      }
    };
    window.addEventListener('auth-required', handleAuthRequired as EventListener);
    
    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('auth-required', handleAuthRequired as EventListener);
    };
  }, []);

  const loadOverview = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    
    try {
      emitComponentEvent(COMPONENT_ID, 'data_load_start', {});
      
      const [metricsRes, threatsRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; metrics: ThreatMetrics }>('/admin/analytics/threat-metrics'),
        apiClient.get<{ success: boolean; threats: TopThreat[] }>('/admin/analytics/top-threats?limit=5'),
      ]);

      if (metricsRes.status === 'fulfilled') {
        const newMetrics = metricsRes.value.metrics || {
          totalThreats: 0,
          highThreatCount: 0,
          activeAttackers24h: 0,
          newThackers24h: 0,
          averageThreatScore: 0,
        };
        setPreviousMetrics(metrics);
        setMetrics(newMetrics);
        emitComponentEvent(COMPONENT_ID, 'metrics_loaded', { metrics: newMetrics });
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

      if (threatsRes.status === 'fulfilled') {
        setTopThreats(threatsRes.value.threats || []);
        emitComponentEvent(COMPONENT_ID, 'threats_loaded', { count: threatsRes.value.threats?.length || 0 });
      } else {
        console.warn('Failed to load top threats:', threatsRes.reason);
        setTopThreats([]);
      }

      emitComponentEvent(COMPONENT_ID, 'data_load_complete', { duration: Date.now() - startTime });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      setMetrics({
        totalThreats: 0,
        highThreatCount: 0,
        activeAttackers24h: 0,
        newThackers24h: 0,
        averageThreatScore: 0,
      });
      setTopThreats([]);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getTrend = (current: number, previous: number | null): 'up' | 'down' | 'neutral' => {
    if (previous === null) return 'neutral';
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <ArrowTrendingUpIcon className="w-4 h-4 text-red-400" />;
    if (trend === 'down') return <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />;
    return null;
  };

  const getThreatColor = (score: number) => {
    if (score >= 0.8) return 'text-red-400 border-red-500/30 bg-red-500/10';
    if (score >= 0.5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-green-400 border-green-500/30 bg-green-500/10';
  };

  const metricCards = [
    {
      label: 'Total Threats',
      value: metrics?.totalThreats ?? 0,
      icon: ShieldExclamationIcon,
      color: chartColors[0],
      trend: getTrend(metrics?.totalThreats ?? 0, previousMetrics?.totalThreats ?? null),
    },
    {
      label: 'High Threat',
      value: metrics?.highThreatCount ?? 0,
      icon: ExclamationTriangleIcon,
      color: chartColors[1],
      trend: getTrend(metrics?.highThreatCount ?? 0, previousMetrics?.highThreatCount ?? null),
    },
    {
      label: 'Active (24h)',
      value: metrics?.activeAttackers24h ?? 0,
      icon: UserGroupIcon,
      color: chartColors[2],
      trend: getTrend(metrics?.activeAttackers24h ?? 0, previousMetrics?.activeAttackers24h ?? null),
    },
    {
      label: 'New (24h)',
      value: metrics?.newThackers24h ?? 0,
      icon: ChartBarIcon,
      color: chartColors[3],
      trend: getTrend(metrics?.newThackers24h ?? 0, previousMetrics?.newThackers24h ?? null),
    },
  ];

  // 2D Rendering (default)
  const render2D = () => (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 text-yellow-400 animate-fadeIn">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300 hover:shadow-lg hover:scale-105 max-w-[520px] mx-auto w-full animate-fadeIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}20` }}>
                  <Icon className={`w-6 h-6`} style={{ color: card.color }} />
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(card.trend)}
                  {card.trend !== 'neutral' && (
                    <span className={`text-xs font-semibold ${
                      card.trend === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {card.trend === 'up' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-header text-sm mb-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted uppercase tracking-wide">
                {card.label}
              </h3>
              <p className="text-4xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text mb-2">
                {loading ? (
                  <span className="inline-block w-16 h-10 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded animate-pulse" />
                ) : (
                  card.value.toLocaleString()
                )}
              </p>
              {card.trend !== 'neutral' && !loading && (
                <p className={`text-xs font-medium ${
                  card.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {card.trend === 'up' ? 'Increasing' : 'Decreasing'} trend
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 max-w-[520px] mx-auto w-full animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-header text-xl">Average Threat Score</h3>
          <div className={`text-3xl font-bold ${getThreatColor(metrics?.averageThreatScore ?? 0).split(' ')[0]}`}>
            {loading ? '...' : ((metrics?.averageThreatScore ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="w-full bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              (metrics?.averageThreatScore ?? 0) >= 0.8
                ? 'bg-red-500'
                : (metrics?.averageThreatScore ?? 0) >= 0.5
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${((metrics?.averageThreatScore ?? 0) * 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 max-w-[520px] mx-auto w-full animate-fadeIn">
        <h3 className="font-header text-xl mb-4">Top Threats</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded animate-pulse" />
            ))}
          </div>
        ) : topThreats.length > 0 ? (
          <div className="space-y-3">
            {topThreats.map((threat) => (
              <div
                key={threat.id}
                className="flex justify-between items-center p-4 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded-lg hover:bg-true-black-surface theme-light:hover:bg-light-surface theme-glass:hover:bg-glass-surface transition-colors border border-transparent hover:border-true-black-border theme-light:hover:border-light-border theme-glass:hover:border-glass-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${
                    threat.threatScore >= 0.8 ? 'bg-red-400' : threat.threatScore >= 0.5 ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <span className="text-sm font-mono truncate">
                    {threat.fingerprint || threat.ipAddress || threat.id.substring(0, 8)}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getThreatColor(threat.threatScore)}`}>
                  {((threat.threatScore || 0) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted text-center py-8">
            No threats found
          </p>
        )}
      </div>
    </div>
  );

  // 3D Rendering
  const render3D = () => (
    <Renderer3D className="h-[600px] rounded-xl overflow-hidden">
      {metricCards.map((card, index) => {
        const x = (index % 2) * 3 - 1.5;
        const z = Math.floor(index / 2) * 3;
        const height = (card.value / 100) * 2;
        return (
          <group key={card.label} position={[x, 0, z]}>
            <Box args={[1, height, 1]} position={[0, height / 2, 0]}>
              <meshStandardMaterial color={card.color} />
            </Box>
            <Text
              position={[0, height + 0.5, 0]}
              fontSize={0.3}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {card.label}: {card.value}
            </Text>
          </group>
        );
      })}
    </Renderer3D>
  );

  // React Flow Rendering
  const renderReactFlow = () => {
    const nodes: Node[] = [
      { id: 'metrics', type: 'default', position: { x: 250, y: 100 }, data: { label: 'Threat Metrics' } },
      ...metricCards.map((card, index) => ({
        id: card.label.toLowerCase().replace(/\s+/g, '-'),
        type: 'default',
        position: { x: index * 200, y: 300 },
        data: { label: `${card.label}: ${card.value}` },
      })),
      { id: 'threats', type: 'default', position: { x: 250, y: 500 }, data: { label: `Top Threats: ${topThreats.length}` } },
    ];

    const edges: Edge[] = [
      ...metricCards.map((card) => ({
        id: `metrics-${card.label.toLowerCase().replace(/\s+/g, '-')}`,
        source: 'metrics',
        target: card.label.toLowerCase().replace(/\s+/g, '-'),
      })),
      ...metricCards.map((card) => ({
        id: `${card.label.toLowerCase().replace(/\s+/g, '-')}-threats`,
        source: card.label.toLowerCase().replace(/\s+/g, '-'),
        target: 'threats',
      })),
    ];

    return (
      <RendererReactFlow
        className="h-[600px] rounded-xl overflow-hidden"
        nodes={nodes}
        edges={edges}
      />
    );
  };

  // Render based on mode
  const canRender3D = getRenderingConfig(componentConfig, '3d');
  const canRenderFlow = getRenderingConfig(componentConfig, 'react_flow');

  if (renderingMode === '3d' && canRender3D) {
    return render3D();
  }
  if (renderingMode === 'react_flow' && canRenderFlow) {
    return renderReactFlow();
  }
  // Default to 2D
  return <Renderer2D>{render2D()}</Renderer2D>;
}
