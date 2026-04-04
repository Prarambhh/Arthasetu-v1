const express = require('express');
const router = express.Router();
const { UserStore } = require('../models/UserStore');
const { LoanStore } = require('../models/LoanStore');
const { authenticate } = require('../middleware/auth');

/**
 * GET /user/all
 * Public leaderboard — returns all users (no private data).
 */
router.get('/all', (req, res) => {
  const users = UserStore.getAll().map(u => ({
    userId: u.userId,
    username: u.username,
    walletAddress: u.walletAddress,
    creditScore: u.creditScore,
    trustTier: u.trustTier,
    onTimeRepayments: u.onTimeRepayments,
    missedPayments: u.missedPayments,
    activeLoans: u.activeLoans,
    loanHistory: u.loanHistory,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

/**
 * GET /user/profile/:userId
 * Public profile — credit score, history, tier.
 */
router.get('/profile/:userId', (req, res) => {
  const user = UserStore.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const loans = LoanStore.getAll().filter(l =>
    l.borrowerId === user.userId || l.lenderId === user.userId
  );

  res.json({
    userId: user.userId,
    username: user.username,
    walletAddress: user.walletAddress,
    creditScore: user.creditScore,
    trustTier: user.trustTier,
    maxLoan: user.creditScore * 100,
    onTimeRepayments: user.onTimeRepayments,
    missedPayments: user.missedPayments,
    activeLoans: user.activeLoans,
    loanHistory: loans,
    createdAt: user.createdAt,
  });
});

/**
 * GET /user/me
 * Auth required. My profile including balance.
 */
router.get('/me', authenticate, (req, res) => {
  const user = UserStore.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const loans = LoanStore.getAll().filter(l =>
    l.borrowerId === user.userId || l.lenderId === user.userId
  );

  res.json({
    userId: user.userId,
    username: user.username,
    walletAddress: user.walletAddress,
    publicKey: user.publicKey,
    creditScore: user.creditScore,
    trustTier: user.trustTier,
    maxLoan: user.creditScore * 100,
    balance: user.balance,
    onTimeRepayments: user.onTimeRepayments,
    missedPayments: user.missedPayments,
    activeLoans: user.activeLoans,
    loanHistory: loans,
    nonce: user.nonce,
    createdAt: user.createdAt,
  });
});

module.exports = router;
