import { create } from 'zustand';
import { logger } from '../../../shared/lib/logger';
import { fetchClient } from '../../../shared/api/client';
import type { Application } from './types';

interface AppStore {
  activeAppId: string;
  applications: Application[];
  selectApp: (appId: string) => void;
  fetchApplications: () => Promise<void>;
  hydrate: () => void;
  updateAppMetrics: (appId: string, overallCr: number) => void;
  updateAppDescription: (appId: string, description: string) => void;
  resetAppDescriptions: () => void;
}

const defaultApplications: Application[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: '',
    currentCr: null,
    targetCr: 3.0,
    lastChangeDescription: 'Asset ID: 00000000-0000-0000-0000-000000000001',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: '',
    currentCr: null,
    targetCr: 3.0,
    lastChangeDescription: 'Asset ID: 00000000-0000-0000-0000-000000000002',
  },
];

export const useAppStore = create<AppStore>((set, get) => ({
  activeAppId: '00000000-0000-0000-0000-000000000001',
  applications: defaultApplications,

  selectApp: (appId: string) => {
    const { activeAppId, applications } = get();

    const appExists = applications.some((app) => app.id === appId);
    if (!appExists) {
      return;
    }

    set({ activeAppId: appId });

    try {
      localStorage.setItem('apo_active_app_id', appId);
    } catch (e) {
      // Handle cases where localStorage is disabled or throws error
    }

    logger.info(`[App Context] Switch to: ${appId}`, {
      oldAppId: activeAppId,
      newAppId: appId,
    });
  },

  fetchApplications: async () => {
    try {
      const data = await fetchClient('/api/applications');
      if (data && Array.isArray(data)) {
        set((state) => ({
          applications: state.applications.map((app) => {
            const apiApp = data.find((a: any) => a.id === app.id);
            return apiApp ? { ...app, name: apiApp.name } : app;
          }),
        }));
        logger.info('[App Store] Applications updated from API');
      }
    } catch (e) {
      logger.error('[App Store] Failed to fetch applications', { error: e });
    }
  },

  updateAppMetrics: (appId: string, overallCr: number) => {
    const { applications } = get();
    set({
      applications: applications.map((app) =>
        app.id === appId ? { ...app, currentCr: overallCr } : app
      ),
    });
  },

  updateAppDescription: (appId: string, description: string) => {
    const { applications } = get();
    set({
      applications: applications.map((app) =>
        app.id === appId
          ? { ...app, lastChangeDescription: description, lastChangeTimestamp: Date.now() }
          : app
      ),
    });
  },

  resetAppDescriptions: () => {
    set((state) => ({
      applications: state.applications.map((app) => ({
        ...app,
        currentCr: null,
        lastChangeDescription: `Asset ID: ${app.id}`,
        lastChangeTimestamp: undefined,
      })),
    }));
  },

  hydrate: () => {
    try {
      const savedAppId = localStorage.getItem('apo_active_app_id');
      if (savedAppId) {
        const { applications } = get();
        const appExists = applications.some((app) => app.id === savedAppId);
        if (appExists) {
          set({ activeAppId: savedAppId });
        }
      }
    } catch (e) {
      // ignore
    }

    get().fetchApplications();
  },
}));
