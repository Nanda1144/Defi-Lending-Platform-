# 🚀 DeFi Lending Platform

> A Decentralized Peer-to-Peer Lending Platform built on Ethereum Blockchain using Smart Contracts, MetaMask, and Web3 technologies.

## 📋 Prerequisites

Before you start, ensure you have the following **mandatory** items:

- **MetaMask wallet(s)** with enough Sepolia test ETH and USDC (or MockUSDC) to cover loan amounts, fees, and gas.
- **Alchemy (or Infura) Sepolia RPC URL** – required for the frontend to read/write the blockchain.
- **Etherscan API key** – for transaction verification and block‑explorer links.
- **Deployed contract addresses** (LendingPool, Treasury, MockUSDC) – must be set in `.env` before running the app.
- **Sufficient test‑token balance** – lenders need USDC to fund offers; borrowers need ETH for gas.

> ⚠️ All the above items are required; the application will not function without them.

---

## 📌 Project Overview

The DeFi Lending Platform enables users to lend and borrow digital assets without relying on traditional financial institutions.

By leveraging blockchain technology and smart contracts, the platform ensures:

- Transparency
- Security
- Trustless Transactions
- Decentralization
- Immutable Records

Users can create loan offers, borrow funds, repay loans, and verify all transactions directly on the blockchain.

---

# 🎯 Problem Statement

Traditional lending systems suffer from:

❌ Centralized Control

❌ High Processing Fees

❌ Slow Loan Approval

❌ Limited Transparency

❌ Third-Party Dependency

❌ Geographical Restrictions

---

# 💡 Solution

The DeFi Lending Platform removes intermediaries and allows:

✅ Peer-to-Peer Lending

✅ Smart Contract Automation

✅ Transparent Loan Agreements

✅ Secure Blockchain Transactions

✅ Global Accessibility

✅ Real-Time Verification

---

# 🔥 Key Features

## Lender Features

- Connect MetaMask Wallet
- Create Loan Offers with custom terms
- Set Interest Rates (basis points)
- Define Loan Duration
- Define Penalty Rates for late repayment
- Cancel open offers and reclaim escrowed funds
- Track Active Loans via on-chain events

---

## Borrower Features

- Connect Wallet
- Browse Loan Marketplace (paginated)
- View Loan Terms and calculate repayment
- Accept Loan Agreements
- Receive Funds directly from escrow
- Repay Loans (principal + interest + penalty if overdue)

---

## Platform Features

- Loan Marketplace with paginated queries
- Smart Contract Automation (escrow, fee deduction, status management)
- On-chain Transaction History via events
- Loan Verification through Etherscan
- Platform Fee Collection (0.001% from both parties)
- Emergency Pause/Unpause circuit breaker

---

# 🏗️ System Architecture

```text
┌───────────────────────┐
│        USER           │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│   Next.js Frontend    │
│      (Vercel)         │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│      MetaMask         │
│ Wallet Authentication │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│      Ethers.js        │
│ Contract Interaction  │
└──────────┬────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│            Smart Contracts                  │
│  ┌───────────────┐  ┌───────────────┐       │
│  │ LendingPool   │──│  Treasury     │       │
│  │   .sol        │  │    .sol       │       │
│  └───────┬───────┘  └───────────────┘       │
│          │                                  │
│  ┌───────┴───────┐                          │
│  │  MockUSDC     │                          │
│  │    .sol       │                          │
│  └───────────────┘                          │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌───────────────────────┐
│ Ethereum Blockchain   │
│    Sepolia Testnet    │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│     Etherscan         │
│ Transaction Explorer  │
└───────────────────────┘
```

---

# 🔐 Smart Contract Architecture

## Contract Separation Strategy

The platform uses a **modular 3-contract architecture** with clear separation of concerns:

| Contract | Responsibility | Security |
|----------|---------------|----------|
| `LendingPool.sol` | Core lending logic, loan lifecycle, escrow | ReentrancyGuard, Pausable, Ownable |
| `Treasury.sol` | Fee collection, vault management, withdrawals | Ownable, ReentrancyGuard |
| `MockUSDC.sol` | ERC-20 test token (Sepolia only) | Ownable, ERC20 |

### Why Three Contracts?

- **Single Responsibility** — Each contract handles one domain
- **Security Isolation** — Fee funds are never mixed with loan escrow
- **Upgradability** — Treasury can be swapped without touching lending logic
- **Auditability** — Smaller, focused contracts are easier to audit

---

## LendingPool.sol — Core Lending Engine

The brain of the platform. Manages the entire loan lifecycle.

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `createLoanOffer()` | Any user | Create a loan offer; escrows principal, collects lender fee |
| `cancelLoanOffer()` | Loan lender only | Cancel open offer; refunds escrowed principal |
| `borrowLoan()` | Any user (not lender) | Accept a loan; collects borrower fee, disburses funds |
| `repayLoan()` | Loan borrower only | Repay in full (principal + interest + penalty) |
| `getLoanDetails()` | Public (view) | Get full details of a specific loan |
| `getAllOpenLoans()` | Public (view) | Paginated marketplace listing |
| `calculateRepayment()` | Public (view) | Preview repayment breakdown |
| `getLenderLoanIds()` | Public (view) | All loan IDs for a lender |
| `getBorrowerLoanIds()` | Public (view) | All loan IDs for a borrower |
| `getOpenLoanCount()` | Public (view) | Total open loans count |
| `calculateFee()` | Public (pure) | Calculate platform fee for an amount |
| `setTreasuryAddress()` | Owner only | Update Treasury reference |
| `pause() / unpause()` | Owner only | Emergency circuit breaker |

### Loan Struct

```solidity
struct Loan {
    uint256 loanId;           // Unique auto-incremented identifier
    address lender;           // Fund provider address
    address borrower;         // Borrower address (address(0) when OPEN)
    uint256 principalAmount;  // Loan amount in token's smallest unit
    uint256 interestRate;     // Annual rate in basis points (500 = 5%)
    uint256 duration;         // Duration in seconds
    uint256 penaltyRate;      // Late penalty in basis points
    uint256 createdAt;        // Creation timestamp
    uint256 startTime;        // Acceptance timestamp
    uint256 repaidAmount;     // Total amount repaid
    LoanStatus status;        // Current lifecycle state
}
```

### Loan Status Enum

```solidity
enum LoanStatus {
    OPEN,       // 0 — Waiting for borrower
    ACTIVE,     // 1 — Funds disbursed
    REPAID,     // 2 — Fully repaid
    CANCELLED,  // 3 — Lender cancelled
    DEFAULTED   // 4 — Expired (future use)
}
```

### Events

| Event | When Emitted |
|-------|-------------|
| `LoanCreated` | Lender creates a new loan offer |
| `LoanAccepted` | Borrower accepts an open loan |
| `LoanRepaid` | Borrower repays the loan in full |
| `LoanCancelled` | Lender cancels an open offer |
| `FeeCollected` | Platform fee is deducted |
| `TreasuryUpdated` | Treasury address is changed |

### Security Features

- **ReentrancyGuard** — Prevents reentrancy attacks on all state-changing functions
- **Pausable** — Emergency circuit breaker for critical situations
- **Ownable** — Admin-only access for sensitive operations
- **SafeERC20** — Secure token transfers handling non-standard ERC20s
- **Checks-Effects-Interactions** — State updated before external calls
- **Swap-and-Pop** — O(1) array removal preventing DoS on large datasets
- **Input Validation** — All parameters validated with descriptive error messages

---

## Treasury.sol — Fee Vault

Secure vault that collects, holds, and disburses platform fees.

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `recordFee()` | LendingPool only | Record fee deposit for accounting |
| `withdrawFees()` | Owner only | Withdraw accumulated fees |
| `emergencyWithdraw()` | Owner only | Emergency full withdrawal |
| `getBalance()` | Public (view) | Current token balance |
| `getAvailableFees()` | Public (view) | Unwithdrawn fee balance |
| `setLendingPool()` | Owner only | Set authorized LendingPool address |

---

## MockUSDC.sol — Test Token

ERC-20 token simulating USDC for Sepolia testnet development.

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `mint()` | Owner only | Mint tokens to any address |
| `faucet()` | Public | Claim 10,000 mUSDC (24h cooldown) |
| `decimals()` | Public (view) | Returns 6 (matches real USDC) |

> **Note:** MockUSDC is NOT deployed to mainnet. On mainnet, the platform integrates with the real USDC contract.

---

# 💰 Platform Fee Structure

```text
Fee Rate: 0.001% (1 / 100,000)

┌────────────────────────────────────────────┐
│  EXAMPLE: Loan of 10,000 USDC             │
├────────────────────────────────────────────┤
│  Lender Fee  = 10,000 × 1/100,000 = 0.1   │
│  Borrower Fee = 10,000 × 1/100,000 = 0.1  │
│  Total Platform Revenue = 0.2 USDC/loan    │
└────────────────────────────────────────────┘
```

- Lender fee collected at **loan creation** (non-refundable on cancellation)
- Borrower fee collected at **loan acceptance**
- All fees sent directly to Treasury contract

---

# 📊 Repayment Formula

```text
interest = (principal × interestRate × elapsed) / (365 days × 10,000)

IF elapsed > duration:
  overdueTime = elapsed - duration
  penalty = (principal × penaltyRate × overdueTime) / (365 days × 10,000)
ELSE:
  penalty = 0

totalRepayment = principal + interest + penalty
```

---

# 🔄 Workflow Diagrams

## Loan Creation Flow

```text
Lender
   │
   ▼
Connect Wallet (MetaMask)
   │
   ▼
Approve Token Spend (principal + fee)
   │
   ▼
createLoanOffer(amount, rate, duration, penalty)
   │
   ▼
Principal → LendingPool (Escrow)
Fee → Treasury
   │
   ▼
Loan Status: OPEN
   │
   ▼
Appears on Marketplace
```

---

## Borrowing Flow

```text
Borrower
    │
    ▼
Connect Wallet (MetaMask)
    │
    ▼
Browse Marketplace (getAllOpenLoans)
    │
    ▼
Select Loan → View Terms
    │
    ▼
Approve Token Spend (borrower fee)
    │
    ▼
borrowLoan(loanId)
    │
    ▼
Fee → Treasury
Principal (from Escrow) → Borrower
    │
    ▼
Loan Status: ACTIVE
```

---

## Repayment Flow

```text
Borrower
   │
   ▼
calculateRepayment(loanId) → Preview amount
   │
   ▼
Approve Token Spend (totalRepayment)
   │
   ▼
repayLoan(loanId)
   │
   ▼
Total Repayment → Lender
   │
   ▼
Loan Status: REPAID
```

---

## Cancellation Flow

```text
Lender
   │
   ▼
cancelLoanOffer(loanId)
   │
   ▼
Escrowed Principal → Lender (refunded)
   │
   ▼
Loan Status: CANCELLED
(Fee NOT refunded)
```

---

# 📊 Loan Lifecycle

```text
         createLoanOffer()
              │
              ▼
           ┌──────┐
           │ OPEN │
           └──┬───┘
              │
     ┌────────┴────────┐
     │                 │
  borrowLoan()    cancelLoanOffer()
     │                 │
     ▼                 ▼
 ┌────────┐      ┌───────────┐
 │ ACTIVE │      │ CANCELLED │
 └───┬────┘      └───────────┘
     │
  repayLoan()
     │
     ▼
 ┌────────┐
 │ REPAID │
 └────────┘
```

---

# 📂 Project Structure

```text
DeFi-Lending-Platform/
│
├── contracts/
│   ├── LendingPool.sol       # Core lending engine (~350 lines)
│   ├── Treasury.sol          # Fee vault management (~120 lines)
│   └── MockUSDC.sol          # Test ERC-20 token (~80 lines)
│
├── frontend/
│   ├── app/                  # Next.js app router pages
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks (Web3)
│   ├── services/             # Contract interaction layer
│   ├── utils/                # Helper utilities
│   └── types/                # TypeScript type definitions
│
├── scripts/
│   └── deploy.ts             # Hardhat deployment script
│
├── test/
│   ├── LendingPool.test.ts   # Core logic unit tests
│   ├── Treasury.test.ts      # Fee management tests
│   └── Integration.test.ts   # End-to-end flow tests
│
├── public/                   # Static assets
├── hardhat.config.ts         # Hardhat configuration
├── .env.local                # Environment variables
└── README.md                 # This file
```

---

# 💻 Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| Next.js | React Framework |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| ShadCN UI | UI Components |
| React Hook Form | Form Handling |
| Zod | Validation |

---

## Blockchain

| Technology | Purpose |
|------------|---------|
| Solidity ^0.8.24 | Smart Contracts |
| Hardhat | Development & Testing |
| OpenZeppelin v5 | Secure Contract Libraries |
| Ethers.js v6 | Blockchain Communication |

---

## Wallet & Network

| Technology | Purpose |
|------------|---------|
| MetaMask | Authentication & Transactions |
| Sepolia Testnet | Development Network |
| Etherscan | Contract Verification & Explorer |

---

## Hosting

| Platform | Purpose |
|----------|---------|
| Vercel | Frontend Hosting |
| Sepolia | Smart Contract Hosting |
| Etherscan | Contract Verification |

---

# 🚀 Deployment

## Deployment Order (Critical)

```text
Step 1: Deploy MockUSDC.sol
Step 2: Deploy Treasury.sol
Step 3: Deploy LendingPool.sol (pass MockUSDC + Treasury addresses)
Step 4: Treasury.setLendingPool(LendingPool.address)
Step 5: Verify all contracts on Etherscan
Step 6: Mint test USDC to test accounts
```

## Constructor Parameters

```text
MockUSDC:     No arguments (name/symbol hardcoded)
Treasury:     No arguments (owner = deployer)
LendingPool:  _tokenAddress (MockUSDC), _treasuryAddress (Treasury)
```

---

# ⚙️ Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_MOCK_USDC_ADDRESS=

NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
NEXT_PUBLIC_RPC_URL=

PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone <repository-url>
```

## Install Dependencies

```bash
npm install
```

## Compile Contracts

```bash
npx hardhat compile
```

## Run Local Blockchain

```bash
npx hardhat node
```

## Deploy Smart Contracts

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Start Frontend

```bash
npm run dev
```

---

# 🔍 Transaction Verification

Every transaction generates:

- Transaction Hash
- Block Number
- Timestamp
- Gas Used
- Status (Success/Fail)

All major actions emit indexed events for efficient frontend querying.

---

# 🧪 Testing Strategy

| Category | Scope |
|----------|-------|
| Unit — LendingPool | Create, accept, repay, cancel with valid/invalid inputs |
| Unit — Treasury | Fee deposits, withdrawals, access control |
| Integration | Full lifecycle: create → accept → repay |
| Edge Cases | Zero amounts, self-borrowing, double repayment, re-cancellation |
| Security | Reentrancy, unauthorized access, overflow scenarios |

---

# 🔮 Future Enhancements

## Version 2

- Credit Score System
- Collateral Management
- IPFS Integration
- Decentralized Identity
- DAO Governance
- NFT Loan Certificates
- Chainlink Price Feeds

---

# 👨‍💻 Author

**Nanda Kishore**

Blockchain Developer | Full Stack Developer

---

# 📜 License

This project is developed for educational, research, portfolio, and blockchain learning purposes.if any one can use give the credits to me. 