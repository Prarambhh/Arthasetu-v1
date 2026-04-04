const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { LoanService } = require('../services/LoanService');
const { LoanStore } = require('../models/LoanStore');
const { UserStore } = require('../models/UserStore');

// Run default check on every loan request
router.use((req, res, next) => {
  try { LoanService.checkAndProcessDefaults(); } catch (e) {}
  next();
});

/**
 * POST /loan/create
 * Auth required. Creates a new loan request.
 */
router.post('/create', authenticate, (req, res) => {
  try {
    const { amount, durationDays } = req.body;
    if (!amount || !durationDays) {
      return res.status(400).json({ error: 'amount and durationDays are required' });
    }
    const loan = LoanService.createLoan(req.user.userId, Number(amount), Number(durationDays));
    res.status(201).json({ message: 'Loan created successfully', loan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /loan/fund
 * Auth required. Lender funds a pending loan.
 */
router.post('/fund', authenticate, (req, res) => {
  try {
    const { loanId } = req.body;
    if (!loanId) return res.status(400).json({ error: 'loanId is required' });
    const loan = LoanService.fundLoan(req.user.userId, loanId);
    res.json({ message: 'Loan funded successfully', loan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /loan/repay
 * Auth required. Borrower repays part or all of a loan.
 */
router.post('/repay', authenticate, (req, res) => {
  try {
    const { loanId, amount } = req.body;
    if (!loanId || !amount) return res.status(400).json({ error: 'loanId and amount are required' });
    const result = LoanService.repayLoan(req.user.userId, loanId, Number(amount));
    res.json({
      message: result.isFullyRepaid ? 'Loan fully repaid!' : `Partial repayment of ₹${result.repayAmount} recorded`,
      ...result,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /loan/all
 * Public. Returns all loans with borrower/lender info.
 */
router.get('/all', (req, res) => {
  const loans = LoanStore.getAll();
  // Enrich with user info
  const enriched = loans.map(loan => {
    const borrower = UserStore.findById(loan.borrowerId);
    const lender = loan.lenderId ? UserStore.findById(loan.lenderId) : null;
    return {
      ...loan,
      borrowerName: borrower?.username,
      borrowerScore: borrower?.creditScore,
      borrowerTier: borrower?.trustTier,
      lenderName: lender?.username,
    };
  });
  res.json(enriched);
});

/**
 * GET /loan/:loanId
 * Public. Returns a single loan with enriched user info.
 */
router.get('/:loanId', (req, res) => {
  const loan = LoanStore.findById(req.params.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const borrower = UserStore.findById(loan.borrowerId);
  const lender = loan.lenderId ? UserStore.findById(loan.lenderId) : null;
  res.json({
    ...loan,
    borrowerName: borrower?.username,
    borrowerScore: borrower?.creditScore,
    borrowerTier: borrower?.trustTier,
    lenderName: lender?.username,
  });
});

module.exports = router;
