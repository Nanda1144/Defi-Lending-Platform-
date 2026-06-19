import { useState, useEffect, useCallback } from "react";
import { LendingPoolService } from "../services/lendingPoolService";
import { useWallet } from "./useWallet";
import { Loan } from "../types/blockchain";

/**
 * Custom hook bridging the UI with the LendingPoolService.
 * Exposes loading states, data, and action methods for the frontend components.
 */
export function useLendingPool() {
  const { provider, signer, address, isConnected } = useWallet();
  const [service, setService] = useState<LendingPoolService | null>(null);
  
  const [openLoans, setOpenLoans] = useState<Loan[]>([]);
  const [totalLoansCount, setTotalLoansCount] = useState<bigint>(0n);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service when wallet connects and both provider and signer exist
  useEffect(() => {
    if (provider && signer && address && isConnected) {
      const initService = async () => {
        try {
          const _service = new LendingPoolService(provider);
          await _service.initialize();
          setService(_service);
        } catch (err: any) {
          console.error("Failed to initialize LendingPool Service:", err);
          setError("Failed to connect to smart contract.");
        }
      };
      initService();
    } else {
      setService(null);
      setOpenLoans([]);
    }
  }, [provider, signer, address, isConnected]);

  /**
   * Loads open loans from the marketplace and updates state.
   */
  const loadOpenLoans = useCallback(async () => {
    if (!service) return;
    try {
      setIsLoading(true);
      const { loans, total } = await service.getAllOpenLoans();
      setOpenLoans(loans);
      setTotalLoansCount(total);
    } catch (err) {
      console.error('Failed to load open loans:', err);
      setError('Failed to load marketplace data');
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // Load open loans once the service is ready
  useEffect(() => {
    if (service) {
      loadOpenLoans();
    }
  }, [service]);

  /**
   * Action: Create a new loan offer.
   */
  const createLoanOffer = async (principal: bigint, interestRate: bigint, duration: bigint, penaltyRate: bigint) => {
    if (!service) throw new Error("Please connect your wallet first.");
    
    try {
      setIsLoading(true);
      const receipt = await service.createLoanOffer(principal, interestRate, duration, penaltyRate);
      await loadOpenLoans(); // Refresh marketplace immediately
      return receipt;
    } catch (err: any) {
      console.error("Create Loan error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action: Borrow an open loan.
   */
  const borrowLoan = async (loanId: bigint) => {
    if (!service) throw new Error("Please connect your wallet first.");
    
    try {
      setIsLoading(true);
      const receipt = await service.borrowLoan(loanId);
      await loadOpenLoans(); // Refresh marketplace immediately
      return receipt;
    } catch (err: any) {
      console.error("Borrow Loan error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action: Repay an active loan.
   */
  const repayLoan = async (loanId: bigint) => {
    if (!service) throw new Error("Please connect your wallet first.");
    
    try {
      setIsLoading(true);
      const receipt = await service.repayLoan(loanId);
      return receipt;
    } catch (err: any) {
      console.error("Repay Loan error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action: Cancel an open loan offer.
   */
  const cancelLoanOffer = async (loanId: bigint) => {
    if (!service) throw new Error("Please connect your wallet first.");
    
    try {
      setIsLoading(true);
      const receipt = await service.cancelLoanOffer(loanId);
      return receipt;
    } catch (err: any) {
      console.error("Cancel Loan Offer error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch details of a single loan.
   */
  const getLoanDetails = async (loanId: bigint) => {
    if (!service) throw new Error("Please connect your wallet first.");
    return await service.getLoanDetails(loanId);
  };
  
  /**
   * Fetch loans for a specific borrower.
   */
  const loadBorrowerLoans = async (borrowerAddress: string) => {
    if (!service) throw new Error("Please connect your wallet first.");
    return await service.getBorrowerLoans(borrowerAddress);
  };

  /**
   * Fetch loans for a specific lender.
   */
  const loadLenderLoans = async (lenderAddress: string) => {
    if (!service) throw new Error("Please connect your wallet first.");
    return await service.getLenderLoans(lenderAddress);
  };

  /**
   * Calculate current repayment for a loan.
   */
  const calculateRepayment = async (loanId: bigint) => {
    if (!service) throw new Error("Please connect your wallet first.");
    return await service.calculateRepayment(loanId);
  };

  /**
   * Fetch aggregated statistics for the pool.
   */
  const getAggregatedStats = async () => {
    if (!service) throw new Error("Please connect your wallet first.");
    return await service.getAggregatedStats();
  };

  return {
    service,
    address,          // Passed through from useWallet for convenience
    openLoans,
    totalLoansCount,
    isLoading,
    error,
    loadOpenLoans,
    createLoanOffer,
    borrowLoan,
    repayLoan,
    cancelLoanOffer,
    getLoanDetails,
    loadBorrowerLoans,
    loadLenderLoans,
    calculateRepayment,
    getAggregatedStats
  };
}
