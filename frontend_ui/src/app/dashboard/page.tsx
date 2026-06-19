"use client";

import { useWallet } from "../../hooks/useWallet";
import { useLendingPool } from "../../hooks/useLendingPool";
import { useEffect, useState } from "react";
import { useTransactionHistory } from "../../hooks/useTransactionHistory";
import { 
  LogOut, Wallet, ArrowDownRight, ArrowUpRight, 
  Activity, DollarSign, Clock, CheckCircle, PlusCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { formatUnits } from "ethers";

export default function DashboardPage() {
  const { address, chainId } = useWallet();
  const { openLoans, totalLoansCount, isLoading, loadOpenLoans, loadBorrowerLoans, loadLenderLoans } = useLendingPool();
  const [lenderCount, setLenderCount] = useState<number>(0);
  const [borrowerCount, setBorrowerCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load lender loan IDs via consolidated useLendingPool
  const fetchLenderStats = async () => {
    if (!address) return;
    try {
      const loans = await loadLenderLoans(address);
      setLenderCount(loans.length);
    } catch (e) {
      console.error('Failed to fetch lender loans', e);
    }
  };

  const fetchBorrowerStats = async () => {
    if (!address) return;
    try {
      const loans = await loadBorrowerLoans(address);
      setBorrowerCount(loans.length);
    } catch (e) {
      console.error('Failed to fetch borrower loans', e);
    }
  };

  const refreshAll = async () => {
    setStatsLoading(true);
    await Promise.all([loadOpenLoans(), fetchLenderStats(), fetchBorrowerStats()]);
    setStatsLoading(false);
  };

  useEffect(() => {
    if (!address) return;
    refreshAll();
  }, [address]);

  const { transactions, isLoadingHistory } = useTransactionHistory();

  // For disconnect, we typically just reload or clear local state, since MetaMask doesn't support programmatic disconnect.
  const handleDisconnect = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      {/* ── Top Bar ── */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">DeFi Lend Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-300">Sepolia Testnet</span>
            </div>
            
            {address ? (
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button 
                  onClick={handleDisconnect}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors group"
                  title="Disconnect"
                >
                  <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">Not Connected</span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { title: "Total Deposited", value: "$12,450.00", icon: ArrowUpRight, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { title: "Total Borrowed", value: "$4,200.00", icon: ArrowDownRight, color: "text-rose-400", bg: "bg-rose-500/10" },
            { title: "Interest Earned", value: "$342.50", icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { title: "Active Loans", value: "3", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" }
          ].map((stat, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                <stat.icon className={`w-16 h-16 ${stat.color}`} />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-slate-400 mb-2">{stat.title}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Link href="/deposit" className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 hover:border-indigo-500 transition-all group cursor-pointer">
            <PlusCircle className="w-8 h-8 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-white">Deposit / Lend</span>
          </Link>
          <Link href="/marketplace" className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-800/40 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all group cursor-pointer">
            <ArrowDownRight className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-white">Borrow</span>
          </Link>
          <Link href="/borrower" className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-800/40 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group cursor-pointer">
            <RefreshCw className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-white">Repay</span>
          </Link>
          <Link href="/marketplace" className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-800/40 border border-slate-700 hover:border-rose-500/50 hover:bg-slate-800 transition-all group cursor-pointer" title="Cancel open offers to withdraw funds">
            <ArrowUpRight className="w-8 h-8 text-rose-400 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-white">Withdraw</span>
          </Link>
        </div>

        {/* ── Recent Transactions Table ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
          <Link href="/history" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer">
            View All History →
          </Link>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Transaction Hash</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Loading transactions...
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No recent transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 5).map((tx) => (
                    <tr key={`${tx.hash}-${tx.loanId}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-indigo-400">
                        <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-xs font-semibold text-slate-300 tracking-wider">
                          {tx.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {formatUnits(tx.amount, 6)} USDC
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>{tx.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
