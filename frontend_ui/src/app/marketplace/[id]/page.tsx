"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLendingPool } from "../../../hooks/useLendingPool";
import { useWallet } from "../../../hooks/useWallet";
import { formatUnits } from "ethers";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Activity, Info, AlertTriangle, Loader2 } from "lucide-react";
import { Loan } from "../../../types/blockchain";

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const loanIdStr = params?.id as string;
  
  const { getLoanDetails, borrowLoan, isLoading } = useLendingPool();
  const { address } = useWallet();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLoan() {
      if (!loanIdStr) return;
      if (isNaN(Number(loanIdStr))) {
        setFetchError("Invalid Loan ID format.");
        return;
      }
      try {
        const id = BigInt(loanIdStr);
        const data = await getLoanDetails(id);
        setLoan(data);
      } catch (err) {
        console.error("Error fetching loan:", err);
        setFetchError("Failed to fetch loan details. Ensure the loan ID is correct and network is connected.");
      }
    }
    fetchLoan();
  }, [loanIdStr, getLoanDetails]);

  // Derived calculations
  const principalStr = loan ? formatUnits(loan.principalAmount, 6) : "0";
  const ratePercentage = loan ? Number(loan.interestRate) / 100 : 0;
  const durationDays = loan ? Number(loan.duration) / (24 * 60 * 60) : 0;
  
  const estimatedInterest = useMemo(() => {
    if (!loan) return "0.00";
    const principal = Number(principalStr);
    const time = durationDays / 365;
    return (principal * (ratePercentage / 100) * time).toFixed(2);
  }, [loan, principalStr, ratePercentage, durationDays]);

  const handleAcceptTerms = async () => {
    if (!loan) return;
    try {
      await borrowLoan(loan.loanId);
      router.push("/dashboard"); // Redirect after borrowing
    } catch (err) {
      console.error(err);
    }
  };

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Loan Not Found</h1>
        <p className="text-slate-400 mb-6">{fetchError}</p>
        <Link href="/marketplace" className="px-6 py-3 bg-indigo-500 rounded-lg text-white font-medium hover:bg-indigo-600">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Loading loan specifics...</p>
      </div>
    );
  }

  const isLender = address?.toLowerCase() === loan.lender.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-20">
      {/* ── Top Nav ── */}
      <div className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center">
          <Link href="/marketplace" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Marketplace</span>
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 mt-10 grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Header Card */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 text-xs font-bold tracking-widest text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/20 uppercase">
                  Open Loan Offer
                </span>
                <span className="text-slate-400 text-sm">#{loan.loanId.toString()}</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white font-mono mb-2">
                {principalStr} USDC
              </h1>
              <p className="text-lg text-slate-300 flex items-center gap-2">
                Available to borrow instantly via Smart Contract
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </p>
            </div>
          </div>

          {/* Provider Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Provider Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Provider ID</p>
                <p className="text-white font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                  Lender-{loan.loanId.toString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Wallet Address</p>
                <p className="text-white font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 truncate" title={loan.lender}>
                  {loan.lender}
                </p>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-400" />
              Loan Specifications
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                <p className="text-sm text-slate-400 mb-1">Principal Amount</p>
                <p className="text-2xl font-bold text-white font-mono">{principalStr} USDC</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                <p className="text-sm text-slate-400 mb-1">Interest Rate (APR)</p>
                <p className="text-2xl font-bold text-emerald-400">{ratePercentage}%</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                <p className="text-sm text-slate-400 mb-1">Duration</p>
                <p className="text-2xl font-bold text-amber-400">{durationDays} Days</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                <p className="text-sm text-slate-400 mb-1">Late Penalty</p>
                <p className="text-2xl font-bold text-rose-400">{Number(loan.penaltyRate) / 100}%</p>
              </div>
            </div>
          </div>
          
          {/* Collateral Requirements (UI Simulation) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Collateral Requirements
            </h2>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/80 mb-6">
              <p className="text-sm">Note: This is an uncollateralized pool MVP. In Version 2, strict over-collateralization will be required to borrow these funds.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 opacity-60 pointer-events-none">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Required Collateral</p>
                <p className="text-white font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                  0.00 ETH
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Current Ratio Required</p>
                <p className="text-white font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                  150% (Future)
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Calculator & Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-28">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">
              Estimated Repayment
            </h3>
            
            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Principal</span>
                <span className="text-white font-mono">{principalStr} USDC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estimated Interest</span>
                <span className="text-emerald-400 font-mono">+{estimatedInterest} USDC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Platform Fee (0.001%)</span>
                <span className="text-rose-400 font-mono">
                  +{(Number(principalStr) * 0.00001).toFixed(4)} USDC
                </span>
              </div>
              
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-300 font-bold">Total Due</span>
                <span className="text-xl text-white font-mono font-bold">
                  {(Number(principalStr) + Number(estimatedInterest) + (Number(principalStr) * 0.00001)).toFixed(2)} USDC
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleAcceptTerms}
                disabled={isLoading || !address || isLender}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:shadow-none"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing</>
                ) : !address ? (
                  "Connect Wallet to Borrow"
                ) : isLender ? (
                  "You are the Lender"
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Accept Terms & Borrow</>
                )}
              </button>
              
              <p className="text-center text-xs text-slate-500">
                By accepting, you agree to the smart contract logic and penalty conditions.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
