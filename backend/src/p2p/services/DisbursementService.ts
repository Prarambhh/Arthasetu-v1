import { Knex } from 'knex';
import { LoanStatus, ContractStatus } from '../domain/models';
import {
  InsufficientFundsError,
  DuplicateDisbursementError,
  InvalidStateTransitionError,
  PreconditionNotMetError,
} from '../domain/errors';
import { LoanStateMachine } from '../domain/LoanStateMachine';
import { LoanRepository } from '../repositories/LoanRepository';
import { WalletRepository } from '../repositories/WalletRepository';
import { ContractRepository } from '../repositories/ContractRepository';

export class DisbursementService {
  constructor(
    private readonly db: Knex,
    private readonly loanRepo: LoanRepository,
    private readonly walletRepo: WalletRepository,
    private readonly contractRepo: ContractRepository
  ) {}

  /**
   * Atomic disbursement — all 9 steps in a single Postgres transaction.
   * Idempotent: safe to call twice on the same loan.
   */
  async disburse(loanId: string): Promise<{ walletTransactionId: string }> {
    return this.db.transaction(async (trx) => {
      // 1. Load and lock the loan row
      const loan = await this.db<any>('loans').where({ id: loanId }).forUpdate().transacting(trx).first();
      if (!loan) throw new Error(`Loan ${loanId} not found`);

      // 2. Idempotency: if already disbursed, return existing tx without double-debiting
      const existingTx = await this.walletRepo.findTransactionByLoanId(loanId, trx);
      if (existingTx) {
        if (loan.status === LoanStatus.DISBURSED || loan.status === LoanStatus.SETTLED) {
          return { walletTransactionId: existingTx.id };
        }
        throw new DuplicateDisbursementError();
      }

      // 3. Validate state allows disbursement
      try {
        LoanStateMachine.assertTransition(loan.status, LoanStatus.DISBURSED);
      } catch {
        throw new InvalidStateTransitionError(loan.status, LoanStatus.DISBURSED);
      }

      const loanAmount = Number(loan.amount);

      // 4. Load & lock lender wallet
      const lenderWallet = await this.walletRepo.findByUserId(loan.lender_id, trx);
      if (!lenderWallet) throw new Error('Lender wallet not found');

      const lockedLenderWallet = await this.walletRepo.findByIdForUpdate(lenderWallet.id, trx);
      if (!lockedLenderWallet) throw new Error('Lender wallet lock failed');

      // 5. Verify sufficient balance
      if (Number(lockedLenderWallet.balance) < loanAmount) {
        throw new InsufficientFundsError(
          `Lender balance (${lockedLenderWallet.balance}) is less than loan amount (${loanAmount})`
        );
      }

      // 6. Debit lender
      const newLenderBalance = Number(lockedLenderWallet.balance) - loanAmount;
      await this.walletRepo.updateBalance(lockedLenderWallet.id, newLenderBalance, trx);

      // 7. Credit borrower — lock their wallet too for consistency
      const borrowerWallet = await this.walletRepo.findByUserId(loan.borrower_id, trx);
      if (!borrowerWallet) throw new Error('Borrower wallet not found');
      const lockedBorrowerWallet = await this.walletRepo.findByIdForUpdate(borrowerWallet.id, trx);
      if (!lockedBorrowerWallet) throw new Error('Borrower wallet lock failed');

      const newBorrowerBalance = Number(lockedBorrowerWallet.balance) + loanAmount;
      await this.walletRepo.updateBalance(lockedBorrowerWallet.id, newBorrowerBalance, trx);

      // 8. Insert wallet_transaction record
      const walletTx = await this.walletRepo.insertTransaction(
        {
          loan_id: loanId,
          debit_wallet_id: lockedLenderWallet.id,
          credit_wallet_id: lockedBorrowerWallet.id,
          amount: loanAmount,
        },
        trx
      );

      // 9. Update loan status to DISBURSED
      await this.db('loans')
        .where({ id: loanId })
        .update({ status: LoanStatus.DISBURSED, updated_at: new Date() })
        .transacting(trx);

      // 10. Upsert contract record
      await this.contractRepo.upsert(
        {
          loan_id: loanId,
          borrower_id: loan.borrower_id,
          lender_id: loan.lender_id,
          amount: loanAmount,
          status: ContractStatus.PENDING,
        },
        trx
      );

      return { walletTransactionId: walletTx.id };
    });
  }

  /**
   * Atomic settlement — reverses the funds from borrower to lender.
   */
  async settle(loanId: string, amount: number): Promise<{ walletTransactionId: string }> {
    return this.db.transaction(async (trx) => {
      const loan = await this.db<any>('loans').where({ id: loanId }).forUpdate().transacting(trx).first();
      if (!loan) throw new PreconditionNotMetError(`Loan ${loanId} not found`);

      // Idempotency check: if Already settled, return dummy or throw
      if (loan.status === LoanStatus.SETTLED) {
        throw new PreconditionNotMetError('Loan is already settled');
      }

      // Check state
      try {
        LoanStateMachine.assertTransition(loan.status, LoanStatus.SETTLED);
      } catch {
        throw new InvalidStateTransitionError(loan.status, LoanStatus.SETTLED);
      }

      const loanAmount = Number(loan.amount);

      // Lock both wallets
      const borrowerWallet = await this.walletRepo.findByUserId(loan.borrower_id, trx);
      if (!borrowerWallet) throw new PreconditionNotMetError('Borrower wallet not found');
      const lockedBorrowerWallet = await this.walletRepo.findByIdForUpdate(borrowerWallet.id, trx);
      if (!lockedBorrowerWallet) throw new PreconditionNotMetError('Borrower wallet lock failed');

      if (Number(lockedBorrowerWallet.balance) < loanAmount) {
        throw new InsufficientFundsError(
          `Borrower balance (${lockedBorrowerWallet.balance}) is insufficient to repay loan amount (${loanAmount})`
        );
      }

      const lenderWallet = await this.walletRepo.findByUserId(loan.lender_id, trx);
      if (!lenderWallet) throw new PreconditionNotMetError('Lender wallet not found');
      const lockedLenderWallet = await this.walletRepo.findByIdForUpdate(lenderWallet.id, trx);
      if (!lockedLenderWallet) throw new PreconditionNotMetError('Lender wallet lock failed');

      // Debit borrower
      const newBorrowerBalance = Number(lockedBorrowerWallet.balance) - loanAmount;
      await this.walletRepo.updateBalance(lockedBorrowerWallet.id, newBorrowerBalance, trx);

      // Credit lender
      const newLenderBalance = Number(lockedLenderWallet.balance) + loanAmount;
      await this.walletRepo.updateBalance(lockedLenderWallet.id, newLenderBalance, trx);

      // Record transaction
      const walletTx = await this.walletRepo.insertTransaction(
        {
          loan_id: loanId,
          debit_wallet_id: lockedBorrowerWallet.id,
          credit_wallet_id: lockedLenderWallet.id,
          amount: loanAmount,
        },
        trx
      );

      // Update schema markers
      await this.db('loans')
        .where({ id: loanId })
        .update({ status: LoanStatus.SETTLED, updated_at: new Date() })
        .transacting(trx);

      await this.contractRepo.settle(loanId, trx);

      return { walletTransactionId: walletTx.id };
    });
  }
}
