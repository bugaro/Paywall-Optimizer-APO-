import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaLlmAdapter } from '../../src/infrastructure/adapters/ollama-llm.adapter.ts';
import { OLLAMA_DEFAULTS } from '../../src/domain/constants.ts';

describe('OllamaLlmAdapter Specifications', () => {
  let adapter: OllamaLlmAdapter;

  beforeEach(() => {
    adapter = new OllamaLlmAdapter();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('getEmbedding', () => {
    it('should generate an embedding vector matching the configured dimension', async () => {
      // Given
      const mockVector = Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.01);
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockVector })
      } as Response);

      // When
      const result = await adapter.getEmbedding('App B conversion rate drop');

      // Then
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(result).toHaveLength(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION);
      expect(result).toEqual(mockVector);
    });

    it('should throw an error if the embedding response length does not match the configured dimension', async () => {
      // Given
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2] }) // Incorrect length
      } as Response);

      // When & Then
      await expect(adapter.getEmbedding('App B')).rejects.toThrow('Invalid embedding size');
    });

    it('should throw an error if the Ollama endpoint returns not ok', async () => {
      // Given
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response);

      // When & Then
      await expect(adapter.getEmbedding('App B')).rejects.toThrow('Ollama embedding call failed');
    });
  });
});
