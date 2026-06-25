import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAgentModel } from '../src/infrastructure/agent.ts';

// Mock @ai-sdk/openai to intercept createOpenAI constructor calls
vi.mock('@ai-sdk/openai', () => {
  const mockCreateOpenAI = vi.fn().mockImplementation((config) => {
    const mockModelFn = vi.fn().mockImplementation((modelName) => {
      return {
        _isMockModel: true,
        config,
        modelName,
      };
    }) as unknown as { chat: ReturnType<typeof vi.fn> };
    mockModelFn.chat = vi.fn().mockImplementation((modelName: string) => {
      return {
        _isMockModel: true,
        config,
        modelName,
      };
    });
    return mockModelFn;
  });
  return {
    createOpenAI: mockCreateOpenAI,
  };
});

interface MockModel {
  _isMockModel: boolean;
  config: { apiKey: string; baseURL: string };
  modelName: string;
}

describe('Copilot Bridge Resolver Test Suite (TDD)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear variables to ensure test isolation
    delete process.env.COPILOT_AGENT_PROVIDER;
    delete process.env.COPILOT_AGENT_MODEL;
    delete process.env.MASTRA_AI_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should instantiate and return LanguageModel pointing to Mastra proxy with specified model', () => {
    // Given: Provider, model, and mastra URL are customized
    process.env.COPILOT_AGENT_PROVIDER = 'ollama';
    process.env.COPILOT_AGENT_MODEL = 'gemma4:e2b';
    process.env.MASTRA_AI_URL = 'http://apo-mastra-ai:4006';

    // When: resolveAgentModel is invoked
    const model = resolveAgentModel() as unknown as MockModel;

    // Then: It should call createOpenAI and return the mocked LanguageModel config
    expect(model._isMockModel).toBe(true);
    expect(model.modelName).toBe('gemma4:e2b');
    expect(model.config.apiKey).toBe('ollama');
    expect(model.config.baseURL).toBe('http://apo-mastra-ai:4006/api/reasoning/openai');
  });

  it('should default to ollama provider with qwen2.5:3b when no env vars are set', () => {
    // When: resolveAgentModel is invoked with defaults
    const model = resolveAgentModel() as unknown as MockModel;

    // Then: It resolves with ollama defaults
    expect(model._isMockModel).toBe(true);
    expect(model.modelName).toBe('qwen2.5:3b');
    expect(model.config.apiKey).toBe('ollama');
    expect(model.config.baseURL).toBe('http://localhost:4006/api/reasoning/openai');
  });

  it('should log warning and fallback to ollama on invalid provider', () => {
    // Given: COPILOT_AGENT_PROVIDER is invalid
    process.env.COPILOT_AGENT_PROVIDER = 'invalid';

    // When: resolveAgentModel is invoked
    const model = resolveAgentModel() as unknown as MockModel;

    // Then: It falls back cleanly to default ollama model
    expect(model._isMockModel).toBe(true);
    expect(model.modelName).toBe('qwen2.5:3b');
    expect(model.config.apiKey).toBe('ollama');
  });

  it('should fallback to default local Mastra URL when MASTRA_AI_URL is empty', () => {
    // Given: Provider is ollama but MASTRA_AI_URL is empty string
    process.env.COPILOT_AGENT_PROVIDER = 'ollama';
    process.env.MASTRA_AI_URL = ' ';

    // When: resolveAgentModel is invoked
    const model = resolveAgentModel() as unknown as MockModel;

    // Then: It resolves with default localhost URL
    expect(model._isMockModel).toBe(true);
    expect(model.config.baseURL).toBe('http://localhost:4006/api/reasoning/openai');
  });
});
