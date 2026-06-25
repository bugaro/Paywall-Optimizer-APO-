import React, { useState } from 'react';
import { useRenderTool, useConfigureSuggestions, CopilotChat } from '@copilotkit/react-core/v2';
import { z } from 'zod';
import { fetchClient } from '../../../shared/api/client';
import { logger } from '../../../shared/lib/logger';
import { useAppStore } from '@/entities/application/model/store';
import { useMetricsStore } from '@/entities/metrics/model/store';
import { ShieldAlert, Sparkles, Sliders, CheckCircle2, Play } from 'lucide-react';

interface PaywallExperimentCardProps {
  appId?: string;
  mutation?: { price: string; theme: string; ctaCopy: string };
}

export const PaywallExperimentCard: React.FC<PaywallExperimentCardProps> = ({ appId, mutation }) => {
  const [sampleSize, setSampleSize] = useState(10);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!appId || !mutation) {
    return null;
  }

  const handleDeploy = async () => {
    setIsDeploying(true);
    setErrorMsg(null);
    logger.info(`[Copilot Action] Executing: initiateAbExperiment | sampleSize: ${sampleSize}%`, {
      appId,
      sampleSizePercent: sampleSize,
      mutation
    });

    try {
      await fetchClient('/api/experiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId,
          name: `Experiment-${Date.now().toString().slice(-4)}`,
          sampleSizePercent: sampleSize
        })
      });

      useAppStore.getState().updateAppDescription(appId, 'A/B test started');
      setDeploySuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="my-3 rounded-xl border-2 border-primary/30 bg-surface-container-lowest p-4 shadow-md transition-all duration-300 hover:border-primary/50">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h4 className="font-semibold text-on-surface text-sm">Autonomous RAG UI Proposal</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        {/* Control Variant */}
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-2.5">
          <span className="font-bold text-on-surface-variant block mb-1 text-[10px] uppercase tracking-wider">Control (Variant A)</span>
          <div className="space-y-1">
            <div><span className="text-on-surface-variant">Price:</span> <span className="font-semibold text-on-surface">$9.99</span></div>
            <div><span className="text-on-surface-variant">Theme:</span> <span className="font-semibold text-on-surface">Light</span></div>
            <div><span className="text-on-surface-variant">CTA:</span> <span className="font-semibold text-on-surface italic">"Start free trial."</span></div>
          </div>
        </div>

        {/* Proposed Variant */}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-bl font-semibold">AI Variant</div>
          <span className="font-bold text-primary block mb-1 text-[10px] uppercase tracking-wider">Proposed (Variant B)</span>
          <div className="space-y-1">
            <div><span className="text-on-surface-variant">Price:</span> <span className="font-semibold text-primary">{mutation.price}</span></div>
            <div><span className="text-on-surface-variant">Theme:</span> <span className="font-semibold text-on-surface capitalize">{mutation.theme}</span></div>
            <div><span className="text-on-surface-variant">CTA:</span> <span className="font-semibold text-on-surface italic">"{mutation.ctaCopy}"</span></div>
          </div>
        </div>
      </div>

      {deploySuccess ? (
        <div className="rounded-lg bg-success/10 border border-success/20 p-3 flex items-center gap-2 text-success text-xs font-semibold">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>A/B Experiment initiated! Traffic is now actively splitting.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium text-on-surface">
              <span className="flex items-center gap-1"><Sliders className="h-3.5 w-3.5" /> Cohort Sample Size</span>
              <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[10px]">{sampleSize}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="99"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-error bg-error/5 border border-error/15 rounded p-2 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
          >
            {isDeploying ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Deploy Controlled A/B Test
          </button>
        </div>
      )}
    </div>
  );
};

export const CopilotSidebar: React.FC = () => {

  useRenderTool(
    {
      name: 'remediateBreach',
      parameters: z.object({
        appId: z.string().optional(),
      }),
      render: ({ parameters, result, status }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <div className="animate-pulse p-4 text-sm text-on-surface-variant">
              Remediating...
            </div>
          );
        }
        let mutation;
        try {
          mutation = result ? JSON.parse(result).mutation : undefined;
        } catch {
          mutation = undefined;
        }
        if (!mutation) {
          return (
            <div className="p-4 text-sm text-error">
              Tool completed but returned no mutation data.
            </div>
          );
        }
        return (
          <PaywallExperimentCard
            appId={parameters?.appId}
            mutation={mutation}
          />
        );
      },
    },
    [],
  );

  useRenderTool(
    {
      name: 'resetSimulation',
      parameters: z.object({}),
      render: ({ result, status }) => {
        if (status === 'inProgress' || status === 'executing') {
          return (
            <div className="animate-pulse p-4 text-sm text-on-surface-variant">
              Resetting simulation...
            </div>
          );
        }
        try {
          const parsed = result ? JSON.parse(result) : null;
          if (parsed && parsed.success) {
            const appStore = useAppStore.getState();
            const metricsStore = useMetricsStore.getState();

            appStore.resetAppDescriptions();
            appStore.fetchApplications();
            metricsStore.stopPolling();
            metricsStore.resetMetrics();

            setTimeout(() => {
              const ids = useAppStore.getState().applications.map((a) => a.id);
              useMetricsStore.getState().startPollingAll(ids);
            }, 1500);

            return (
              <div className="rounded-lg bg-success/10 border border-success/20 p-3 m-3 flex items-center gap-2 text-success text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Simulation reset! All data cleared and restarted.</span>
              </div>
            );
          }
        } catch {
          // fall through to error
        }
        return (
          <div className="p-4 text-sm text-error">
            Failed to reset simulation.
          </div>
        );
      },
    },
    [],
  );

  useConfigureSuggestions({
    suggestions: [
      { title: '🧪 Start A/B test for Fitness Tracker', message: 'Audit Fitness Tracker and suggest a paywall remediation strategy' },
      { title: '🔄 Reset simulation', message: 'Please reset the simulation and start fresh' },
    ],
    available: 'always',
  });

  return (
    <div className="flex h-full w-[460px] flex-col border-l border-outline-variant bg-agent-surface backdrop-blur-md">
      {/* Sidebar Header */}
      <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-on-surface">Growth Copilot</h2>
          <p className="text-[10px] text-on-surface-variant font-mono">powered by super AI</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CopilotChat
          chatView="h-full relative"
          suggestionView="px-3 pt-1"
          labels={{
            chatInputPlaceholder: 'Ask ..',
            welcomeMessageText: 'Hi, ask me to audit an app (e.g. "audit App B") and suggest a paywall remediation strategy.',
          }}
        />
      </div>
    </div>
  );
};
