import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  InvalidOperationError,
} from '../src/domain/errors';

describe('Domain Errors Specification', () => {
  // ==========================================
  // Base DomainError
  // ==========================================
  describe('DomainError (Base)', () => {
    it('should inherit from standard Error and preserve message, name, and stack', () => {
      // Given
      const message = 'A generic domain error occurred';
      
      // When
      const error = new DomainError(message);
      
      // Then
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('DomainError');
      expect(error.stack).toBeDefined();
    });

    it('should support optional metadata payloads', () => {
      // Given
      const message = 'Error with metadata';
      const metadata = { entityId: '12345', reasons: ['invalid_field'] };

      // When
      const error = new DomainError(message, metadata);

      // Then
      expect(error.metadata).toEqual(metadata);
    });
  });

  // ==========================================
  // ValidationError
  // ==========================================
  describe('ValidationError', () => {
    it('should inherit from DomainError with ValidationError name and 400 statusCode mapping expectation', () => {
      // Given
      const message = 'Input validation failed';
      const metadata = { fields: ['email'] };

      // When
      const error = new ValidationError(message, metadata);

      // Then
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe(message);
      expect(error.metadata).toEqual(metadata);
    });
  });

  // ==========================================
  // NotFoundError
  // ==========================================
  describe('NotFoundError', () => {
    it('should inherit from DomainError with NotFoundError name', () => {
      // Given
      const message = 'Resource not found';

      // When
      const error = new NotFoundError(message);

      // Then
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe(message);
    });
  });

  // ==========================================
  // ConflictError
  // ==========================================
  describe('ConflictError', () => {
    it('should inherit from DomainError with ConflictError name', () => {
      // Given
      const message = 'Conflict detected';

      // When
      const error = new ConflictError(message);

      // Then
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe(message);
    });
  });

  // ==========================================
  // AuthorizationError
  // ==========================================
  describe('AuthorizationError', () => {
    it('should inherit from DomainError with AuthorizationError name', () => {
      // Given
      const message = 'Unauthorized action';

      // When
      const error = new AuthorizationError(message);

      // Then
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe(message);
    });
  });

  // ==========================================
  // InvalidOperationError
  // ==========================================
  describe('InvalidOperationError', () => {
    it('should inherit from DomainError with InvalidOperationError name', () => {
      // Given
      const message = 'Operation invalid for current state';

      // When
      const error = new InvalidOperationError(message);

      // Then
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(InvalidOperationError);
      expect(error.name).toBe('InvalidOperationError');
      expect(error.message).toBe(message);
    });
  });
});
