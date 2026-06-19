import { useState, useEffect, useCallback } from "react";
import { HistoryService } from "../services/historyService";
import { useWallet } from "./useWallet";
import { TransactionRecord } from "../types/history";

/**
 * Custom hook to load and manage the user's transaction history.
 */
export function useTransactionHistory() {
  const { provider, address, isConnected } = useWallet();
  const [historyService, setHistoryService] = useState<HistoryService | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (provider && isConnected) {
      setHistoryService(new HistoryService(provider));
    } else {
      setHistoryService(null);
      setTransactions([]);
    }
  }, [provider, isConnected]);

  const loadHistory = useCallback(async () => {
    if (!historyService || !address || !isConnected) return;

    try {
      setIsLoadingHistory(true);
      setHistoryError(null);
      // In production, limit fromBlock to avoid massive RPC loads, 
      // or implement pagination based on block ranges.
      const startBlock = 0; // Fetch from genesis for MVP
      const records = await historyService.getUserHistory(address, startBlock);
      setTransactions(records);
    } catch (err: any) {
      console.error("Failed to load transaction history:", err);
      setHistoryError("Could not fetch transaction history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyService, address, isConnected]);

  // Load history automatically when service and address are ready
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    transactions,
    isLoadingHistory,
    historyError,
    refreshHistory: loadHistory
  };
}
