import { ethers, BrowserProvider, Contract } from "ethers";
import { LENDING_POOL_ABI, CONTRACT_ADDRESS, MOCK_USDC_ADDRESS, ERC20_ABI } from "../utils/constants";
import { Loan, LoanStatus } from "../types/blockchain";

/**
 * Service Layer abstracting direct Ethers.js contract interactions.
 * Ensures scalable architecture by keeping component logic clean.
 */
export class LendingPoolService {
  // ... existing content ...
  private provider: BrowserProvider;
  private signer: ethers.JsonRpcSigner | null = null;
  private contract: Contract | null = null;
  private usdcContract: Contract | null = null;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
  }

  /**
   * Initializes the contract instances with the current user's signer.
   */
  async initialize() {
    this.signer = await this.provider.getSigner();
    if (!CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS is not set. Please define NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.');
    }
    this.contract = new Contract(CONTRACT_ADDRESS, LENDING_POOL_ABI, this.signer);
    this.usdcContract = new Contract(MOCK_USDC_ADDRESS, ERC20_ABI, this.signer);
  }

  private ensureInitialized() {
    if (!this.contract || !this.usdcContract || !this.signer) {
      throw new Error("LendingPoolService not initialized. Call initialize() first.");
    }
  }

  /**
   * Checks allowance and prompts approval if needed.
   */
  async approveUSDCIfNeeded(amount: bigint) {
    this.ensureInitialized();
    const ownerAddress = await this.signer!.getAddress();
    const allowance: bigint = await this.usdcContract!.allowance(ownerAddress, CONTRACT_ADDRESS);
    
    if (allowance < amount) {
      const tx = await this.usdcContract!.approve(CONTRACT_ADDRESS, ethers.MaxUint256); // Infinite approve for better UX
      await tx.wait();
    }
  }

  /**
   * Creates a new loan offer and escrows the principal + platform fee.
   */
  async createLoanOffer(principal: bigint, interestRate: bigint, duration: bigint, penaltyRate: bigint) {
    this.ensureInitialized();
    
    const fee: bigint = await this.contract!.calculateFee(principal);
    const totalRequired = principal + fee;
    
    await this.approveUSDCIfNeeded(totalRequired);

    const tx = await this.contract!.createLoanOffer(principal, interestRate, duration, penaltyRate);
    return await tx.wait();
  }

  /**
   * Accepts an open loan offer from the marketplace.
   */
  async borrowLoan(loanId: bigint) {
    this.ensureInitialized();
    
    const loan = await this.getLoanDetails(loanId);
    const fee: bigint = await this.contract!.calculateFee(loan.principalAmount);
    
    if (fee > 0n) {
      await this.approveUSDCIfNeeded(fee);
    }

    const tx = await this.contract!.borrowLoan(loanId);
    return await tx.wait();
  }

  /**
   * Repays an active loan (calculates principal + interest + penalty).
   */
  async repayLoan(loanId: bigint) {
    this.ensureInitialized();
    
    // Preview the total repayment required
    const [,,, totalRepayment] = await this.contract!.calculateRepayment(loanId);

    await this.approveUSDCIfNeeded(totalRepayment);

    const tx = await this.contract!.repayLoan(loanId);
    return await tx.wait();
  }

  /**
   * Cancels an open loan offer and refunds the escrowed principal.
   */
  async cancelLoanOffer(loanId: bigint) {
    this.ensureInitialized();
    const tx = await this.contract!.cancelLoanOffer(loanId);
    return await tx.wait();
  }

  /**
   * Fetches the complete details of a specific loan.
   */
  async getLoanDetails(loanId: bigint): Promise<Loan> {
    this.ensureInitialized();
    const loanData = await this.contract!.getLoanDetails(loanId);
    
    return {
      loanId: BigInt(loanData.loanId),
      lender: loanData.lender,
      borrower: loanData.borrower,
      principalAmount: BigInt(loanData.principalAmount),
      interestRate: BigInt(loanData.interestRate),
      duration: BigInt(loanData.duration),
      penaltyRate: BigInt(loanData.penaltyRate),
      createdAt: BigInt(loanData.createdAt),
      startTime: BigInt(loanData.startTime),
      repaidAmount: BigInt(loanData.repaidAmount),
      status: Number(loanData.status) as LoanStatus
    };
  }

  /**
   * Fetches paginated open loans for the marketplace.
   */
  async getAllOpenLoans(offset = 0, limit = 50): Promise<{ loans: Loan[], total: bigint }> {
    this.ensureInitialized();
    const [rawLoans, total] = await this.contract!.getAllOpenLoans(offset, limit);
    
    const loans: Loan[] = rawLoans.map((loanData: any) => ({
      loanId: BigInt(loanData.loanId),
      lender: loanData.lender,
      borrower: loanData.borrower,
      principalAmount: BigInt(loanData.principalAmount),
      interestRate: BigInt(loanData.interestRate),
      duration: BigInt(loanData.duration),
      penaltyRate: BigInt(loanData.penaltyRate),
      createdAt: BigInt(loanData.createdAt),
      startTime: BigInt(loanData.startTime),
      repaidAmount: BigInt(loanData.repaidAmount),
      status: Number(loanData.status) as LoanStatus
    }));

    return { loans, total: BigInt(total) };
  }

  /**
   * Fetches all loans borrowed by a specific address.
   */
  async getBorrowerLoans(borrowerAddress: string): Promise<Loan[]> {
    this.ensureInitialized();
    const ids: bigint[] = await this.contract!.getBorrowerLoanIds(borrowerAddress);
    const loans: Loan[] = [];
    for (const id of ids) {
      const loan = await this.getLoanDetails(id);
      loans.push(loan);
    }
    return loans;
  }

  /**
   * Fetches all loans offered by a specific lender address.
   */
  async getLenderLoans(lenderAddress: string): Promise<Loan[]> {
    this.ensureInitialized();
    const ids: bigint[] = await this.contract!.getLenderLoanIds(lenderAddress);
    const loans: Loan[] = [];
    for (const id of ids) {
      const loan = await this.getLoanDetails(id);
      loans.push(loan);
    }
    return loans;
  }

  /**
   * Calculates current repayment breakdown for a loan.
   */
  async calculateRepayment(loanId: bigint): Promise<{ principal: bigint; interest: bigint; penalty: bigint; totalRepayment: bigint }> {
    this.ensureInitialized();
    const [principal, interest, penalty, totalRepayment] = await this.contract!.calculateRepayment(loanId);
    return { principal, interest, penalty, totalRepayment };
  }

  /**
   * Fetches aggregated statistics for the pool.
   */
  async getAggregatedStats(): Promise<any> {
    this.ensureInitialized();
    if (typeof this.contract!.getAggregatedStats === "function") {
      return await this.contract!.getAggregatedStats();
    }
    // Fallback if the contract doesn't have it explicitly mapped
    return { totalDeposited: 0n, totalBorrowed: 0n, activeLoans: 0n };
  }
}
