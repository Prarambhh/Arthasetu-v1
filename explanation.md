# ArthaSetu — Decentralized P2P Lending Protocol

> *"ArthaSetu" means "Bridge of Wealth" in Sanskrit — connecting those who need capital with those who can provide it.*

---

## 📌 Overview

ArthaSetu is a **full-stack, blockchain-inspired Peer-to-Peer (P2P) lending platform** built to simulate a decentralized finance (DeFi) lending protocol. It allows users to borrow and lend funds directly with each other, without a traditional financial intermediary, while maintaining cryptographic auditability of every transaction through a custom blockchain ledger.

The platform is designed to demonstrate real-world financial system concepts — credit scoring, loan lifecycle management, document verification, guarantors, atomic wallet settlements, and an immutable transaction ledger — in a working, full-stack application.

---

## 🏗️ Architecture

The application is split into three major layers:

```
ArthaSetu/
├── backend/          # Node.js + Express REST API
│   ├── src/
│   │   ├── p2p/      # TypeScript V2 domain — loans, contracts, wallets
│   │   │   ├── controllers/     # HTTP request handlers
│   │   │   ├── services/        # Business logic (Lifecycle, Disbursement)
│   │   │   ├── repositories/    # Database access layer (Knex.js + PostgreSQL)
│   │   │   ├── domain/          # Models, enums, state machine, error types
│   │   │   └── middleware/      # JWT auth, error handler
│   │   ├── routes/   # Legacy JS routes (auth, user, chain)
│   │   ├── blockchain/ # Custom SHA-256 linked-list blockchain
│   │   └── seed/     # Seed data for demo users
│   └── migrations/   # Knex database schema migrations
├── frontend/         # React + Vite SPA
│   └── src/
│       ├── pages/    # Dashboard, Borrow, Lend, Repay, Explorer, Profile
│       ├── components/ # LoanCard, TrustTierBadge, Navbar
│       ├── context/  # AuthContext (JWT session management)
│       └── api/      # Axios API client
```

---

## ✨ Key Features

### 🔐 Cryptographic Wallet Authentication
- Users register with a username and receive a **generated elliptic-curve key pair** (secp256k1)
- Login requires signing a server-issued challenge nonce with the user's private key
- JWT tokens are issued on successful authentication and expire after 24 hours
- No passwords — pure **wallet-based DeFi authentication**

### 💸 P2P Loan Lifecycle (V2 Domain)
Every loan progresses through a strict, enforced state machine:

```
REQUESTED → DOCS_REQUESTED → UNDER_REVIEW → APPROVED → DISBURSED → SETTLED
                                          ↘ REJECTED
```

- **Borrower** broadcasts a loan request with an amount
- **Lender** accepts the application and specifies document requirements
- **Borrower** uploads supporting documents (stored as base64 Data URLs)
- **Lender** triggers review, verifies documents, then approves
- On approval, an **atomic disbursement transaction** deducts from the lender's wallet and credits the borrower
- **Borrower** repays via another atomic transaction that reverses the fund flow and marks the contract as `settled`

### 🏦 Atomic Wallet Transactions
All fund movements are executed inside **PostgreSQL transactions** ensuring ACID guarantees:
- Row-level locks (`FOR UPDATE`) prevent race conditions on wallet rows
- Borrower/lender balances are updated atomically
- A `wallet_transactions` record is appended for every fund movement
- The wallet constraint enforces that balances can never go below zero

### 📜 Smart Contracts (V2)
After successful disbursement, a `contract` record is created, linking the borrower, lender, loan, and amount. Contracts have two states: `pending` (active obligation) and `settled` (repaid). These power the **Repay** page's active obligations view.

### ⛓️ Blockchain Ledger (Custom Implementation)
A custom SHA-256 linked-list blockchain captures key protocol events:
- User registrations
- Loan requests and approvals
- Disbursements and repayments

Each block contains: `index`, `timestamp`, `data`, `previousHash`, `hash`. The chain can be verified cryptographically via the Explorer page. It is persisted to disk as `backend/data/chain.json`.

### 📊 Credit Scoring System
Each user has a dynamic credit score (starts at 50) affected by:
- `+20 pts` per on-time repayment
- `-30 pts` per missed payment / default
- `-10 pts` per open active contract

The score determines a borrowing limit (`score × 100`). The **Trust Tier** badge provides a human-readable credit tier: `PRIME`, `NEAR_PRIME`, `MODERATE`, `SUBPRIME`.

### 🎨 Premium DeFi UI
- **Bitcoin-Orange** design language with dual light/dark mode
- Real-time dashboard portfolio view with loan lifecycle visualization
- Interactive loan marketplace (Lend page) for lenders to browse broadcasts
- Document upload interface in Loan Detail / Deal Room
- Immutable blockchain explorer for full ledger auditability
- Responsive, glassmorphism-inspired components with smooth micro-animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, React Router v6, Axios |
| **Styling** | Vanilla CSS with custom design system (Bitcoin Orange palette) |
| **Backend** | Node.js, Express.js |
| **Domain Logic** | TypeScript (ts-node, transpile-only at runtime) |
| **Database** | PostgreSQL via Knex.js query builder |
| **Auth** | JWT, elliptic-curve signatures (secp256k1 via `elliptic` library) |
| **Blockchain** | Custom SHA-256 linked list (no external chain) |
| **Migrations** | Knex migrate |

---

## 🚀 Running the Project

### Prerequisites
- Node.js v18+
- PostgreSQL running locally (or update `.env` with your connection string)

### Backend

```bash
cd backend
cp .env.example .env        # Set DATABASE_URL and JWT_SECRET
npm install
npm run migrate             # Run DB migrations
npm run start               # Starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # Starts on http://localhost:5173
```

### Environment Variables (`backend/.env`)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/arthasetu
JWT_SECRET=your_secret_here
PORT=5000
```

---

## 🔑 Demo Users

After running migrations, the seed script creates two test users:

| Role | Username | Starting Balance |
|------|----------|-----------------|
| Alice (Borrower) | `alice_borrower` | ₹10,000 |
| Bob (Lender) | `bob_lender` | ₹30,000 |

Use the **Register** flow in the UI to create fresh users, or use the existing seeded wallet addresses to log in.

---

## 📡 Key API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create wallet identity |
| `GET` | `/auth/nonce/:address` | Get signing challenge |
| `POST` | `/auth/login` | Sign nonce and get JWT |

### Loans (V2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/loans` | Create loan request (borrower) |
| `POST` | `/api/v2/loans/:id/accept` | Accept broadcast (lender) |
| `POST` | `/api/v2/loans/:id/requirements` | Add doc requirements |
| `POST` | `/api/v2/loans/:id/documents` | Upload document |
| `POST` | `/api/v2/loans/:id/review` | Trigger review |
| `POST` | `/api/v2/loans/:id/approve` | Approve + atomic disburse |
| `POST` | `/api/v2/loans/:id/repay` | Settle loan atomically |
| `GET` | `/api/v2/loans/me` | All my accessible loans |
| `GET` | `/api/v2/loans/pending` | Open market broadcasts |

### Contracts & Wallets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/contracts` | My contracts (with status filter) |
| `GET` | `/api/v2/wallets/me` | My wallet + transaction history |

### Chain
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chain` | Full blockchain |
| `GET` | `/chain/verify` | Verify chain integrity |
| `GET` | `/health` | System health + chain validity |

---

## 🏛️ Domain Design Principles

1. **State Machine Enforcement** — All loan state transitions go through `LoanStateMachine.assertTransition()`. Invalid transitions throw typed `InvalidStateTransitionError` immediately.

2. **Repository Pattern** — Database access is fully encapsulated in repositories (`LoanRepository`, `WalletRepository`, `ContractRepository`). Services depend on repository interfaces, not raw DB queries.

3. **Domain Errors → HTTP Codes** — A central `errorHandler` middleware maps typed domain errors to appropriate HTTP status codes (`422 Precondition`, `409 Conflict`, `402 Insufficient Funds`), keeping controllers clean.

4. **Atomic Transactions** — Every multi-step fund movement (disburse / settle) runs inside a single `db.transaction()` block with `FOR UPDATE` row locks. Either everything succeeds or the whole operation rolls back.

5. **Idempotency** — The disbursement service handles retry scenarios gracefully (e.g., already-disbursed loans) without corrupting state.

---

## 📂 Project Structure (Detailed)

```
backend/
├── src/
│   ├── p2p/
│   │   ├── controllers/
│   │   │   ├── LoanController.ts       # Loan lifecycle HTTP handlers
│   │   │   ├── ContractController.ts   # Contract list/detail
│   │   │   ├── GuarantorController.ts  # Guarantor approval flow
│   │   │   └── WalletController.ts     # Wallet info
│   │   ├── services/
│   │   │   ├── LoanLifecycleService.ts # State transitions + validation
│   │   │   ├── DisbursementService.ts  # Atomic fund transfers
│   │   │   └── GuarantorService.ts     # Guarantor management
│   │   ├── repositories/
│   │   │   ├── LoanRepository.ts       # Loan DB queries
│   │   │   ├── WalletRepository.ts     # Wallet DB queries + transactions
│   │   │   ├── ContractRepository.ts   # Contract upsert/settle
│   │   │   └── GuarantorRepository.ts  # Guarantor DB queries
│   │   ├── domain/
│   │   │   ├── models.ts               # TypeScript interfaces + enums
│   │   │   ├── LoanStatus.ts           # Loan status enum (re-export)
│   │   │   ├── LoanStateMachine.ts     # Transition enforcement + review gating
│   │   │   └── errors.ts               # Typed domain error classes
│   │   └── middleware/
│   │       ├── auth.ts                 # JWT verification middleware
│   │       └── errorHandler.ts         # Domain error → HTTP status mapping
│   ├── blockchain/
│   │   └── Blockchain.js               # Custom SHA-256 chain implementation
│   └── routes/
│       ├── auth.js                     # Wallet registration + login
│       ├── user.js                     # User profile + live wallet balance
│       └── chain.js                    # Chain explorer endpoints
├── migrations/
│   └── 20260404164000_init_p2p_schema.ts  # Full PostgreSQL schema
└── server.js                           # Express app entry point

frontend/
└── src/
    ├── pages/
    │   ├── Dashboard.jsx    # Portfolio overview + active operations
    │   ├── Borrow.jsx       # Create loan request
    │   ├── Lend.jsx         # Browse + fund loan broadcasts
    │   ├── Repay.jsx        # Execute contract settlements
    │   ├── LoanDetail.jsx   # Deal room (docs, requirements, approval)
    │   ├── Explorer.jsx     # Blockchain ledger explorer
    │   ├── Community.jsx    # User directory + credit scores
    │   └── Profile.jsx      # My profile + wallet stats
    ├── components/
    │   ├── LoanCard.jsx         # Loan summary card
    │   ├── TrustTierBadge.jsx   # Credit tier + score badges
    │   └── Navbar.jsx           # Navigation + theme toggle
    ├── context/
    │   └── AuthContext.jsx  # JWT storage, user refresh, logout
    └── api/
        └── index.js         # Axios client + all API calls
```

---

## 🔮 Future Roadmap

- [ ] Partial repayment support (tracked via `repaid_amount` column)
- [ ] Interest rate calculation (flat or reducing balance)
- [ ] On-chain event hashing for guarantor actions
- [ ] Multi-currency support (BTC, ETH, INR)
- [ ] Push notifications for loan status changes
- [ ] Mobile-responsive PWA version
- [ ] Admin dashboard for protocol governance

---

*Built with ❤️ as a demonstration of real-world DeFi lending mechanics applied to a full-stack TypeScript/React application.*
