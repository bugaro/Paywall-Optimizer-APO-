export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class ApiError extends DomainError {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}
