import { BrowserProvider, Contract, EventLog } from "ethers";
import { LENDING_POOL_ABI, CONTRACT_ADDRESS } from "../utils/constants";
import { TransactionRecord, TransactionType } from "../types/history";

/**
 * Service to fetch and parse blockchain events to build a transaction history.
 */
export class HistoryService {
  private provider: BrowserProvider;
  private contract: Contract;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
    this.contract = new Contract(CONTRACT_ADDRESS, LENDING_POOL_ABI, provider);
  }

  /**
   * Fetches the block timestamp for a given block number.
   * Uses a cache to avoid redundant RPC calls.
   */
  private blockTimestampCache: Record<number, number> = {};
  
  private async getBlockTimestamp(blockNumber: number): Promise<number> {
    if (this.blockTimestampCache[blockNumber]) {
      return this.blockTimestampCache[blockNumber];
    }
    const block = await this.provider.getBlock(blockNumber);
    if (block) {
      this.blockTimestampCache[blockNumber] = block.timestamp;
      return block.timestamp;
    }
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Fetches all relevant historical events for a specific user address.
   */
  async getUserHistory(userAddress: string, fromBlock = 0): Promise<TransactionRecord[]> {
    const records: TransactionRecord[] = [];
    
    // Create filters for the user
    // Depending on the event, the user could be parameter 1, 2, or 3.
    // In a production app with millions of blocks, you'd use a subgraph (The Graph).
    // For MVP, querying the RPC directly is sufficient.

    // 1. Loan Created (lender is param 2 - indexed)
    const createdFilter = this.contract.filters.LoanCreated(null, userAddress);
    const createdLogs = await this.contract.queryFilter(createdFilter, fromBlock);

    // 2. Loan Accepted (borrower is param 2, lender is param 3)
    const acceptedBorrowerFilter = this.contract.filters.LoanAccepted(null, userAddress);
    const acceptedLenderFilter = this.contract.filters.LoanAccepted(null, null, userAddress);
    const acceptedLogs1 = await this.contract.queryFilter(acceptedBorrowerFilter, fromBlock);
    const acceptedLogs2 = await this.contract.queryFilter(acceptedLenderFilter, fromBlock);
    
    // 3. Loan Repaid (borrower is param 2, lender is param 3)
    const repaidBorrowerFilter = this.contract.filters.LoanRepaid(null, userAddress);
    const repaidLenderFilter = this.contract.filters.LoanRepaid(null, null, userAddress);
    const repaidLogs1 = await this.contract.queryFilter(repaidBorrowerFilter, fromBlock);
    const repaidLogs2 = await this.contract.queryFilter(repaidLenderFilter, fromBlock);

    // 4. Loan Cancelled (lender is param 2)
    const cancelledFilter = this.contract.filters.LoanCancelled(null, userAddress);
    const cancelledLogs = await this.contract.queryFilter(cancelledFilter, fromBlock);

    // Combine all logs and remove duplicates (if user is both lender and borrower theoretically)
    const allLogs = [
      ...createdLogs, 
      ...acceptedLogs1, ...acceptedLogs2, 
      ...repaidLogs1, ...repaidLogs2, 
      ...cancelledLogs
    ];
    
    // Deduplicate by transaction hash + log index
    const uniqueLogs = Array.from(new Map(allLogs.map(log => [`${log.transactionHash}-${log.index}`, log])).values());

    // Parse logs
    for (const log of uniqueLogs) {
      if (log instanceof EventLog) {
        const timestamp = await this.getBlockTimestamp(log.blockNumber);
        
        // Parse specific event types based on fragment name
        let type: TransactionType;
        let amount = 0n;
        let sender = "";
        let receiver = "";
        
        const loanId = log.args[0];

        switch (log.eventName) {
          case "LoanCreated":
            type = TransactionType.LOAN_CREATED;
            sender = log.args[1];
            receiver = await this.contract.getAddress(); // Escrowed in pool
            amount = log.args[2];
            break;
            
          case "LoanAccepted":
            type = TransactionType.LOAN_ACCEPTED;
            sender = await this.contract.getAddress(); // From pool
            receiver = log.args[1]; // Borrower
            amount = log.args[3];
            break;
            
          case "LoanRepaid":
            type = TransactionType.LOAN_REPAID;
            sender = log.args[1]; // Borrower
            receiver = log.args[2]; // Lender
            amount = log.args[3]; // Total Repaid
            break;
            
          case "LoanCancelled":
            type = TransactionType.LOAN_CANCELLED;
            sender = await this.contract.getAddress(); // From pool
            receiver = log.args[1]; // Lender
            amount = log.args[2];
            break;
            
          default:
            continue;
        }

        records.push({
          hash: log.transactionHash,
          type,
          amount,
          sender,
          receiver,
          timestamp,
          status: "SUCCESS", // Mined events are successful
          blockNumber: log.blockNumber,
          loanId: BigInt(loanId)
        });
      }
    }

    // Sort descending by block number (newest first)
    return records.sort((a, b) => b.blockNumber - a.blockNumber);
  }
}
