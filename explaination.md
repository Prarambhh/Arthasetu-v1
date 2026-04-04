# ArthaSetu: System Architecture & Design Philosophy
**A comprehensive guide to the decentralized peer-to-peer lending protocol.**

This document outlines the core mechanisms of ArthaSetu, specifically detailing how the system addresses fundamental challenges in trust, identity, risk management, and transaction execution without relying on centralized control.

---

## 1. How does the system ensure trust, transparency, and dependable repayment without centralized control?

### A. Immutable Ledger (Transparency & Trust)
At the heart of ArthaSetu is a custom-built, cryptographically secure blockchain ledger. Every state-altering action—such as user registration (`USER_REGISTERED`), loan initiation (`LOAN_CREATED`), funding (`LOAN_FUNDED`), repayment (`LOAN_REPAID`), and defaulting (`LOAN_DEFAULTED`)—is recorded as a discrete block.
- **Why it matters:** Every participant has access to the exact same history. Transactions are chained together using SHA-256 hashing. If any historical record is tampered with, the cryptographic link is broken, immediately invalidating the chain. This mathematical guarantee replaces the need for a central trusted authority.

### B. Algorithmic Risk Assessment (Dependable Repayment)
Instead of relying on centralized credit bureaus (like CIBIL or Experian), ArthaSetu implements a deterministic, automated `CreditScoreService`.
- **Score Computation:** Credit scores are calculated natively based purely on on-chain behavior. The formula rewards positive action and heavily penalizes failures: 
  `Base Score + (On-Time Repayments × 20) - (Missed Payments × 30) - (Active Loans × 10)`
- **Dynamic Borrowing Limits:** The system Programmatically enforces maximum borrowing limits based on the user's current credit score (`Score × 100`). Users cannot over-leverage themselves beyond what their on-chain reputation permits.
- **Trust Tiers:** Users are categorized into algorithmic tiers (PRIME, TRUSTED, MODERATE, HIGH_RISK), giving lenders immediate, transparent insight into counterparty risk.

---

## 2. How are we focusing on solving Identity, Risk, and Transaction challenges?

### A. The Identity Challenge: Sybil Resistance & Self-Sovereignty
Traditional fintech relies on KYC/AML via centralized databases. ArthaSetu uses **Sovereign Cryptographic Identity**.
- **Secp256k1 Keypairs:** Users are identified not by a username/password, but by an Ethereum-style wallet address generated from a public/private keypair.
- **Challenge-Response Authentication:** When a user logs in, the system issues a unique, one-time `nonce`. The user must cryptographically sign this nonce using their private key. The backend verifies the signature against their public key.
- **Impact:** Identities cannot be spoofed, stolen via standard database breaches, or unilaterally revoked by a central administrator. The user has absolute sovereign control over their identity.

### B. The Risk Challenge: Automated Enforcement & Skin in the Game
Lending without collateral or a centralized legal system introduces high counterparty risk. ArthaSetu mitigates this mathematically.
- **Reputation as Collateral:** Because a user's borrowing capacity is directly tied to their on-chain reputation, defaulting permanently slashes their credit score and borrowing limit. The economic incentive is structured so that maintaining access to capital is more valuable than defaulting on a single loan.
- **Automated Default Processing:** A background `checkAndProcessDefaults` daemon continuously scans for overdue loans. If a loan passes its due date without full repayment, it is automatically marked as `DEFAULTED`, the user's score takes an immediate hit, and an immutable default block is written to the chain. No human intervention is required to enforce penalties.

### C. The Transaction Challenge: Frictionless Peer-to-Peer Capital Flow
Traditional loans take days to clear through intermediary banks. ArthaSetu completely flattens the execution process.
- **Direct Matching:** Borrowers broadcast loan requests directly to the network. Lenders can view the global loan book and selectively fund loans based on their individual risk appetite and the borrower's algorithmic trust tier.
- **Atomic Settlement:** When a lender funds a loan, the capital moves instantly from the lender's account to the borrower's account, and the `LOAN_FUNDED` block is locked into the chain simultaneously. Repayments flow directly back to the lender with the same immediacy.
- **Zero Middlemen:** Because trust is handled by the blockchain and risk is handled by the algorithmic credit score, there is no need for a banking intermediary to underwrite or process the transactions, drastically reducing overhead and friction.
