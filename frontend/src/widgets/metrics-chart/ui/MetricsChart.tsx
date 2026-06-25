import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useAppStore } from '@/entities/application/model/store';
import { useMetricsStore } from '@/entities/metrics/model/store';
import type { TelemetryMetric } from '@/entities/metrics/model/types';

interface MetricsChartProps {
  metrics: TelemetryMetric[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}
export const MetricsChart: React.FC<MetricsChartProps> = ({ metrics, isLoading, error, onRetry }) => {
  const { applications, activeAppId } = useAppStore();
  const activeApp = applications.find((a) => a.id === activeAppId);
  const targetCr = activeApp?.targetCr ?? 3.0;
  const { activeExperiments } = useMetricsStore();
  const activeExperiment = activeAppId ? activeExperiments[activeAppId] : null;
  const sampleSizePercent = activeExperiment?.sampleSizePercent ?? 10;

  const hasExperiment = useMemo(() => {
    return metrics.some((m) => m.variant === 'B');
  }, [metrics]);

  const chartData = useMemo(() => {
    // Group metrics by timestamp
    const groups: Record<string, { timestamp: string; label: string; crA?: number; crB?: number; cr?: number }> = {};

    metrics.forEach((m) => {
      const timeLabel = new Date(m.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (!groups[m.timestamp]) {
        groups[m.timestamp] = {
          timestamp: m.timestamp,
          label: timeLabel,
        };
      }

      const crPercent = m.conversionRate * 100;

      if (m.variant === 'B') {
        groups[m.timestamp].crB = Number(crPercent.toFixed(2));
      } else {
        groups[m.timestamp].crA = Number(crPercent.toFixed(2));
        groups[m.timestamp].cr = Number(crPercent.toFixed(2));
      }
    });

    const result = Object.values(groups).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return result;
  }, [metrics]);
  if (isLoading && chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-sm font-medium">Loading telemetry metrics...</span>
        </div>
      </div>
    );
  }

  if (error && chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-error/20 bg-error/5 text-error">
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">Failed to Ingest Metrics</span>
          <span className="text-xs text-on-surface-variant max-w-md">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/20 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant">
        <span className="text-sm">No telemetry records available for the selected range.</span>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-on-surface">Conversion Rate History</h3>
          <p className="text-xs text-on-surface-variant">Real-time 5-second aggregated tumbling windows</p>
        </div>
        <div className="flex items-center gap-2">
          {hasExperiment ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              A/B Test Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
              Single Variant
            </span>
          )}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-container-high)" />
            <XAxis
              dataKey="label"
              stroke="var(--color-on-surface-variant)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--color-on-surface-variant)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}%`}
              domain={[0, 'auto']}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-container-low)',
                borderColor: 'var(--color-outline-variant)',
                borderRadius: '8px',
                color: 'var(--color-on-surface)',
              }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px' }}
            />

            {hasExperiment && (
              <Line
                type="monotone"
                dataKey="crA"
                name={`Control (${100 - sampleSizePercent}% Cohort)`}
                stroke="var(--color-secondary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}
            {hasExperiment && (
              <Line
                type="monotone"
                dataKey="crB"
                name={`Test (${sampleSizePercent}% Cohort)`}
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}

            {!hasExperiment && (
              <Line
                type="monotone"
                dataKey="cr"
                name="Conversion Rate"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}
            {!hasExperiment && (
              <ReferenceLine
                y={targetCr}
                stroke="var(--color-error)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Target Threshold (${targetCr}%)`,
                  fill: 'var(--color-error)',
                  fontSize: 10,
                  position: 'top',
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
