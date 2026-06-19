# 📊 Blockchain Transaction History Architecture

> **Focus:** DeFi Lending Platform  
> **Tech Stack:** Ethers.js v6, Next.js, Smart Contract Events  

---

## 🏛️ System Architecture

The transaction history system relies entirely on **On-Chain Events**. Since smart contract storage is expensive, the platform uses Ethereum's highly efficient `LOG` opcodes (Events) as a historical database. 

Instead of maintaining a separate traditional database (like MongoDB), the Next.js frontend queries the blockchain's event logs via RPC to dynamically reconstruct the user's transaction history.

### 🔄 Data Flow

```mermaid
graph TD
    A[Next.js Component] -->|Calls useTransactionHistory| B(useTransactionHistory Hook)
    B -->|Instantiates| C[HistoryService]
    C -->|Query filters based on User Address| D[Ethers.js v6]
    D -->|RPC Call: eth_getLogs| E[Sepolia RPC Node]
    E -->|Returns Raw Logs| D
    D -->|Parses via ABI| C
    C -->|Normalizes to TransactionRecord[]| B
    B -->|Returns State| A
```

---

## 🗃️ Event Data Sources

The `LendingPool.sol` contract emits several indexed events that serve as our data source:

1. **`LoanCreated(loanId, lender, principalAmount, ...)`**
2. **`LoanAccepted(loanId, borrower, lender, principalAmount, ...)`**
3. **`LoanRepaid(loanId, borrower, lender, totalRepaid, ...)`**
4. **`LoanCancelled(loanId, lender, principalAmount)`**

*Note: By indexing `lender` and `borrower`, we can efficiently query only the logs relevant to the currently connected MetaMask wallet.*

---

## 🛠️ Implementation Details

I have generated three files in your `frontend/` directory to implement this architecture:

### 1. `types/history.ts`
Defines the `TransactionRecord` interface which normalizes raw blockchain logs into a clean, UI-ready format.

```typescript
export interface TransactionRecord {
  hash: string;
  type: TransactionType;
  amount: bigint;
  sender: string;
  receiver: string;
  timestamp: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  blockNumber: number;
  loanId: bigint;
}
```

### 2. `services/historyService.ts`
The core business logic using Ethers.js v6.
- Constructs filters dynamically based on the user's address.
- Queries `queryFilter()` across the contract for the relevant events.
- Caches block timestamps to minimize `eth_getBlockByNumber` RPC calls.
- Deduplicates logs natively.

### 3. `hooks/useTransactionHistory.ts`
A custom React Hook bridging the `HistoryService` to your components.
- Handles loading states (`isLoadingHistory`).
- Catches and exposes errors (`historyError`).
- Automatically fetches history when the user's wallet connects.

---

## 🚀 How to use in your Frontend

You can now easily display a beautiful transaction table or list using the generated hook:

```tsx
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { formatUnits } from 'ethers';

export default function HistoryPage() {
  const { transactions, isLoadingHistory } = useTransactionHistory();

  if (isLoadingHistory) return <p>Loading on-chain data...</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Amount (USDC)</th>
          <th>Status</th>
          <th>Tx Hash</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.hash}>
            <td>{tx.type}</td>
            <td>{formatUnits(tx.amount, 6)}</td>
            <td>✅ {tx.status}</td>
            <td>
              <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank">
                {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
              </a>
            </td>
            <td>{new Date(tx.timestamp * 1000).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## ⚠️ Production Considerations

For an MVP, querying directly via RPC is perfect. However, if the platform scales to millions of blocks, iterating through all logs via `queryFilter(fromBlock = 0)` will hit RPC rate limits (e.g., Alchemy/Infura max block range limits).

**Future Scaling Path (Version 2):**
Integrate **The Graph (Subgraph)**. A subgraph will index these events off-chain into a GraphQL API, allowing instant, paginated, and complex historical queries without taxing the RPC nodes.
