const { UserStore, getTrustTier } = require('../models/UserStore');

/**
 * Credit Score Formula:
 *   score = (onTimeRepayments * 20) - (missedPayments * 30) - (activeLoans * 10)
 * Clamped to [0, 100], starting base of 50.
 *
 * maxLoan = creditScore * 100
 */

const CreditScoreService = {
  /**
   * Recompute and persist a user's credit score based on their stats.
   */
  recompute(userId) {
    const user = UserStore.findById(userId);
    if (!user) return null;

    const base = 50;
    const raw =
      base +
      user.onTimeRepayments * 20 -
      user.missedPayments * 30 -
      user.activeLoans * 10;

    const creditScore = Math.max(0, Math.min(100, raw));
    const trustTier = getTrustTier(creditScore);

    return UserStore.update(userId, { creditScore, trustTier });
  },

  /**
   * Called when a loan is fully repaid on time.
   */
  applyOnTimeRepayment(userId) {
    const user = UserStore.findById(userId);
    if (!user) return null;
    return UserStore.update(userId, {
      onTimeRepayments: (user.onTimeRepayments || 0) + 1,
      activeLoans: Math.max(0, (user.activeLoans || 0) - 1),
    });
  },

  /**
   * Called after stats update to recompute score.
   */
  applyPartialRepayment(userId) {
    // Partial repayment: small bonus but no full score recovery
    const user = UserStore.findById(userId);
    if (!user) return null;
    // For partial repayments we give +3 directly (hackathon simplification)
    const creditScore = Math.max(0, Math.min(100, (user.creditScore || 50) + 3));
    return UserStore.update(userId, { creditScore });
  },

  /**
   * Called when a loan defaults.
   */
  applyDefault(userId) {
    const user = UserStore.findById(userId);
    if (!user) return null;
    return UserStore.update(userId, {
      missedPayments: (user.missedPayments || 0) + 1,
      activeLoans: Math.max(0, (user.activeLoans || 0) - 1),
    });
  },

  /**
   * Called when a new loan is activated (funded).
   */
  applyLoanActivated(userId) {
    const user = UserStore.findById(userId);
    if (!user) return null;
    return UserStore.update(userId, {
      activeLoans: (user.activeLoans || 0) + 1,
    });
  },

  getMaxLoan(userId) {
    const user = UserStore.findById(userId);
    if (!user) return 0;
    return (user.creditScore || 50) * 100;
  },
};

module.exports = { CreditScoreService };
