import { Response, NextFunction } from 'express';
import { AuthRequest, assertLoanAccess } from '../middleware/auth';
import { LoanLifecycleService } from '../services/LoanLifecycleService';
import { LoanRepository } from '../repositories/LoanRepository';
import { GuarantorService } from '../services/GuarantorService';
import db from '../db';

export class LoanController {
  constructor(
    private readonly lifecycleService: LoanLifecycleService,
    private readonly loanRepo: LoanRepository,
    private readonly guarantorService: GuarantorService
  ) {}

  private loanId(req: AuthRequest) { return req.params['id'] as string; }
  private uid(req: AuthRequest) { return req.userId as string; }

  /** POST /loans — Borrower broadcasts loan request */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { amount } = req.body as { amount: number };
      if (!amount) {
        res.status(400).json({ error: 'amount is required' });
        return;
      }
      const loan = await this.lifecycleService.createLoan({
        borrowerId: this.uid(req),
        amount: Number(amount),
      });
      res.status(201).json({ data: loan });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/accept — Lender accepts a broadcasted loan */
  accept = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      const result = await this.lifecycleService.acceptApplication(loanId, this.uid(req));
      res.json({ data: result });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/requirements — Lender specifies docs/guarantors */
  addRequirements = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const { requirements } = req.body as { requirements: Array<{ type: string; label: string; userId?: string }> };
      if (!Array.isArray(requirements) || requirements.length === 0) {
        res.status(400).json({ error: 'requirements must be a non-empty array' });
        return;
      }

      for (const r of requirements) {
        if (r.type === 'guarantors') {
          if (!r.userId) {
            res.status(400).json({ error: 'userId required for guarantor type requirement' });
            return;
          }
          await this.guarantorService.addGuarantor(loanId, r.userId);
        }
      }

      const created = await this.lifecycleService.addRequirements(
        loanId,
        this.uid(req),
        requirements.map((r) => ({ type: r.type as any, label: r.label }))
      );
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/documents — Borrower uploads a document */
  uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const { requirementId, fileReference } = req.body as { requirementId: string; fileReference: string };
      if (!requirementId || !fileReference) {
        res.status(400).json({ error: 'requirementId and fileReference are required' });
        return;
      }
      const doc = await this.lifecycleService.uploadDocument({
        loanId,
        borrowerId: this.uid(req),
        requirementId,
        fileReference,
      });
      res.status(201).json({ data: doc });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/review — Lender triggers review (precondition-gated) */
  triggerReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const result = await this.lifecycleService.triggerReview(loanId, this.uid(req));
      res.json({ data: result });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/approve — Lender approves + atomic disbursement */
  approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const result = await this.lifecycleService.approveLoan(loanId, this.uid(req));
      res.json({ data: result });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/reject — Lender rejects */
  reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const result = await this.lifecycleService.rejectLoan(loanId, this.uid(req));
      res.json({ data: result });
    } catch (err) { next(err); }
  };

  /** POST /loans/:id/repay — Borrower settles the loan */
  repay = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const { amount } = req.body as { amount: number };
      if (amount <= 0) {
        res.status(400).json({ error: 'amount must be strictly positive' });
        return;
      }
      const result = await this.lifecycleService.repayLoan(loanId, this.uid(req), Number(amount));
      res.json({ data: result });
    } catch (err) { next(err); }
  };

  /** GET /loans/:id — View a single loan (access-gated) */
  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const loanId = this.loanId(req);
      await assertLoanAccess(this.uid(req), loanId, db);
      const loan = await this.loanRepo.findById(loanId);
      if (!loan) { res.status(403).json({ error: 'Access denied' }); return; }
      const requirements = await this.loanRepo.getRequirements(loanId);
      const documents = await this.loanRepo.getDocuments(loanId);
      res.json({ data: { loan, requirements, documents } });
    } catch (err) { next(err); }
  };

  /** GET /loans/pending — Map marketplace broadcasts (no lender yet) */
  getPendingBroadcasts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const pending = await this.loanRepo.findPendingBroadcasts();
      res.json({ data: pending });
    } catch (err) { next(err); }
  };

  /** GET /loans/me — View all loans I am involved with */
  getMyAccessibleLoans = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const myLoans = await this.loanRepo.findAccessible(this.uid(req));
      res.json({ data: myLoans });
    } catch (err) { next(err); }
  };
}
