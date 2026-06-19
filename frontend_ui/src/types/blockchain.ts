export enum LoanStatus {
  OPEN,
  ACTIVE,
  REPAID,
  CANCELLED,
  DEFAULTED,
}

export interface Loan {
  loanId: bigint;
  lender: string;
  borrower: string;
  principalAmount: bigint;
  interestRate: bigint;
  duration: bigint;
  penaltyRate: bigint;
  createdAt: bigint;
  startTime: bigint;
  repaidAmount: bigint;
  status: LoanStatus;
}
