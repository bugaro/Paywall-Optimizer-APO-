import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrizzleVectorStoreAdapter } from '../../src/infrastructure/adapters/drizzle-vector-store.adapter.ts';
import { OLLAMA_DEFAULTS } from '../../src/domain/constants.ts';
import { db } from '../../src/infrastructure/db/index.ts';

// Mock the database client
vi.mock('../../src/infrastructure/db/index.ts', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn()
  };
  return {
    db: mockDb,
    pool: { end: vi.fn() }
  };
});

describe('DrizzleVectorStoreAdapter Specifications', () => {
  let adapter: DrizzleVectorStoreAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DrizzleVectorStoreAdapter();
  });

  describe('findSimilarMutations', () => {
    it('should return an empty array if limit is less than or equal to 0', async () => {
      // Given
      const queryEmbedding = Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.1);
      const limit = 0;

      // When
      const result = await adapter.findSimilarMutations(queryEmbedding, limit);

      // Then
      expect(result).toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('should query the database and map rows correctly', async () => {
      // Given
      const queryEmbedding = Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.1);
      const limit = 3;
      
      const mockDbRows = [
        {
          id: 'uuid-1',
          appId: 'app-1',
          pricePoint: '7.99',
          backgroundColor: 'dark-slate',
          titleText: 'Premium Title',
          ctaText: 'CTA button',
          conversionRate: 0.05,
          failureCondition: 'Rate drop',
          embedding: queryEmbedding,
          createdAt: new Date('2026-06-21T00:00:00.000Z')
        }
      ];

      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockDbRows)
      };

      vi.mocked(db.select).mockReturnValue(mockQueryChain as any);

      // When
      const result = await adapter.findSimilarMutations(queryEmbedding, limit);

      // Then
      expect(db.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'uuid-1',
        appId: 'app-1',
        pricePoint: 7.99, // Mapped to number!
        backgroundColor: 'dark-slate',
        titleText: 'Premium Title',
        ctaText: 'CTA button',
        conversionRate: 0.05,
        failureCondition: 'Rate drop',
        embedding: queryEmbedding,
        createdAt: new Date('2026-06-21T00:00:00.000Z')
      });
    });

    it('should throw an error and log if select query fails', async () => {
      // Given
      const queryEmbedding = Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.1);
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Connection refused'))
      };
      vi.mocked(db.select).mockReturnValue(mockQueryChain as any);

      // When & Then
      await expect(adapter.findSimilarMutations(queryEmbedding, 3)).rejects.toThrow('Connection refused');
    });
  });

  describe('saveMutation', () => {
    it('should insert and return the saved mutation record', async () => {
      // Given
      const inputEntry = {
        appId: 'app-1',
        pricePoint: 7.99,
        backgroundColor: 'dark-slate',
        titleText: 'Heading Copy',
        ctaText: 'CTA Copy',
        conversionRate: 0.045,
        failureCondition: 'Rate drop to 1.8%',
        embedding: Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.2)
      };

      const mockReturnedRow = {
        id: 'uuid-2',
        appId: 'app-1',
        pricePoint: '7.99',
        backgroundColor: 'dark-slate',
        titleText: 'Heading Copy',
        ctaText: 'CTA Copy',
        conversionRate: 0.045,
        failureCondition: 'Rate drop to 1.8%',
        embedding: Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.2),
        createdAt: new Date('2026-06-21T12:00:00.000Z')
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockReturnedRow])
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as any);

      // When
      const result = await adapter.saveMutation(inputEntry);

      // Then
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'uuid-2',
        appId: 'app-1',
        pricePoint: 7.99, // Mapped to number!
        backgroundColor: 'dark-slate',
        titleText: 'Heading Copy',
        ctaText: 'CTA Copy',
        conversionRate: 0.045,
        failureCondition: 'Rate drop to 1.8%',
        embedding: Array(OLLAMA_DEFAULTS.EMBEDDING_DIMENSION).fill(0.2),
        createdAt: new Date('2026-06-21T12:00:00.000Z')
      });
    });
  });
});
