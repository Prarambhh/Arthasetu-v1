import { Request, Response, NextFunction } from 'express';
import {
  InvalidStateTransitionError,
  PreconditionNotMetError,
  InsufficientFundsError,
  AccessDeniedError,
  DuplicateDisbursementError,
  DomainError,
} from '../domain/errors';

/**
 * Central error handler — maps domain errors to HTTP status codes.
 * Must be the last middleware registered.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use both instanceof AND name checks — ts-node transpileOnly can cause
  // instanceof to fail when the same module is loaded in different scopes.
  const name = err?.constructor?.name || err?.name || '';

  if (err instanceof AccessDeniedError || name === 'AccessDeniedError') {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err instanceof InvalidStateTransitionError || name === 'InvalidStateTransitionError') {
    res.status(409).json({ error: err.message, code: 'INVALID_STATE_TRANSITION' });
    return;
  }

  if (err instanceof PreconditionNotMetError || name === 'PreconditionNotMetError') {
    res.status(422).json({ error: err.message, code: 'PRECONDITION_NOT_MET' });
    return;
  }

  if (err instanceof InsufficientFundsError || name === 'InsufficientFundsError') {
    res.status(402).json({ error: err.message, code: 'INSUFFICIENT_FUNDS' });
    return;
  }

  if (err instanceof DuplicateDisbursementError || name === 'DuplicateDisbursementError') {
    res.status(409).json({ error: err.message, code: 'DUPLICATE_DISBURSEMENT' });
    return;
  }

  if (err instanceof DomainError || name === 'DomainError') {
    res.status(400).json({ error: err.message });
    return;
  }

  // Unexpected errors — don't leak internals
  console.error('[UnhandledError]', err);
  res.status(500).json({ error: 'Internal server error' });
}
