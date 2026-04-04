import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ContractRepository } from '../repositories/ContractRepository';
import db from '../db';

export class ContractController {
  constructor(private readonly contractRepo: ContractRepository) {}

  /**
   * GET /contracts
   * ?status=pending|settled  &sort=issued_at|amount  &order=asc|desc
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status, sort, order } = req.query as Record<string, string>;
      const contracts = await this.contractRepo.findAccessible(req.userId as string, {
        status,
        sort,
        order: order as 'asc' | 'desc',
      });

      const enriched = await Promise.all(
        contracts.map(async (c: any) => {
          const guarantors = await db('guarantors')
            .join('users', 'users.id', 'guarantors.user_id')
            .where({ 'guarantors.loan_id': c.loan_id })
            .select('users.name', 'guarantors.status');
          return { ...c, guarantors };
        })
      );

      res.json({ data: enriched });
    } catch (err) { next(err); }
  };

  /** GET /contracts/:id — full detail */
  detail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const contractId = req.params['id'] as string;
      const result = await this.contractRepo.findFullDetails(contractId, req.userId as string);
      if (!result) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      res.json({ data: result });
    } catch (err) { next(err); }
  };
}
