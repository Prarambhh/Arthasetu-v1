export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(currentState: string, targetState: string) {
    super(`Cannot transition loan from ${currentState} to ${targetState}`);
  }
}

export class PreconditionNotMetError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(message: string = "Insufficient funds in lender wallet") {
    super(message);
  }
}

export class AccessDeniedError extends DomainError {
  constructor(message: string = "User is not a permitted party for this resource") {
    super(message);
  }
}

export class DuplicateDisbursementError extends DomainError {
  constructor(message: string = "Loan is already disbursed or being disbursed") {
    super(message);
  }
}
