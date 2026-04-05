import { Knex } from 'knex';
import { LoanStatus, RequirementType } from '../domain/models';
import { LoanStateMachine } from '../domain/LoanStateMachine';
import { LoanRepository } from '../repositories/LoanRepository';
import { GuarantorRepository } from '../repositories/GuarantorRepository';
import { DisbursementService } from './DisbursementService';
import { PreconditionNotMetError, InvalidStateTransitionError } from '../domain/errors';

export class LoanLifecycleService {
  constructor(
    private readonly db: Knex,
    private readonly loanRepo: LoanRepository,
    private readonly guarantorRepo: GuarantorRepository,
    private readonly disbursementService: DisbursementService
  ) {}

  async createLoan(data: { id?: string; borrowerId: string; amount: number; status?: LoanStatus }) {
    return this.loanRepo.create({
      id: data.id,
      borrower_id: data.borrowerId,
      lender_id: undefined as any, // Nullable in DB
      amount: data.amount,
      status: data.status,
    });
  }

  async syncOnChainLoan(data: { id: string; borrowerId: string; amount: number }) {
    // Check if it already exists
    const existing = await this.loanRepo.findById(data.id);
    if (existing) return existing;

    // Create directly in REQUESTED state, but add requirements for documents automatically
    const loan = await this.createLoan({
      id: data.id,
      borrowerId: data.borrowerId,
      amount: data.amount,
      status: LoanStatus.REQUESTED
    });

    // Enforce Govt ID and Income Proof automatically for synced on-chain loans
    await this.loanRepo.addRequirement({ loan_id: data.id, type: RequirementType.DOCUMENT, label: 'Government ID' });
    await this.loanRepo.addRequirement({ loan_id: data.id, type: RequirementType.DOCUMENT, label: 'Income Validation' });

    return loan;
  }

  async acceptApplication(loanId: string, lenderId: string, interestRate: number) {
    if (isNaN(interestRate) || interestRate < 1 || interestRate > 15) {
      throw new PreconditionNotMetError('Interest rate must be between 1 and 15 percent');
    }

    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.lender_id) throw new Error('Loan has already been accepted by another lender');
    if (loan.borrower_id === lenderId) throw new Error('Borrower cannot accept their own loan request');

    // Proceed to set the lender, loan stays in "requested" until docs are requested
    await this.db('loans').where({ id: loanId }).update({ 
      lender_id: lenderId, 
      interest_rate: interestRate,
      updated_at: new Date() 
    });
    
    return { ...loan, lender_id: lenderId, interest_rate: interestRate };
  }

  async addRequirements(
    loanId: string,
    lenderId: string,
    requirements: Array<{ type: RequirementType; label: string }>
  ) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.lender_id !== lenderId) throw new Error('Only the lender may add requirements');

    // Transition: requested → docs_requested (only if not already there)
    if (loan.status !== LoanStatus.DOCS_REQUESTED) {
      LoanStateMachine.assertTransition(loan.status, LoanStatus.DOCS_REQUESTED);
      await this.loanRepo.updateStatus(loanId, LoanStatus.DOCS_REQUESTED);
    }

    const created = [];
    for (const req of requirements) {
      const r = await this.loanRepo.addRequirement({ loan_id: loanId, ...req });
      created.push(r);
    }

    return created;
  }

  async uploadDocument(data: {
    loanId: string;
    borrowerId: string;
    requirementId: string;
    fileReference: string;
  }) {
    const loan = await this.loanRepo.findById(data.loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.borrower_id !== data.borrowerId) throw new Error('Only the borrower may upload documents');
    if (loan.status !== LoanStatus.DOCS_REQUESTED) {
      throw new InvalidStateTransitionError(loan.status, 'document_upload');
    }

    const doc = await this.loanRepo.addDocument({
      loan_id: data.loanId,
      requirement_id: data.requirementId,
      uploaded_by: data.borrowerId,
      file_reference: data.fileReference,
    });

    // Mark requirement as fulfilled
    await this.loanRepo.markRequirementFulfilled(data.requirementId);
    return doc;
  }

  async triggerReview(loanId: string, lenderId: string) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.lender_id !== lenderId) throw new Error('Only the lender may trigger review');

    const allDocsFulfilled = await this.loanRepo.checkAllDocumentsFulfilled(loanId);
    const allGuarantorsApproved = await this.guarantorRepo.allApproved(loanId);
    const rejectedNames = await this.guarantorRepo.getRejectedGuarantorNames(loanId);

    // Gated transition with precondition checks
    LoanStateMachine.transitionToUnderReview(loan.status, {
      allDocumentsFulfilled: allDocsFulfilled,
      allGuarantorsApproved,
      rejectedGuarantorNames: rejectedNames,
    });

    await this.loanRepo.updateStatus(loanId, LoanStatus.UNDER_REVIEW);
    return { status: LoanStatus.UNDER_REVIEW };
  }

  async approveLoan(loanId: string, lenderId: string) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.lender_id !== lenderId) throw new Error('Only the lender may approve');

    if (loan.status !== LoanStatus.APPROVED) {
      LoanStateMachine.assertTransition(loan.status, LoanStatus.APPROVED);
      await this.loanRepo.updateStatus(loanId, LoanStatus.APPROVED);
    }

    // Immediately trigger atomic disbursement
    const disbursalResult = await this.disbursementService.disburse(loanId);
    return { status: LoanStatus.DISBURSED, walletTransactionId: disbursalResult.walletTransactionId };
  }

  async rejectLoan(loanId: string, lenderId: string) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.lender_id !== lenderId) throw new Error('Only the lender may reject');

    LoanStateMachine.assertTransition(loan.status, LoanStatus.REJECTED);
    await this.loanRepo.updateStatus(loanId, LoanStatus.REJECTED);
    return { status: LoanStatus.REJECTED };
  }

  async repayLoan(loanId: string, borrowerId: string, amount: number) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new PreconditionNotMetError('Loan not found');
    if (loan.borrower_id !== borrowerId) throw new PreconditionNotMetError('Only the borrower may repay');

    if (amount <= 0) {
      throw new PreconditionNotMetError('Repayment amount must be strictly greater than 0');
    }

    LoanStateMachine.assertTransition(loan.status, LoanStatus.SETTLED);
    
    // Partial payment handling is now offloaded directly to the settlement service
    const settleResult = await this.disbursementService.settle(loanId, amount);
    
    // disbursementService.settle will return the resulting loan status depending on if it's fully settled yet
    if (settleResult.status === LoanStatus.SETTLED) {
      await this.loanRepo.updateStatus(loanId, LoanStatus.SETTLED);
    }
    
    return settleResult;
  }
}
