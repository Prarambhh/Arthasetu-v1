# ArthaSetu: Project Technical State Documentation

## 1. Project Overview
ArthaSetu is a decentralized peer-to-peer (P2P) lending protocol designed to remove central intermediaries. It utilizes a custom-built, lightweight blockchain ledger for immutable record-keeping and an algorithmic credit scoring system based strictly on user behavior. The system mitigates traditional counterparty risk by enforcing mathematical trust tiers, sovereign cryptographic identity, and direct peer-to-peer capital coordination.

---

## 2. Frontend Features

### UI Components and Purpose
- **Layout & Structure:** Managed primarily via a global `Navbar` containing navigation links, theme toggling (Light/Dark mode), and wallet connection status.
- **TrustTierBadge / CreditScoreRing:** Reusable visual components mapping algorithmic risk into user-friendly UI indicators (e.g., PRIME, TRUSTED, MODERATE, HIGH_RISK).
- **Forms & Inputs:** Standardized input fields mapped to specialized workflows (e.g., Borrow requests, Repayment processing, Private Key authentication).
- **Data visualization:** Blockchain explorer interfaces displaying the immutable ledger visually via `Blocks` or lists of transactions.

### User Workflows and Interactions
- **Authentication:** Users connect by providing their public identity (wallet address) and cryptographically signing a challenge nonce with their private key. First-time users register to generate a fresh secp256k1 keypair natively in the browser/backend.
- **Borrowing:** Users define a requested loan amount and duration. The system restricts borrowing capacity dynamically based on `CreditScore × 100`.
- **Lending/Funding:** Lenders view a global "Pending Loans" pool and choose to lock capital into a loan contract.
- **Repayment:** Borrowers can partially or fully repay active loans. The UI calculates whether the loan is overdue and applies the repayment instantly.

### Pages & Views
- **`/dashboard`:** Overview of user's active loans, pending requests, and current balance alongside their risk metrics.
- **`/borrow`:** Form interface for initiating capital requests.
- **`/lend`:** Global marketplace of pending loan requests from other users.
- **`/repay`:** Interface for managing active debts and settling them.
- **`/explorer`:** A real-time visualizer mapping the raw JSON block data from the backend's blockchain structure.
- **`/community` (Leaderboard):** Global ranking of users by trust tier to gamify reliable repayment behavior.
- **`/profile/:id`:** Specific user view showcasing the user's "Risk Diagnostics Matrix".

### State Management
- **React Context API:** Used globally (`AuthContext`, `ThemeContext`). `AuthContext` hydrates from `localStorage` tokens and wraps axios requests to maintain session state seamlessly.
- **Local Component State:** Uses standard `useState` and `useEffect` for fetching and storing API responses locally per route.

### Authentication Approach
- **Sovereign Identity:** The user retains a private key (secp256k1). When logging in, the frontend fetches a `nonce` from the backend, uses the private key to sign the nonce, and sends the signature. No passwords exist in the system.

### Styling & Design System
- **Tailwind CSS:** Comprehensive utility-first styling.
- **Bitcoin/Fintech Aesthetics:** Usage of dark themes, subtle orange/gold glow effects (`glow-orange`, `text-bitcoin-500`), and glassmorphism.
- **Responsive:** Fully responsive across mobile, tablet, and desktop interfaces.

### Third-Party Libraries
- `react`, `react-router-dom`: Core framework and routing.
- `axios`: For executing REST calls to the backend API.
- `lucide-react`: For lightweight, consistent iconography.

---

## 3. Backend Features

### API Endpoints
- **Auth (`/auth`)**:
  - `POST /register`: Generates new wallet keypairs, records registration block, and creates user profile.
  - `GET /nonce/:wallet`: Retrieves the current challenge string for signing.
  - `POST /login`: Validates the signed nonce against the user's public key securely.
- **Users (`/user`)**:
  - `GET /me`: Returns protected profile and balance info of the authenticated user.
  - `GET /profile/:id`: Public route returning an individual's trust score and history.
  - `GET /all`: Returns the user base for the community leaderboard.
- **Loans (`/loan`)**:
  - `POST /create`: Registers a `PENDING` loan request.
  - `POST /fund`: Lender locks capital to transition loan to `ACTIVE`.
  - `POST /repay`: Borrower transfers capital back to lender, updating reputation limits.
  - `GET /all` & `GET /:id`: Retrieves global or specific loan data.
- **Blockchain (`/chain`)**:
  - `GET /`: Dumps the entire blockchain ledger.
  - `GET /verify`: Runs cryptographic validation over the chain to prove no tampering occurred.

### Database Schema and Relationships
As a decentralized demonstration prototype, the "Database" is backed entirely by JSON files on disk (`/data`):
- `users.json`: Stores user profiles mapped to `userId`, `walletAddress`, `creditScore`, balances, etc.
- `loans.json`: Stores loan objects (`borrowerId`, `lenderId`, state enum, amounts, dates).
- `chain.json`: The immutable ledger containing chained `Block` objects.

### Authentication Mechanisms
- Backed by `crypto-js` and `elliptic` (secp256k1 curve). 
- Issuance of standard JWTs (`jsonwebtoken`) upon successful signature validation, valid for 24 hours. Subsequent endpoints use a standard `Bearer` token middleware.

### Business Logic & Algorithms
- **Credit Score Formula:** Handled by `CreditScoreService.js`.
  - Score clamped between 0 and 100.
  - Recomputed on events: On-time (+), Missed (-), Active Loan (-).
  - Categorizes user into `PRIME`, `TRUSTED`, `MODERATE`, or `HIGH_RISK`.
- **Default Processor:** `LoanService.checkAndProcessDefaults()` acts as a pseudo-cron/daemon checked on every loan request. Overdue loans are forcefully moved to `DEFAULTED`, immediately slashing the borrower's credit score.

### Blockchain Architecture
- **`Blockchain.js` & `Block.js`**: Core classes. Blocks hold `index`, `timestamp`, `type` (e.g. `LOAN_FUNDED`), `data`, and a `prevHash`.
- Tampering mathematically invalidates the chain during the `verifyChain()` routine.

---

## 4. Current State & Status

### Fully Functional
- Full cryptographic authentication flow (Register & Login via Wallet).
- End-to-end loan life cycle (Create -> Fund -> Repay).
- Real-time algorithmic credit scoring system.
- Immutable block-writing sequence matching core business logic.

### Known Limitations & Technical Debt
- **JSON Storage Engine:** Highly susceptible to race conditions under heavy concurrent load. 
- **Centralized Ledger Operation:** While the blockchain structure is fully standard, it currently operates on a single Node.js instance instead of a distributed P2P network of validators.
- **Simulated Capital:** Token balances are currently localized variables internally managed rather than mapped to true ERC-20/layer 1 tokens.

---

## 5. Technology Stack

- **Runtime:** Node.js
- **Backend Framework:** Express.js
- **Cryptography:** `crypto-js` (Hashing), `elliptic` ( secp256k1 Signatures), `jsonwebtoken` (Session)
- **Data Layer:** Native `fs` Operations parsing JSON
- **Frontend Framework:** React 18 (Vite Bundler)
- **Frontend Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Icons:** Lucide React

---

## 6. Deployment & Environment
- Designed currently for local development.
- **Frontend Environment:** Served via Vite development server targeting `http://localhost:5173`. Uses `.env` vars or hardcoded HTTP endpoints to map to the local API.
- **Backend Environment:** Served via Nodemon/Node.js on `http://localhost:5000`. Runs a middleware exposing open CORS policies for local dev (`localhost:5173`, `localhost:3000`). Data directories (`/data`) are dynamically generated relative to the executed script path. 

*Configuration requirements strictly involve valid `node` > 18.x and native `npm install` execution in both frontend and backend directories.*
