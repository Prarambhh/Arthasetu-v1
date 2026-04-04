import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Knex } from 'knex';
import { AccessDeniedError } from '../domain/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'arthasetu_secret';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * JWT authentication middleware.
 * Extracts Bearer token, verifies it, and attaches userId to the request.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; id?: string };
    // Support both legacy (id) and new (userId) JWT payloads
    req.userId = payload.userId || payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * assertLoanAccess — verifies the requesting user is:
 * borrower, lender, or a guarantor on the given loan.
 *
 * Throws AccessDeniedError (→ 403) on failure.
 * Never returns 404 to prevent existence leaks.
 */
export async function assertLoanAccess(
  userId: string,
  loanId: string,
  db: Knex
): Promise<void> {
  const result = await db('loans')
    .leftJoin('guarantors', function () {
      this.on('guarantors.loan_id', '=', 'loans.id').andOn(
        'guarantors.user_id',
        '=',
        db.raw('?', [userId])
      );
    })
    .where('loans.id', loanId)
    .where(function () {
      this.where('loans.borrower_id', userId)
        .orWhere('loans.lender_id', userId)
        .orWhereNotNull('guarantors.id');
    })
    .select('loans.id')
    .first();

  if (!result) {
    throw new AccessDeniedError();
  }
}
