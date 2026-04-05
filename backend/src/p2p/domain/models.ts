export enum LoanStatus {
  REQUESTED = 'requested',
  DOCS_REQUESTED = 'docs_requested',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  SETTLED = 'settled',
  REJECTED = 'rejected'
}

export enum RequirementType {
  DOCUMENT = 'document',
  GUARANTOR = 'guarantors'
}

export enum GuarantorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ContractStatus {
  PENDING = 'pending',
  SETTLED = 'settled'
}

export interface User {
  id: string;
  name: string;
  email: string;
  hashed_password?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number | string;
  updated_at: Date;
}

export interface Loan {
  id: string;
  borrower_id: string;
  lender_id?: string;
  amount: number | string;
  interest_rate?: number | string;
  status: LoanStatus;
  requested_at: Date;
  updated_at: Date;
}

export interface LoanRequirement {
  id: string;
  loan_id: string;
  type: RequirementType;
  label: string;
  fulfilled: boolean;
}

export interface LoanDocument {
  id: string;
  loan_id: string;
  requirement_id: string;
  uploaded_by: string;
  file_reference: string;
  uploaded_at: Date;
}

export interface Guarantor {
  id: string;
  loan_id: string;
  user_id: string;
  status: GuarantorStatus;
  responded_at?: Date;
}

export interface WalletTransaction {
  id: string;
  loan_id: string;
  debit_wallet_id: string;
  credit_wallet_id: string;
  amount: number | string;
  created_at: Date;
}

export interface Contract {
  id: string;
  loan_id: string;
  borrower_id: string;
  lender_id?: string;
  amount: number | string;
  outstanding_principal: number | string;
  status: ContractStatus;
  issued_at: Date;
  last_payment_at: Date;
  settled_at?: Date;
}
