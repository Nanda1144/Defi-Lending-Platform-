"use client";

import { useState, useMemo } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useLendingPool } from "../../hooks/useLendingPool";
import { ArrowLeft, Coins, Percent, CalendarClock, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { parseUnits } from "ethers";

export default function DepositPage() {
  const { address } = useWallet();
  const { createLoanOffer, isLoading } = useLendingPool();

  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState(""); // user inputs 5 for 5%
  const [durationDays, setDurationDays] = useState("30");
  const [penaltyType, setPenaltyType] = useState("Simple Penalty (2%)");

  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculated fields
  const estimatedEarnings = useMemo(() => {
    if (!amount || !interestRate || isNaN(Number(amount)) || isNaN(Number(interestRate))) return "0.00";
    const principal = Number(amount);
    const rate = Number(interestRate) / 100;
    const time = Number(durationDays) / 365;
    return (principal * rate * time).toFixed(2);
  }, [amount, interestRate, durationDays]);

  const platformFee = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return "0.00";
    // Fee is 0.001%
    return (Number(amount) * 0.00001).toFixed(4);
  }, [amount]);

  const [txHash, setTxHash] = useState<string | null>(null);

  const MAX_INTEREST_BPS = 2000n; // 20% max
  const MAX_PENALTY_BPS = 500n; // 5% max

  const handleDeposit = async () => {
    // Basic client‑side validation
    if (!amount) {
      setError('Loan amount is required');
      return;
    }
    if (!interestRate) {
      setError('Interest rate is required');
      return;
    }
    const interestBps = BigInt(Math.floor(Number(interestRate) * 100));
    if (interestBps > MAX_INTEREST_BPS) {
      setError(`Interest rate cannot exceed ${Number(MAX_INTEREST_BPS) / 100}%`);
      return;
    }
    const penaltyBps = 200n; // Currently fixed at 2%
    if (penaltyBps > MAX_PENALTY_BPS) {
      setError('Penalty rate exceeds contract limit');
      return;
    }

    setError(null);
    setIsSuccess(false);
    setTxHash(null);
    try {
      const principalBigInt = parseUnits(amount, 6); // Assuming USDC (6 decimals)
      const durationSeconds = BigInt(Number(durationDays) * 24 * 60 * 60);

      const receipt = await createLoanOffer(principalBigInt, interestBps, durationSeconds, penaltyBps);
      // receipt.transactionHash is available from ethers v6 wait result
      setTxHash(receipt.transactionHash);
      setIsSuccess(true);
      setAmount('');
      setInterestRate('');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Transaction failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/dashboard" className="p-2 mr-4 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Create Deposit Offer</h1>
            <p className="text-slate-400 mt-1">Provide liquidity to the marketplace and earn interest.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="font-medium">Loan offer created successfully! Your funds are now in the pool.</p>
              </div>
              {txHash && (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <span>Tx Hash:</span>
                  <code className="bg-emerald-700/30 px-2 py-1 rounded" title={txHash}>{txHash.slice(0, 10)}…{txHash.slice(-8)}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(txHash)}
                    className="ml-2 text-emerald-200 hover:text-emerald-100 transition-colors"
                  >Copy</button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            
            {/* Token & Amount */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="tokenSelect" className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  Select Asset
                </label>
                <select 
                  id="tokenSelect"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="DAI">DAI (Dai Stablecoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center justify-between">
                  Amount
                  <span className="text-xs text-slate-500">Balance: 10,000.00</span>
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-16 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-slate-500 font-bold">{token}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interest & Duration */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-400" />
                  Interest Rate (APR)
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="5.0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="durationSelect" className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                  Loan Duration
                </label>
                <select 
                  id="durationSelect"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>

            {/* Penalty Type */}
            <div className="space-y-2">
              <label htmlFor="penaltySelect" className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Penalty Type
              </label>
              <select 
                id="penaltySelect"
                value={penaltyType}
                onChange={(e) => setPenaltyType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-not-allowed opacity-80"
                disabled
              >
                <option>Simple Penalty (2% Fixed)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Borrowers will pay an additional 2% if the loan duration is exceeded.</p>
            </div>

            <hr className="border-slate-800/80 my-8" />

            {/* Summary Box */}
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800/80">
              <h3 className="text-white font-semibold mb-4">Transaction Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Principal Amount</span>
                  <span className="text-white font-mono">{amount || "0.00"} {token}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Earnings</span>
                  <span className="text-emerald-400 font-mono">+{estimatedEarnings} {token}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Platform Fee (0.001%)</span>
                  <span className="text-rose-400 font-mono">-{platformFee} {token}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 flex justify-between font-medium">
                  <span className="text-slate-300">Total Required to Deposit</span>
                  <span className="text-white font-mono text-base">
                    {amount ? (Number(amount) + Number(platformFee)).toFixed(4) : "0.00"} {token}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleDeposit}
              disabled={isLoading || !address || !amount || !interestRate}
              className="w-full py-4 mt-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:shadow-none flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : !address ? (
                "Connect Wallet to Deposit"
              ) : (
                "Approve & Create Lending Pool"
              )}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
