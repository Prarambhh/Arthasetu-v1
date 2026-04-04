const db = require('./src/p2p/db').default;
const { LoanRepository } = require('./src/p2p/repositories/LoanRepository');
const { WalletRepository } = require('./src/p2p/repositories/WalletRepository');
const { ContractRepository } = require('./src/p2p/repositories/ContractRepository');
const { DisbursementService } = require('./src/p2p/services/DisbursementService');

(async function() {
  const loanRepo = new LoanRepository(db);
  const walletRepo = new WalletRepository(db);
  const contractRepo = new ContractRepository(db);
  const service = new DisbursementService(db, loanRepo, walletRepo, contractRepo);

  const loanId = 'cd896a2e-c6c6-4b4c-bd8d-d5068e615482';
  try {
    const res = await service.disburse(loanId);
    console.log('SUCCESS:', res);
  } catch (err) {
    console.error('ERROR:', err);
  }

  process.exit(0);
})();
