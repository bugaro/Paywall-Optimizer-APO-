import React, { type ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { CopilotKit, useAgentContext } from '@copilotkit/react-core/v2';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { useAppStore } from '../entities/application/model/store';
import './index.css';
import '@copilotkit/react-core/v2/styles.css';

// Theme init (auto-applies saved preference or system theme on import)
import '../entities/theme/model/store';

const generateAliases = (name: string): string[] => {
  const aliases: string[] = [];
  const lower = name.toLowerCase();
  aliases.push(lower);

  const words = lower.split(/\s+/);
  if (words.length > 1) {
    aliases.push(words[words.length - 1]);
  }

  return [...new Set(aliases)];
};

const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const activeAppId = useAppStore((s) => s.activeAppId);
  const applications = useAppStore((s) => s.applications);

  useAgentContext({
    description:
      'Currently selected application UUID. ' +
      'Use this as the appId when the user says "my app", "this app", ' +
      'or refers to the currently selected app.',
    value: activeAppId,
  });

  useAgentContext({
    description:
      'Available applications with their UUIDs, names, and search aliases. ' +
      'When the user mentions an app by name or alias, match it to the correct UUID ' +
      'and pass it as the appId parameter.',
    value: applications.map((a) => ({
      id: a.id,
      name: a.name,
      aliases: generateAliases(a.name),
    })),
  });

  return children;
};

const App = () => {
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <CopilotKit runtimeUrl="/copilot/chat">
      <AppContextProvider>
        <DashboardPage />
      </AppContextProvider>
    </CopilotKit>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
