"use client";

import { useEffect, useState, useMemo } from "react";
import { useLendingPool } from "../../hooks/useLendingPool";
import { useWallet } from "../../hooks/useWallet";
import { formatUnits } from "ethers";
import Link from "next/link";
import { Search, Filter, ArrowRight, Activity, Clock, Percent, ShieldAlert, Loader2 } from "lucide-react";

export default function MarketplacePage() {
  const { openLoans, loadOpenLoans, isLoading, borrowLoan, cancelLoanOffer } = useLendingPool();
  const { address, error, isConnected } = useWallet();

  // Show message when no wallet is connected
  if (!isConnected && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-slate-300">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Wallet Not Connected</h2>
          <p className="mb-6">To browse and interact with loan offers you need an Ethereum wallet (e.g., MetaMask). Please connect your wallet using the button in the top‑right corner.</p>
          {error && (<p className="text-rose-400 italic">{error}</p>)}
        </div>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  // Load loans on mount / wallet connect
  useEffect(() => {
    if (!isConnected) return;
    loadOpenLoans();
  }, [loadOpenLoans, isConnected]);

  // Filter and Sort Logic
  const filteredLoans = useMemo(() => {
    let result = [...openLoans];

    // Filter by provider address search
    if (searchTerm) {
      result = result.filter((loan) => 
        loan.lender.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortOption === "amount_high") {
      result.sort((a, b) => Number(b.principalAmount) - Number(a.principalAmount));
    } else if (sortOption === "amount_low") {
      result.sort((a, b) => Number(a.principalAmount) - Number(b.principalAmount));
    } else if (sortOption === "rate_low") {
      result.sort((a, b) => Number(a.interestRate) - Number(b.interestRate));
    } else {
      // newest (by default, assuming larger loanId is newer)
      result.sort((a, b) => Number(b.loanId) - Number(a.loanId));
    }

    return result;
  }, [openLoans, searchTerm, sortOption]);

  const [borrowTxHashes, setBorrowTxHashes] = useState<Record<string, string>>({});
  const [borrowLoadingId, setBorrowLoadingId] = useState<string | null>(null);

  const handleBorrow = async (loanId: bigint) => {
    try {
      setBorrowLoadingId(loanId.toString());
      const receipt = await borrowLoan(loanId);
      setBorrowTxHashes((prev) => ({ ...prev, [loanId.toString()]: receipt.transactionHash }));
      await loadOpenLoans(); // refresh after borrowing
    } catch (err) {
      console.error(err);
    } finally {
      setBorrowLoadingId(null);
    }
  };

  const handleCancel = async (loanId: bigint) => {
    try {
      await cancelLoanOffer(loanId);
      await loadOpenLoans(); // refresh after cancelling
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* ── Header & Search ── */}
      <div className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Loan Marketplace</h1>
            <p className="text-slate-400">Browse and borrow from decentralized liquidity pools.</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search by Provider Wallet..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label="Sort loan offers"
                className="appearance-none bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="newest">Newest Offers</option>
                <option value="amount_high">Highest Amount</option>
                <option value="amount_low">Lowest Amount</option>
                <option value="rate_low">Lowest Interest Rate</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Syncing with blockchain...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Loans Found</h3>
            <p className="text-slate-400">There are currently no open loan offers matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLoans.map((loan) => (
              <div key={loan.loanId.toString()} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all group shadow-xl">
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">Provider ID: #{loan.loanId.toString()}</p>
                    <p className="text-sm font-medium text-slate-300">
                      {loan.lender.slice(0, 6)}...{loan.lender.slice(-4)}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <span className="font-bold text-blue-400 text-xs">USDC</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Available Amount</p>
                    <h3 className="text-3xl font-bold text-white font-mono">
                      {formatUnits(loan.principalAmount, 6)} USDC
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                        <Percent className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Interest Rate</span>
                      </div>
                      <p className="text-lg font-bold text-white">{Number(loan.interestRate) / 100}% APR</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Duration</span>
                      </div>
                      <p className="text-lg font-bold text-white">{Number(loan.duration) / (24 * 60 * 60)} Days</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      Penalty: {Number(loan.penaltyRate) / 100}%
                    </div>
                    <div className="text-slate-400">
                      Fee: <span className="text-slate-300 font-mono">{(Number(formatUnits(loan.principalAmount, 6)) * 0.00001).toFixed(4)} USDC</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 py-4 bg-slate-950/50 grid grid-cols-1 gap-3">
                  <Link
                    href={`/marketplace/${loan.loanId}`}
                    className="flex items-center justify-center py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm font-semibold text-white transition-colors"
                  >
                    View Details
                  </Link>
                  {address && address.toLowerCase() === loan.lender.toLowerCase() ? (
                    <button
                      onClick={() => handleCancel(loan.loanId)}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-rose-500/20 cursor-pointer"
                    >
                      Cancel Offer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBorrow(loan.loanId)}
                      disabled={!address || isLoading || borrowLoadingId === loan.loanId.toString()}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
                    >
                      {borrowLoadingId === loan.loanId.toString() ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Borrow Now<ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                  {/* Transaction hash display after successful borrow */}
                  {borrowTxHashes[loan.loanId.toString()] && (
                    <div className="mt-2 text-sm text-emerald-300 flex items-center gap-2">
                      <span>Tx:</span>
                      <code className="bg-emerald-700/30 px-2 py-1 rounded" title={borrowTxHashes[loan.loanId.toString()]}>{borrowTxHashes[loan.loanId.toString()].slice(0,10)}…{borrowTxHashes[loan.loanId.toString()].slice(-8)}</code>
                      <button onClick={() => navigator.clipboard.writeText(borrowTxHashes[loan.loanId.toString()])} className="text-emerald-200 hover:text-emerald-100 transition-colors">Copy</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
