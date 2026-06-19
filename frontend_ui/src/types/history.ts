export enum TransactionType {
  LOAN_CREATED = "LOAN_CREATED",
  LOAN_ACCEPTED = "LOAN_ACCEPTED",
  LOAN_REPAID = "LOAN_REPAID",
  LOAN_CANCELLED = "LOAN_CANCELLED",
  FEE_COLLECTED = "FEE_COLLECTED",
}

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
