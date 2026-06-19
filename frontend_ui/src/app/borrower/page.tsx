"use client";

import { useEffect, useState, useMemo } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useLendingPool } from "../../hooks/useLendingPool";
import { Loan, LoanStatus } from "../../types/blockchain";
import { formatUnits } from "ethers";
import Link from "next/link";
import {
  Wallet, DollarSign, Activity, AlertTriangle, Clock,
  CheckCircle, ArrowRight, RefreshCw, XCircle, ChevronLeft
} from "lucide-react";

type EnrichedLoan = Loan & {
  estInterest: bigint;
  estPenalty: bigint;
  totalRepayment: bigint;
};

export default function BorrowerDashboard() {
  const { address } = useWallet();
  const { loadBorrowerLoans, calculateRepayment, repayLoan, isLoading } = useLendingPool();

  const [loans, setLoans] = useState<EnrichedLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [repayingId, setRepayingId] = useState<bigint | null>(null);
  const [repayTxHashes, setRepayTxHashes] = useState<Record<string, string>>({});

  const fetchLoans = async () => {
    if (!address) return;
    try {
      setLoadingLoans(true);
      setError(null);
      const userLoans = await loadBorrowerLoans(address);

      // Enrich with current repayment stats
      const enriched: EnrichedLoan[] = await Promise.all(
        userLoans.map(async (loan) => {
          if (loan.status === LoanStatus.ACTIVE) {
            const { interest, penalty, totalRepayment } = await calculateRepayment(loan.loanId);
            return { ...loan, estInterest: interest, estPenalty: penalty, totalRepayment };
          }
          return { ...loan, estInterest: 0n, estPenalty: 0n, totalRepayment: 0n };
        })
      );

      // Sort by newest first
      enriched.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setLoans(enriched);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch your loans. Please ensure you are connected to Sepolia.");
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [address]);

  const handleRepay = async (loanId: bigint) => {
    try {
      setRepayingId(loanId);
      await repayLoan(loanId);
      await fetchLoans(); // refresh after repayment
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Repayment failed");
    } finally {
      setRepayingId(null);
    }
  };

  // ── Derived Stats ─────────────────────────────────────────────────────────
  const activeLoans = loans.filter((l) => l.status === LoanStatus.ACTIVE);
  const currentLoanAmount = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0n);
  const totalInterestDue = activeLoans.reduce((sum, l) => sum + l.estInterest, 0n);
  const totalPenaltyDue = activeLoans.reduce((sum, l) => sum + l.estPenalty, 0n);

  // Find the closest due date
  const nextPaymentLoan = activeLoans
    .filter(l => Number(l.startTime) > 0)
    .sort((a, b) => {
      const dueA = Number(a.startTime) + Number(a.duration);
      const dueB = Number(b.startTime) + Number(b.duration);
      return dueA - dueB;
    })[0];

  const nextPaymentDate = nextPaymentLoan
    ? new Date((Number(nextPaymentLoan.startTime) + Number(nextPaymentLoan.duration)) * 1000).toLocaleDateString()
    : "No Active Loans";

  const isOverdue = (loan: Loan) => {
    if (loan.status !== LoanStatus.ACTIVE) return false;
    const dueTime = Number(loan.startTime) + Number(loan.duration);
    const now = Math.floor(Date.now() / 1000);
    return now > dueTime;
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Wallet className="w-16 h-16 text-indigo-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h1>
        <p className="text-slate-400">Please connect your MetaMask wallet to view your borrower dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-20">
      
      {/* ── Navbar ── */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Main Dashboard</span>
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Borrower Portal</span>
            </div>
          </div>
          <button
            onClick={fetchLoans}
            disabled={loadingLoans}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLoans ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-30 transition-opacity">
              <DollarSign className="w-20 h-20 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Current Loan Amount</p>
            <p className="text-3xl font-bold text-white">{formatUnits(currentLoanAmount, 6)} <span className="text-lg text-slate-500 font-normal">USDC</span></p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-30 transition-opacity">
              <Activity className="w-20 h-20 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Interest Due</p>
            <p className="text-3xl font-bold text-amber-400">{formatUnits(totalInterestDue, 6)} <span className="text-lg text-amber-600 font-normal">USDC</span></p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-30 transition-opacity">
              <AlertTriangle className="w-20 h-20 text-rose-400" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Penalty Due</p>
            <p className="text-3xl font-bold text-rose-400">{formatUnits(totalPenaltyDue, 6)} <span className="text-lg text-rose-600 font-normal">USDC</span></p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-30 transition-opacity">
              <Clock className="w-20 h-20 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Next Payment Date</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{nextPaymentDate}</p>
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-rose-400 text-sm">
            <XCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Your Loans</h2>
            <Link href="/marketplace" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Browse Marketplace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Loan ID</th>
                  <th className="px-6 py-4">Principal</th>
                  <th className="px-6 py-4">Interest (+Penalty)</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingLoans ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Fetching your loans…
                      </div>
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                      You don't have any loans yet.
                      <div className="mt-4">
                        <Link href="/marketplace" className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors">
                          Borrow Now
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => {
                    const overdue = isOverdue(loan);
                    const statusColors = {
                      [LoanStatus.OPEN]: "text-blue-400 bg-blue-500/10",
                      [LoanStatus.ACTIVE]: overdue ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
                      [LoanStatus.REPAID]: "text-slate-400 bg-slate-500/10",
                      [LoanStatus.CANCELLED]: "text-slate-400 bg-slate-500/10",
                      [LoanStatus.DEFAULTED]: "text-rose-400 bg-rose-500/10",
                    };
                    const statusText = loan.status === LoanStatus.ACTIVE && overdue ? "OVERDUE" : LoanStatus[loan.status];

                    const isRepaying = repayingId === loan.loanId;
                    const dueDateStr = loan.status === LoanStatus.ACTIVE 
                      ? new Date((Number(loan.startTime) + Number(loan.duration)) * 1000).toLocaleString()
                      : "—";

                    return (
                      <tr key={loan.loanId.toString()} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 font-mono font-bold text-white">#{loan.loanId.toString()}</td>
                        <td className="px-6 py-4 font-mono text-indigo-400">{formatUnits(loan.principalAmount, 6)} USDC</td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-amber-400">
                            {formatUnits(loan.estInterest, 6)}
                            {loan.estPenalty > 0n && (
                              <span className="text-rose-400 ml-1">(+{formatUnits(loan.estPenalty, 6)})</span>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${overdue ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                          {dueDateStr}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${statusColors[loan.status]}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/agreement/${loan.loanId}`}
                              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                              View Agreement
                            </Link>

                            {loan.status === LoanStatus.ACTIVE && (
                              <button
                                onClick={() => handleRepay(loan.loanId)}
                                disabled={isLoading || isRepaying}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                {isRepaying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Repay Loan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
