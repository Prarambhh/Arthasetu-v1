import { Router } from 'express';
import db from './db';

import { LoanRepository } from './repositories/LoanRepository';
import { WalletRepository } from './repositories/WalletRepository';
import { GuarantorRepository } from './repositories/GuarantorRepository';
import { ContractRepository } from './repositories/ContractRepository';

import { DisbursementService } from './services/DisbursementService';
import { LoanLifecycleService } from './services/LoanLifecycleService';
import { GuarantorService } from './services/GuarantorService';

import { LoanController } from './controllers/LoanController';
import { GuarantorController } from './controllers/GuarantorController';
import { ContractController } from './controllers/ContractController';
import { WalletController } from './controllers/WalletController';

import { authenticate } from './middleware/auth';

// ── Wire up dependency graph ──────────────────────────────────────────────────
const loanRepo       = new LoanRepository(db);
const walletRepo     = new WalletRepository(db);
const guarantorRepo  = new GuarantorRepository(db);
const contractRepo   = new ContractRepository(db);

const disbursementService  = new DisbursementService(db, loanRepo, walletRepo, contractRepo);
const guarantorService     = new GuarantorService(guarantorRepo);
const lifecycleService     = new LoanLifecycleService(db, loanRepo, guarantorRepo, disbursementService);

const loanCtrl      = new LoanController(lifecycleService, loanRepo, guarantorService);
const guarantorCtrl = new GuarantorController(guarantorService);
const contractCtrl  = new ContractController(contractRepo);
const walletCtrl    = new WalletController(walletRepo);

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Loan lifecycle ────────────────────────────────────────────────────────────
//  POST /loans/sync
router.post('/loans/sync', loanCtrl.sync);

//  POST /loans
router.post('/loans', loanCtrl.create);

//  POST /loans/:id/accept  (Lender picks up broadcast)
router.post('/loans/:id/accept', loanCtrl.accept);

//  POST /loans/:id/requirements
router.post('/loans/:id/requirements', loanCtrl.addRequirements);

import multer from 'multer';
import path from 'path';

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

//  POST /loans/:id/documents
router.post('/loans/:id/documents', upload.single('file'), loanCtrl.uploadDocument);

//  POST /loans/:id/review
router.post('/loans/:id/review', loanCtrl.triggerReview);

//  POST /loans/:id/approve  (includes atomic disbursement)
router.post('/loans/:id/approve', loanCtrl.approve);

//  POST /loans/:id/reject
router.post('/loans/:id/reject', loanCtrl.reject);

//  POST /loans/:id/hybrid-approve
router.post('/loans/:id/hybrid-approve', loanCtrl.hybridApprove);

//  POST /loans/:id/repay
router.post('/loans/:id/repay', loanCtrl.repay);

//  GET  /loans/pending
router.get('/loans/pending', loanCtrl.getPendingBroadcasts);

//  GET  /loans/me
router.get('/loans/me', loanCtrl.getMyAccessibleLoans);

//  GET  /loans/:id
router.get('/loans/:id', loanCtrl.getById);

// ── Guarantors ────────────────────────────────────────────────────────────────
//  POST /loans/:id/add-guarantor  (Borrower nominates a guarantor)
router.post('/loans/:id/add-guarantor', loanCtrl.addGuarantor);

//  GET  /loans/:id/guarantors  (List all guarantors for a loan)
router.get('/loans/:id/guarantors', loanCtrl.getGuarantors);

//  GET  /loans/:id/guarantors/me
router.get('/loans/:id/guarantors/me', guarantorCtrl.getMyRecord);

//  POST /loans/:id/guarantors/me/approve
router.post('/loans/:id/guarantors/me/approve', guarantorCtrl.approve);

//  POST /loans/:id/guarantors/me/reject
router.post('/loans/:id/guarantors/me/reject', guarantorCtrl.reject);

// ── Contracts ─────────────────────────────────────────────────────────────────
//  GET  /contracts
router.get('/contracts', contractCtrl.list);

//  GET  /contracts/:id
router.get('/contracts/:id', contractCtrl.detail);

// ── Wallet ────────────────────────────────────────────────────────────────────
//  GET  /wallets/me
router.get('/wallets/me', walletCtrl.getMyWallet);

export default router;
