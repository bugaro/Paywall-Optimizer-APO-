import { useAppStore } from '@/entities/application/model/store';
import { useMetricsStore } from '@/entities/metrics/model/store';
import { useThemeStore } from '@/entities/theme/model/store';
import { CopilotSidebar } from '@/widgets/copilot-sidebar/ui/CopilotSidebar';
import { MetricsChart } from '@/widgets/metrics-chart/ui/MetricsChart';
import {
  Activity,
  AlertTriangle,
  Monitor,
  Moon,
  Sun
} from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { logger } from '../../shared/lib/logger';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-72 items-center justify-center rounded-xl border border-error/20 bg-error/5 text-error p-5">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-error" />
            <span className="font-semibold">Widget crashed</span>
            <span className="text-xs text-on-surface-variant text-center max-w-sm">
              {this.state.error?.message}
            </span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ChangeTimer: React.FC<{ timestamp: number; description: string }> = ({ timestamp, description }) => {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - timestamp) / 60000)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMinutes(Math.floor((Date.now() - timestamp) / 60000));
    }, 60000);
    return () => clearInterval(id);
  }, [timestamp]);

  const label = minutes === 0
    ? 'just now'
    : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  return <span>{description} · {label}</span>;
};

export const DashboardPage: React.FC = () => {
  const { activeAppId, applications, selectApp, hydrate } = useAppStore();
  const { metricsByApp, isFetching, error, fetchMetrics, startPollingAll, stopPolling } = useMetricsStore();
  const { mode, setMode } = useThemeStore();

  useEffect(() => {
    logger.info('[Layout] DashboardPage mounted successfully');
    hydrate();
  }, [hydrate]);

  // Poll all apps on mount
  useEffect(() => {
    const allAppIds = applications.map((a) => a.id);
    if (allAppIds.length > 0) {
      startPollingAll(allAppIds);
    }
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMetrics = metricsByApp[activeAppId] || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-on-surface">
      {/* Left Navigation Icon-bar (20 Items) */}
      <div className="flex w-16 flex-col items-center gap-3.5 border-r border-outline-variant bg-surface-container-low py-4 overflow-y-auto shrink-0 select-none">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-md">
          <Activity className="h-5 w-5" />
        </div>

      </div>

      {/* Main Central Panel */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">APO Control Center</h1>
            <p className="text-xs text-on-surface-variant">Multi-Asset Autonomous Paywall Optimizer</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container p-0.5">
              <button
                onClick={() => setMode('light')}
                className={`p-1.5 rounded-md transition-colors ${mode === 'light' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                title="Light mode"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('system')}
                className={`p-1.5 rounded-md transition-colors ${mode === 'system' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                title="System theme"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`p-1.5 rounded-md transition-colors ${mode === 'dark' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                title="Dark mode"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs font-mono text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant">
              Status: <span className="text-success font-semibold">Simulation Running</span>
            </div>
          </div>
        </div>

        {/* Fleet Applications Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((app) => {
            const isActive = app.id === activeAppId;
            const isCritical = app.currentCr !== null && app.currentCr < app.targetCr;

            return (
              <div
                key={app.id}
                onClick={() => selectApp(app.id)}
                className={`cursor-pointer rounded-xl border p-5 transition-all duration-300 relative overflow-hidden select-none hover:shadow-md ${isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-outline-variant bg-surface-container-lowest hover:border-on-surface-variant/30'
                  }`}
              >
                {/* Visual indicator for critical app */}
                {isCritical && (
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-error animate-pulse" />
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">{app.name}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isCritical
                      ? 'bg-error/15 text-error animate-pulse'
                      : 'bg-success/15 text-success'
                      }`}
                  >
                    {isCritical ? 'CRITICAL BREACH' : 'STABLE'}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-outline-variant/60 pt-3">
                  <div>
                    <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Conversion Rate</span>
                    <span className={`text-base font-extrabold ${isCritical ? 'text-error' : 'text-success'}`}>
                      {app.currentCr !== null ? `${app.currentCr}%` : '\u2014'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Target Threshold</span>
                    <span className="text-base font-extrabold text-on-surface-variant">
                      &gt; {app.targetCr}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-on-surface-variant font-medium italic">
                  {app.lastChangeTimestamp ? (
                    <ChangeTimer timestamp={app.lastChangeTimestamp} description={app.lastChangeDescription} />
                  ) : (
                    app.lastChangeDescription
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Telemetry Chart Widget Box wrapped in Error Boundary */}
        <div className="flex-1">
          <ErrorBoundary>
            <MetricsChart metrics={activeMetrics} isLoading={isFetching} error={error} onRetry={activeAppId ? () => fetchMetrics(activeAppId) : undefined} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Right Persistent Copilot Sidebar */}
      <div className="shrink-0 h-full">
        <ErrorBoundary>
          <CopilotSidebar />
        </ErrorBoundary>
      </div>
    </div>
  );
};
