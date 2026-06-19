# Implement Complete Loan Workflow

## Goal Description
Create a full end‑to‑end loan lifecycle in the DPL frontend, connecting all UI pages to the deployed smart contracts via ethers v6. The workflow covers:
- **Lender**: Create loan, approve tokens, publish loan.
- **Borrower**: View available loans, accept a loan, receive tokens, repay loan.
- **System**: Calculate interest, penalties and update loan status (handled by contract, exposed via UI).
- **Treasury**: Collect the platform fee after loan creation.
- **Transaction History**: Persist every blockchain transaction and display a live feed.
- **Live Updates**: UI updates automatically after each transaction using contract events.

All code follows the modular architecture already introduced (`src/lib/blockchain.ts`, `src/services`, `src/hooks`, `src/app/pages`). Typescript typings, async/await with try/catch, loading states, and toast notifications are added. No hard‑coded addresses; they are read from `process.env.NEXT_PUBLIC_*`.

## User Review Required
> [!IMPORTANT]  
> The plan introduces several new files and modifies existing UI pages. Review the proposed file structure, naming conventions, and the decision to use a lightweight custom `Toast` component instead of an external library. Approve or suggest alternatives.

## Open Questions
> [!WARNING]  
> - **Event names**: Confirm the exact event signatures emitted by the LendingPool contract (e.g., `LoanCreated(uint256 loanId)`, `LoanBorrowed(uint256 loanId)`). If they differ, adjust the listeners accordingly.
> - **Notification UI**: Do you prefer a custom toast component or integrating a library like `react-hot-toast`? The plan currently uses a minimal custom implementation to avoid extra dependencies.
> - **Transaction storage**: Should transaction history be persisted only in memory (React context) or also saved to `localStorage` for page reloads?

---

## Proposed Changes

### 1. Core Utilities (`src/lib/blockchain.ts`)
- Already created – no changes needed.

### 2. Types (`src/types/blockchain.ts`)
- Add TypeScript interfaces for loan data and transaction entries.

### 3. Services (`src/services`)
- **LendingPoolService** – already includes core methods.
- Add wrapper functions in `src/services/lendingService.ts` that expose higher‑level actions (create, borrow, repay) and emit UI‑friendly results.
- Add `src/services/treasuryService.ts` for fee collection.

### 4. Hooks (`src/hooks`)
| Hook | Purpose |
|------|---------|
| `useCreateLoan.ts` | Calls `LendingPoolService.createLoanOffer` and returns `{createLoan, loading, error}` |
| `useBorrowLoan.ts` | Calls `borrowLoan` and returns `{borrowLoan, loading, error}` |
| `useRepayLoan.ts` | Calls `repayLoan` and returns `{repayLoan, loading, error}` |
| `useTreasury.ts` | Calls `getTreasuryBalance` and `collectFee` |
| `useTransactionHistory.ts` | Maintains an array of `{txHash, type, status, timestamp}`. Persists to `localStorage`.
| `useContractEvents.ts` | Subscribes to contract events (`LoanCreated`, `LoanBorrowed`, `LoanRepaid`, `FeeCollected`) and updates transaction history + UI state via context.

### 5. UI Components (`src/components`)
- **Toast.tsx** – simple component with `show(message, type)` API using a React context.
- **LoadingSpinner.tsx** – reusable spinner.
- **LoanCard.tsx** – display loan summary with actions.
- **TransactionList.tsx** – live list of recent transactions.

### 6. Pages (`src/app`)
| Page | New / Updated Files |
|------|--------------------|
| `/dashboard` | Show aggregated stats, treasury balance, recent transactions.
| `/create-loan` | New page with form → uses `useCreateLoan`. Shows loading, success/error toast.
| `/marketplace` | Updated to fetch open loans via `useLendingPool().getAllOpenLoans`. Each `LoanCard` has **Accept** button → `useBorrowLoan`.
| `/loan/[id]` | New dynamic page showing loan details, repayment button for borrower, status badge.
| `/treasury` | New page showing treasury balance and a **Collect Fees** button → `useTreasury`.
| `/transactions` | New page rendering `TransactionList`.

All pages import the toast context and display loading spinners while awaiting blockchain calls.

### 7. Context Provider (`src/context/BlockchainProvider.tsx`)
- Wrap the app with a provider that supplies:
  - `provider`, `signer`, `address` from `useWallet`.
  - `transactionHistory` state from `useTransactionHistory`.
  - Functions to add a transaction entry.
  - Event listeners via `useContractEvents` to push live updates.

### 8. Environment Variables (`.env.local`)
```
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x...   # Deployed address
NEXT_PUBLIC_TREASURY_ADDRESS=0x...      # Deployed address
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x...    # Deployed address
```
No hard‑coded values are left in the code.

## Verification Plan
### Automated Tests
- Run `npm run lint` and `npm run type-check` to ensure no TypeScript errors.
- Execute unit tests (if present) for service methods using mocked providers.

### Manual Verification
1. Start the dev server (`npm run dev`).
2. Connect MetaMask wallet.
3. **Lender**: Navigate to **Create Loan**, submit form, verify toast success and that the loan appears in **Marketplace**.
4. **Borrower**: Accept a loan, confirm token receipt via wallet balance.
5. Repay the loan, verify status updates to **Repaid**.
6. Treasury page shows fee collected after loan creation.
7. Transaction History page updates instantly after each tx.
8. Reload the page – persisted transaction history remains (if stored in localStorage).

---

**Please review the above plan and answer the open questions. Once approved, I will proceed to implement the files and UI components.**
