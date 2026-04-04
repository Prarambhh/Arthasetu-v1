const fs = require('fs');
const path = require('path');

const LOANS_FILE = path.join(__dirname, '../../data/loans.json');

function _load() {
  try {
    if (fs.existsSync(LOANS_FILE)) {
      return JSON.parse(fs.readFileSync(LOANS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function _save(loans) {
  const dir = path.dirname(LOANS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOANS_FILE, JSON.stringify(loans, null, 2));
}

const LoanStore = {
  getAll() {
    return _load();
  },

  findById(loanId) {
    return _load().find(l => l.loanId === loanId) || null;
  },

  findByBorrower(borrowerId) {
    return _load().filter(l => l.borrowerId === borrowerId);
  },

  findByLender(lenderId) {
    return _load().filter(l => l.lenderId === lenderId);
  },

  create(loanObj) {
    const loans = _load();
    loans.push(loanObj);
    _save(loans);
    return loanObj;
  },

  update(loanId, updates) {
    const loans = _load();
    const idx = loans.findIndex(l => l.loanId === loanId);
    if (idx === -1) return null;
    loans[idx] = { ...loans[idx], ...updates };
    _save(loans);
    return loans[idx];
  },

  getPending() {
    return _load().filter(l => l.status === 'PENDING');
  },

  getActive() {
    return _load().filter(l => l.status === 'ACTIVE');
  },

  getOverdue() {
    const now = new Date();
    return _load().filter(l => l.status === 'ACTIVE' && new Date(l.dueAt) < now);
  },
};

module.exports = { LoanStore };
