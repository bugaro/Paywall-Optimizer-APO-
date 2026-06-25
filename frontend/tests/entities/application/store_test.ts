import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '../../../../src/entities/application/model/store';
import { logger } from '../../../../src/shared/lib/logger';

// Mock the logger
vi.mock('../../../../src/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset Zustand store to initial state
    useAppStore.setState({
      activeAppId: '00000000-0000-0000-0000-000000000001',
      applications: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'App A (Calendar)',
          status: 'stable',
          currentCr: 3.5,
          targetCr: 3.0,
          lastChangeDescription: 'Asset ID: 00000000-0000-0000-0000-000000000001',
          assetId: '00000000-0000-0000-0000-000000000001',
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'App B (Fitness)',
          status: 'critical',
          currentCr: 1.8,
          targetCr: 3.0,
          lastChangeDescription: 'Asset ID: 00000000-0000-0000-0000-000000000002',
          assetId: '00000000-0000-0000-0000-000000000002',
        },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- Initial Setup & LocalStorage Load ---
  it('should initialize with default activeAppId if localstorage is empty', () => {
    // Given & When
    const state = useAppStore.getState();

    // Then
    expect(state.activeAppId).toBe('00000000-0000-0000-0000-000000000001');
    expect(state.applications).toHaveLength(2);
  });

  it('should restore activeAppId from localStorage if present on load', () => {
    // Given
    localStorage.setItem('apo_active_app_id', '00000000-0000-0000-0000-000000000002');

    // When (simulating store instantiation / logic wrapper)
    // Note: In real setup, the store initializer runs once. We can manually call hydrate/re-trigger loader
    useAppStore.getState().hydrate();

    // Then
    expect(useAppStore.getState().activeAppId).toBe('00000000-0000-0000-0000-000000000002');
  });

  // --- State Transition Actions ---
  it('should update activeAppId and store in localStorage on selectApp', () => {
    // Given
    expect(useAppStore.getState().activeAppId).toBe('00000000-0000-0000-0000-000000000001');

    // When
    useAppStore.getState().selectApp('00000000-0000-0000-0000-000000000002');

    // Then
    expect(useAppStore.getState().activeAppId).toBe('00000000-0000-0000-0000-000000000002');
    expect(localStorage.getItem('apo_active_app_id')).toBe('00000000-0000-0000-0000-000000000002');
  });

  // --- Observability Assertions ---
  it('should log a state transition event when activeAppId changes', () => {
    // Given
    const oldApp = '00000000-0000-0000-0000-000000000001';
    const newApp = '00000000-0000-0000-0000-000000000002';

    // When
    useAppStore.getState().selectApp(newApp);

    // Then
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[App Context] Switch to'),
      expect.objectContaining({
        oldAppId: oldApp,
        newAppId: newApp,
      })
    );
  });

  // --- Edge Cases & Boundary Conditions ---
  describe('Boundary & Edge Cases', () => {
    it('should ignore selectApp calls with invalid or non-existent app IDs', () => {
      // Given
      const initialAppId = useAppStore.getState().activeAppId;

      // When
      useAppStore.getState().selectApp('INVALID-APP-ID');

      // Then
      expect(useAppStore.getState().activeAppId).toBe(initialAppId);
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('[App Context] Switch to'),
        expect.objectContaining({ newAppId: 'INVALID-APP-ID' })
      );
    });

    it('should handle cases where localstorage is disabled or throws errors', () => {
      // Given
      const spySet = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // When
      useAppStore.getState().selectApp('00000000-0000-0000-0000-000000000002');

      // Then
      // Store state must still update in memory even if localStorage throws
      expect(useAppStore.getState().activeAppId).toBe('00000000-0000-0000-0000-000000000002');
      spySet.mockRestore();
    });
  });
});
