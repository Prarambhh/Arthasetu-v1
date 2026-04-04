const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../../data/users.json');

function _load() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function _save(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getTrustTier(score) {
  if (score <= 30) return 'HIGH_RISK';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'TRUSTED';
  return 'PRIME';
}

const UserStore = {
  getAll() {
    return _load();
  },

  findById(userId) {
    return _load().find(u => u.userId === userId) || null;
  },

  findByWallet(walletAddress) {
    return _load().find(u => u.walletAddress === walletAddress) || null;
  },

  create(userObj) {
    const users = _load();
    const newUser = {
      ...userObj,
      creditScore: 50,
      trustTier: 'MODERATE',
      loanHistory: [],
      balance: 10000,           // Simulated starting balance
      onTimeRepayments: 0,
      missedPayments: 0,
      activeLoans: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    _save(users);
    return newUser;
  },

  update(userId, updates) {
    const users = _load();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    // Recompute trustTier
    users[idx].trustTier = getTrustTier(users[idx].creditScore);
    _save(users);
    return users[idx];
  },

  addLoanToHistory(userId, loanId) {
    const users = _load();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx === -1) return null;
    if (!users[idx].loanHistory.includes(loanId)) {
      users[idx].loanHistory.push(loanId);
    }
    _save(users);
    return users[idx];
  },
};

module.exports = { UserStore, getTrustTier };
