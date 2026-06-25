export class DomainError extends Error {
  public metadata?: Record<string, unknown>;

  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.metadata = metadata;
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
    this.name = 'ConflictError';
  }
}

export class AuthorizationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
    this.name = 'AuthorizationError';
  }
}

export class InvalidOperationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
    this.name = 'InvalidOperationError';
  }
}
