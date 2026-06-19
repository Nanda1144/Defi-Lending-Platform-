"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUnits } from "ethers";
import { useTransactionHistory } from "../../hooks/useTransactionHistory";
import { useWallet } from "../../hooks/useWallet";
import { TransactionType } from "../../types/history";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Wallet,
  Filter,
  Search,
  ChevronLeft,
} from "lucide-react";

const TYPE_LABELS: Record<TransactionType, { label: string; color: string; icon: React.ElementType }> = {
  [TransactionType.LOAN_CREATED]:   { label: "Loan Created",   color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",   icon: ArrowUpRight  },
  [TransactionType.LOAN_ACCEPTED]:  { label: "Loan Accepted",  color: "text-blue-400 bg-blue-500/10 border-blue-500/20",         icon: ArrowDownLeft },
  [TransactionType.LOAN_REPAID]:    { label: "Loan Repaid",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle   },
  [TransactionType.LOAN_CANCELLED]: { label: "Loan Cancelled", color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: XCircle       },
  [TransactionType.FEE_COLLECTED]:  { label: "Fee Collected",  color: "text-purple-400 bg-purple-500/10 border-purple-500/20",   icon: Activity      },
};

const ALL_FILTER = "ALL";
type FilterType = TransactionType | typeof ALL_FILTER;

export default function HistoryPage() {
  const { address } = useWallet();
  const { transactions, isLoadingHistory, historyError, refreshHistory } = useTransactionHistory();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>(ALL_FILTER);

  // ── Derived list ─────────────────────────────────────────────
  const filtered = transactions.filter((tx) => {
    const matchFilter = activeFilter === ALL_FILTER || tx.type === activeFilter;
    const matchSearch =
      !search ||
      tx.hash.toLowerCase().includes(search.toLowerCase()) ||
      tx.sender.toLowerCase().includes(search.toLowerCase()) ||
      tx.receiver.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const FILTER_OPTIONS: FilterType[] = [
    ALL_FILTER,
    TransactionType.LOAN_CREATED,
    TransactionType.LOAN_ACCEPTED,
    TransactionType.LOAN_REPAID,
    TransactionType.LOAN_CANCELLED,
  ];

  // ── Stats ─────────────────────────────────────────────────────
  const totalVolume = transactions.reduce((acc, tx) => acc + tx.amount, 0n);
  const loanCount   = transactions.filter(t => t.type === TransactionType.LOAN_CREATED).length;
  const repaidCount = transactions.filter(t => t.type === TransactionType.LOAN_REPAID).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">

      {/* ── Navbar ── */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Transaction History</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {address && (
              <span className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-sm font-medium text-slate-300 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-400" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            )}
            <button
              onClick={refreshHistory}
              disabled={isLoadingHistory}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Total Volume",    value: `${formatUnits(totalVolume, 6)} USDC`, icon: Activity,    color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { label: "Loans Created",   value: String(loanCount),                     icon: ArrowUpRight, color: "text-blue-400",   bg: "bg-blue-500/10"   },
            { label: "Loans Repaid",    value: String(repaidCount),                   icon: CheckCircle,  color: "text-emerald-400", bg: "bg-emerald-500/10"},
          ].map((stat, i) => (
            <div key={i} className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl group">
              <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-30 transition-opacity">
                <stat.icon className={`w-20 h-20 ${stat.color}`} />
              </div>
              <p className="text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters & Search ── */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by hash, sender, receiver…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          {/* Type filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {FILTER_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  activeFilter === f
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : "border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900"
                }`}
              >
                {f === ALL_FILTER ? "All" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Transaction Hash</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Sender</th>
                  <th className="px-6 py-4">Receiver</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-500">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Fetching on-chain events…
                      </div>
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-rose-400">
                        <XCircle className="w-8 h-8" />
                        <p className="font-medium">{historyError}</p>
                        <button onClick={refreshHistory} className="text-xs text-indigo-400 underline hover:text-indigo-300">Try again</button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => {
                    const meta = TYPE_LABELS[tx.type];
                    const Icon = meta.icon;
                    return (
                      <tr
                        key={`${tx.hash}-${tx.loanId}`}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Hash */}
                        <td className="px-6 py-4">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 font-mono text-indigo-400 hover:text-indigo-300 hover:underline text-xs"
                          >
                            {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </td>
                        {/* Type badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {meta.label}
                          </span>
                        </td>
                        {/* Amount */}
                        <td className="px-6 py-4 font-bold text-white font-mono">
                          {formatUnits(tx.amount, 6)}{" "}
                          <span className="text-slate-500 font-normal">USDC</span>
                        </td>
                        {/* Sender */}
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {tx.sender === "Contract"
                            ? <span className="text-purple-400">Contract</span>
                            : <>{tx.sender.slice(0, 6)}…{tx.sender.slice(-4)}</>
                          }
                        </td>
                        {/* Receiver */}
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {tx.receiver === "Contract"
                            ? <span className="text-purple-400">Contract</span>
                            : <>{tx.receiver.slice(0, 6)}…{tx.receiver.slice(-4)}</>
                          }
                        </td>
                        {/* Timestamp */}
                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(tx.timestamp * 1000).toLocaleString()}
                        </td>
                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            {tx.status}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!isLoadingHistory && filtered.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-800 text-slate-500 text-xs">
              Showing {filtered.length} of {transactions.length} transactions
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
