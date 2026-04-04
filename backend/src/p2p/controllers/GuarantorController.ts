import { Response, NextFunction } from 'express';
import { AuthRequest, assertLoanAccess } from '../middleware/auth';
import { GuarantorService } from '../services/GuarantorService';
import db from '../db';

export class GuarantorController {
  constructor(private readonly guarantorService: GuarantorService) {}

  private loanId(req: AuthRequest) { return req.params['id'] as string; }
  private uid(req: AuthRequest) { return req.userId as string; }

  /** GET /loans/:id/guarantors/me */
  getMyRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await assertLoanAccess(this.uid(req), this.loanId(req), db);
      const record = await this.guarantorService.getMyRecord(this.loanId(req), this.uid(req));
      res.json({ data: record });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/guarantors/me/approve */
  approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await assertLoanAccess(this.uid(req), this.loanId(req), db);
      const result = await this.guarantorService.approve(this.loanId(req), this.uid(req));
      res.json({ data: result });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/guarantors/me/reject */
  reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await assertLoanAccess(this.uid(req), this.loanId(req), db);
      const result = await this.guarantorService.reject(this.loanId(req), this.uid(req));
      res.json({ data: result });
    } catch (err) { next(err); }
  };
}
