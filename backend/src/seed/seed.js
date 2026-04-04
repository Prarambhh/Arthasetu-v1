/**
 * Seed Script — ArthaSetu
 * Creates 3 demo users with wallets + sample loans + blockchain history.
 * Runs only if users.json is empty or doesn't exist.
 */
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { generateWallet } = require('../services/WalletService');
const { UserStore } = require('../models/UserStore');
const { LoanService } = require('../services/LoanService');
const { getBlockchain } = require('../blockchain/Blockchain');

const DATA_DIR = path.join(__dirname, '../../data');

function shouldSeed() {
  const usersFile = path.join(DATA_DIR, 'users.json');
  if (!fs.existsSync(usersFile)) return true;
  try {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    return users.length === 0;
  } catch {
    return true;
  }
}

function seed() {
  if (!shouldSeed()) {
    console.log('[Seed] Data already exists — skipping seed.');
    return;
  }

  console.log('[Seed] Seeding demo users and loans...');

  // --- Users ---
  const users = [
    { username: 'alice_defi', creditScore: 80, onTimeRepayments: 3, missedPayments: 0, activeLoans: 0, balance: 15000 },
    { username: 'bob_lender', creditScore: 65, onTimeRepayments: 1, missedPayments: 0, activeLoans: 1, balance: 25000 },
    { username: 'charlie_risk', creditScore: 35, onTimeRepayments: 0, missedPayments: 1, activeLoans: 1, balance: 8000 },
  ];

  const createdUsers = [];
  for (const u of users) {
    const wallet = generateWallet();
    const userId = uuidv4();
    const { getTrustTier } = require('../models/UserStore');
    const user = UserStore.create({
      userId,
      username: u.username,
      walletAddress: wallet.walletAddress,
      publicKey: wallet.publicKey,
      nonce: uuidv4(),
    });
    // Override defaults with seeded values
    UserStore.update(userId, {
      creditScore: u.creditScore,
      trustTier: getTrustTier(u.creditScore),
      onTimeRepayments: u.onTimeRepayments,
      missedPayments: u.missedPayments,
      activeLoans: u.activeLoans,
      balance: u.balance,
    });
    createdUsers.push({ ...user, ...u, userId, walletAddress: wallet.walletAddress, privateKey: wallet.privateKey });
    getBlockchain().addBlock('USER_REGISTERED', { userId, username: u.username, walletAddress: wallet.walletAddress });
    console.log(`  [Seed] Created user: ${u.username} | Wallet: ${wallet.walletAddress}`);
    console.log(`         Private Key (DEMO): ${wallet.privateKey}`);
  }

  // --- Save demo credentials to a file for easy access ---
  const credFile = path.join(DATA_DIR, 'demo_credentials.json');
  fs.writeFileSync(credFile, JSON.stringify(
    createdUsers.map(u => ({
      username: u.username,
      userId: u.userId,
      walletAddress: u.walletAddress,
      privateKey: u.privateKey,
      creditScore: u.creditScore,
      trustTier: getTrustTier(u.creditScore),
    })),
    null, 2
  ));

  function getTrustTier(score) {
    if (score <= 30) return 'HIGH_RISK';
    if (score <= 60) return 'MODERATE';
    if (score <= 80) return 'TRUSTED';
    return 'PRIME';
  }

  // --- Loans ---
  const [alice, bob, charlie] = createdUsers;

  // Alice borrows from Bob (REPAID - she's a great borrower)
  try {
    const loan1 = LoanService.createLoan(alice.userId, 3000, 30);
    LoanService.fundLoan(bob.userId, loan1.loanId);
    LoanService.repayLoan(alice.userId, loan1.loanId, 3000);
    console.log(`  [Seed] Loan 1: alice borrows 3000, bob funds, alice repays ✅`);
  } catch (e) { console.error('[Seed] Loan 1 error:', e.message); }

  // Bob borrows (ACTIVE - waiting for repayment)
  try {
    const loan2 = LoanService.createLoan(bob.userId, 2000, 15);
    LoanService.fundLoan(alice.userId, loan2.loanId);
    console.log(`  [Seed] Loan 2: bob borrows 2000, alice funds (ACTIVE) ⏳`);
  } catch (e) { console.error('[Seed] Loan 2 error:', e.message); }

  // Charlie borrows (PENDING - waiting for a lender)
  try {
    LoanService.createLoan(charlie.userId, 1500, 7);
    console.log(`  [Seed] Loan 3: charlie requests 1500, PENDING 📋`);
  } catch (e) { console.error('[Seed] Loan 3 error:', e.message); }

  // Alice creates another PENDING loan
  try {
    LoanService.createLoan(alice.userId, 5000, 60);
    console.log(`  [Seed] Loan 4: alice requests 5000, PENDING 📋`);
  } catch (e) { console.error('[Seed] Loan 4 error:', e.message); }

  console.log('[Seed] ✅ Seeding complete!');
  console.log(`[Seed] Demo credentials saved to: ${credFile}`);
}

module.exports = { seed };
