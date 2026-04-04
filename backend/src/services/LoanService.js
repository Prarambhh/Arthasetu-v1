const { v4: uuidv4 } = require('uuid');
const { LoanStore } = require('../models/LoanStore');
const { UserStore } = require('../models/UserStore');
const { CreditScoreService } = require('./CreditScoreService');
const { getBlockchain } = require('../blockchain/Blockchain');

const LoanService = {
  /**
   * Scan active loans and auto-default overdue ones.
   */
  checkAndProcessDefaults() {
    const overdue = LoanStore.getOverdue();
    overdue.forEach(loan => {
      LoanStore.update(loan.loanId, { status: 'DEFAULTED', defaultedAt: new Date().toISOString() });
      CreditScoreService.applyDefault(loan.borrowerId);
      CreditScoreService.recompute(loan.borrowerId);
      getBlockchain().addBlock('LOAN_DEFAULTED', {
        loanId: loan.loanId,
        borrowerId: loan.borrowerId,
        amount: loan.amount,
      });
    });
    return overdue.length;
  },

  createLoan(borrowerId, amount, durationDays) {
    // Validation
    if (!amount || amount <= 0) throw new Error('Loan amount must be greater than 0');
    const maxLoan = CreditScoreService.getMaxLoan(borrowerId);
    if (amount > maxLoan) {
      throw new Error(`Amount exceeds your borrowing limit of ₹${maxLoan} (creditScore × 100)`);
    }

    const borrower = UserStore.findById(borrowerId);
    if (!borrower) throw new Error('Borrower not found');

    const loanId = uuidv4();
    const createdAt = new Date().toISOString();
    const dueAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const loan = LoanStore.create({
      loanId,
      borrowerId,
      borrowerWallet: borrower.walletAddress,
      lenderId: null,
      lenderWallet: null,
      amount: Number(amount),
      repaidAmount: 0,
      durationDays: Number(durationDays),
      status: 'PENDING',
      createdAt,
      fundedAt: null,
      dueAt,
      defaultedAt: null,
      repaidAt: null,
    });

    UserStore.addLoanToHistory(borrowerId, loanId);

    getBlockchain().addBlock('LOAN_CREATED', {
      loanId,
      borrowerId,
      borrowerWallet: borrower.walletAddress,
      amount,
      durationDays,
    });

    return loan;
  },

  fundLoan(lenderId, loanId) {
    const loan = LoanStore.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.status !== 'PENDING') throw new Error(`Loan is already ${loan.status}`);
    if (loan.borrowerId === lenderId) throw new Error('Cannot fund your own loan');

    const lender = UserStore.findById(lenderId);
    if (!lender) throw new Error('Lender not found');
    if (lender.balance < loan.amount) throw new Error('Insufficient balance to fund this loan');

    // Deduct from lender balance
    UserStore.update(lenderId, { balance: lender.balance - loan.amount });

    // Credit loan amount to borrower
    const borrower = UserStore.findById(loan.borrowerId);
    UserStore.update(loan.borrowerId, { balance: borrower.balance + loan.amount });

    const fundedAt = new Date().toISOString();
    const updated = LoanStore.update(loanId, {
      lenderId,
      lenderWallet: lender.walletAddress,
      status: 'ACTIVE',
      fundedAt,
    });

    UserStore.addLoanToHistory(lenderId, loanId);
    CreditScoreService.applyLoanActivated(loan.borrowerId);
    CreditScoreService.recompute(loan.borrowerId);

    getBlockchain().addBlock('LOAN_FUNDED', {
      loanId,
      lenderId,
      lenderWallet: lender.walletAddress,
      borrowerId: loan.borrowerId,
      amount: loan.amount,
    });

    return updated;
  },

  repayLoan(borrowerId, loanId, amount) {
    const loan = LoanStore.findById(loanId);
    if (!loan) throw new Error('Loan not found');
    if (loan.status === 'REPAID') throw new Error('Loan is already fully repaid');
    if (loan.status === 'DEFAULTED') throw new Error('Cannot repay a defaulted loan');
    if (loan.status === 'PENDING') throw new Error('Loan has not been funded yet');
    if (loan.borrowerId !== borrowerId) throw new Error('Only the borrower can repay this loan');

    const repayAmount = Math.min(Number(amount), loan.amount - loan.repaidAmount);
    if (repayAmount <= 0) throw new Error('Invalid repayment amount');

    const borrower = UserStore.findById(borrowerId);
    if (!borrower) throw new Error('Borrower not found');
    if (borrower.balance < repayAmount) throw new Error('Insufficient balance for repayment');

    // Move funds back to lender
    const lender = UserStore.findById(loan.lenderId);
    if (lender) UserStore.update(loan.lenderId, { balance: lender.balance + repayAmount });

    // Deduct from borrower
    UserStore.update(borrowerId, { balance: borrower.balance - repayAmount });

    const newRepaid = loan.repaidAmount + repayAmount;
    const isFullyRepaid = newRepaid >= loan.amount;
    const now = new Date().toISOString();
    const isOnTime = new Date(now) <= new Date(loan.dueAt);

    const updates = {
      repaidAmount: newRepaid,
      status: isFullyRepaid ? 'REPAID' : 'ACTIVE',
      repaidAt: isFullyRepaid ? now : null,
    };
    const updated = LoanStore.update(loanId, updates);

    // Score update
    if (isFullyRepaid) {
      if (isOnTime) {
        CreditScoreService.applyOnTimeRepayment(borrowerId);
      } else {
        // Late but completed: reduce active loans, no bonus
        const user = UserStore.findById(borrowerId);
        UserStore.update(borrowerId, { activeLoans: Math.max(0, (user.activeLoans || 0) - 1) });
      }
    } else {
      CreditScoreService.applyPartialRepayment(borrowerId);
    }
    CreditScoreService.recompute(borrowerId);

    getBlockchain().addBlock('LOAN_REPAID', {
      loanId,
      borrowerId,
      amount: repayAmount,
      totalRepaid: newRepaid,
      loanAmount: loan.amount,
      isFullyRepaid,
      isOnTime,
    });

    return { loan: updated, isFullyRepaid, isOnTime, repayAmount };
  },
};

module.exports = { LoanService };
