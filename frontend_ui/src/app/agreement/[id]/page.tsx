"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "ethers";
import Link from "next/link";
import {
  ArrowLeft, FileText, ShieldCheck, PenTool,
  XCircle, Loader2, AlertTriangle, ExternalLink,
} from "lucide-react";
import { useLendingPool } from "../../../hooks/useLendingPool";
import { useWallet } from "../../../hooks/useWallet";
import { Loan } from "../../../types/blockchain";

export default function LoanAgreementPage() {
  const params   = useParams();
  const router   = useRouter();
  const loanId   = params?.id as string;

  const { getLoanDetails, borrowLoan, calculateRepayment, isLoading } = useLendingPool();
  const { address } = useWallet();

  const [loan,         setLoan]         = useState<Loan | null>(null);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [agreed,       setAgreed]       = useState(false);
  const [txReceipt,    setTxReceipt]    = useState<any | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);

  useEffect(() => {
    if (!loanId) return;
    if (isNaN(Number(loanId))) {
      setFetchError("Invalid Loan ID format.");
      return;
    }
    getLoanDetails(BigInt(loanId))
      .then(setLoan)
      .catch(() => setFetchError("Failed to load loan details from the blockchain."));
  }, [loanId, getLoanDetails]);

  // ── Derived values ─────────────────────────────────────────────
  const principalUSDC = loan ? Number(formatUnits(loan.principalAmount, 6)) : 0;
  const ratePercent   = loan ? Number(loan.interestRate) / 100 : 0;
  const durationDays  = loan ? Number(loan.duration) / 86400 : 0;
  const penaltyPct    = loan ? Number(loan.penaltyRate) / 100 : 0;

  // Repayment breakdown from contract
  const [repayment, setRepayment] = useState<{ principal: number; interest: number; penalty: number; totalRepayment: number } | null>(null);

  useEffect(() => {
    if (!loan) return;
    const fetchRepayment = async () => {
      try {
        const { principal, interest, penalty, totalRepayment } = await calculateRepayment(BigInt(loan.loanId));
        setRepayment({
          principal: Number(formatUnits(principal, 6)),
          interest: Number(formatUnits(interest, 6)),
          penalty: Number(formatUnits(penalty, 6)),
          totalRepayment: Number(formatUnits(totalRepayment, 6)),
        });
      } catch (e) {
        console.error('Failed to fetch repayment', e);
      }
    };
    fetchRepayment();
  }, [loan, calculateRepayment]);

  const estInterest = useMemo(() => {
    if (!repayment) return 0;
    return repayment.interest;
  }, [repayment]);

  const platformFee = useMemo(() => principalUSDC * 0.00001, [principalUSDC]);

  const handleSign = async () => {
    if (!loan || !agreed) return;
    setSigningError(null);
    try {
      const receipt = await borrowLoan(loan.loanId);
      setTxReceipt(receipt);
    } catch (err: any) {
      setSigningError(err?.reason || err?.message || "Transaction was rejected or reverted.");
    }
  };

  // ── Loading / error states ──────────────────────────────────────
  if (fetchError) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-4">
      <AlertTriangle className="w-14 h-14 text-rose-500" />
      <h1 className="text-2xl font-bold text-white">Could Not Load Agreement</h1>
      <p className="text-slate-400 max-w-sm">{fetchError}</p>
      <Link href="/marketplace" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
        Back to Marketplace
      </Link>
    </div>
  );

  if (!loan) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400">Loading loan agreement…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-24">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href={`/marketplace/${loanId}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Back to Loan Details</span>
          </Link>
          <span className="text-slate-500 text-sm font-mono">LOAN ID #{loanId}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 mt-10">
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl overflow-hidden space-y-8">

          {/* Glow accent */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

          {/* ── Title ── */}
          <div className="flex items-start gap-4 border-b border-slate-800 pb-8">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
              <FileText className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Peer-to-Peer Loan Agreement</h1>
              <p className="mt-2 text-slate-400">Review all terms carefully before signing with MetaMask. This action is irreversible on-chain.</p>
            </div>
          </div>

          {/* ── Parties ── */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Parties</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1.5">Loan ID</p>
                <p className="font-mono font-bold text-white text-lg">#{loan.loanId.toString()}</p>
              </div>
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1.5">Lender Wallet (Creditor)</p>
                <p className="font-mono text-xs text-slate-300 truncate">{loan.lender}</p>
              </div>
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 md:col-span-2">
                <p className="text-xs text-slate-500 mb-1.5">Borrower Wallet (You — Debtor)</p>
                <p className="font-mono text-xs text-slate-300 truncate">{address || "Wallet not connected"}</p>
              </div>
            </div>
          </div>

          {/* ── Agreement Summary Card ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Agreement Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Borrower</p>
                <p className="font-mono text-xs text-slate-300 truncate">{address || "Wallet not connected"}</p>
              </div>
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Lender</p>
                <p className="font-mono text-xs text-slate-300 truncate">{loan.lender}</p>
              </div>
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Due Date</p>
                <p className="font-mono text-xs text-slate-200">{loan && loan.startTime && loan.duration ? new Date(Number((loan.startTime + loan.duration) * 1000n)).toLocaleString() : "-"}</p>
              </div>
            </div>
          </div>

          {/* ── Financial Terms (Repayment Breakdown) ── */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Repayment Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {repayment ? (
                [
                  { label: "Principal",     value: `${repayment.principal.toLocaleString()} USDC`, color: "text-white" },
                  { label: "Interest",      value: `${repayment.interest.toLocaleString()} USDC`, color: "text-emerald-400" },
                  { label: "Penalty",       value: `${repayment.penalty.toLocaleString()} USDC`, color: "text-rose-400" },
                  { label: "Total Repayment", value: `${repayment.totalRepayment.toLocaleString()} USDC`, color: "text-indigo-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                    <p className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-4 text-center text-slate-400">Loading repayment data…</div>
              )}
            </div>
          </div>

          {/* ── Terms & Conditions ── */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Terms and Conditions</h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 max-h-56 overflow-y-auto text-sm text-slate-400 space-y-3 leading-relaxed">
              <p><strong className="text-slate-200">1. Execution & Funding:</strong> Signing this agreement calls the <code className="text-indigo-400 bg-slate-800 px-1 rounded">borrowLoan()</code> smart contract function. The principal of {principalUSDC.toLocaleString()} USDC will be transferred immediately to your wallet from escrow.</p>
              <p><strong className="text-slate-200">2. Interest Accrual:</strong> Interest accrues at {ratePercent}% APR from the moment of signing, calculated using Ethereum block timestamps.</p>
              <p><strong className="text-slate-200">3. Repayment Obligation:</strong> You must repay the full outstanding amount (principal + accrued interest) within {durationDays} days of signing. Repayment is executed via the <code className="text-indigo-400 bg-slate-800 px-1 rounded">repayLoan()</code> function.</p>
              <p><strong className="text-slate-200">4. Late Penalty:</strong> Any repayment after the {durationDays}-day duration will accrue an additional penalty of {penaltyPct}% per annum for every second overdue, automatically calculated on-chain.</p>
              <p><strong className="text-slate-200">5. Non-Custodial Escrow:</strong> The LendingPool contract is non-custodial. Platform operators do not hold or control any funds. All logic is autonomous on the Sepolia network.</p>
              <p><strong className="text-slate-200">6. Immutability:</strong> Once signed, this agreement cannot be amended. The terms above reflect the immutable on-chain state of Loan #{loanId}.</p>
            </div>
          </div>

          {/* ── Downloadable Agreement Section ── */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                const data = {
                  loanId: loanId,
                  borrower: address,
                  lender: loan?.lender,
                  principal: repayment?.principal,
                  interest: repayment?.interest,
                  penalty: repayment?.penalty,
                  totalRepayment: repayment?.totalRepayment,
                  dueDate: loan && loan.startTime && loan.duration ? new Date(Number((loan.startTime + loan.duration) * 1000n)).toISOString() : null,
                  terms: "See Terms and Conditions on the page."
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `agreement_${loanId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
            >
              Download Agreement JSON
            </button>
          </div>

          {/* ── Terms & Conditions ── */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Terms and Conditions</h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 max-h-56 overflow-y-auto text-sm text-slate-400 space-y-3 leading-relaxed">
              <p><strong className="text-slate-200">1. Execution & Funding:</strong> Signing this agreement calls the <code className="text-indigo-400 bg-slate-800 px-1 rounded">borrowLoan()</code> smart contract function. The principal of {principalUSDC.toLocaleString()} USDC will be transferred immediately to your wallet from escrow.</p>
              <p><strong className="text-slate-200">2. Interest Accrual:</strong> Interest accrues at {ratePercent}% APR from the moment of signing, calculated using Ethereum block timestamps.</p>
              <p><strong className="text-slate-200">3. Repayment Obligation:</strong> You must repay the full outstanding amount (principal + accrued interest) within {durationDays} days of signing. Repayment is executed via the <code className="text-indigo-400 bg-slate-800 px-1 rounded">repayLoan()</code> function.</p>
              <p><strong className="text-slate-200">4. Late Penalty:</strong> Any repayment after the {durationDays}-day duration will accrue an additional penalty of {penaltyPct}% per annum for every second overdue, automatically calculated on-chain.</p>
              <p><strong className="text-slate-200">5. Non-Custodial Escrow:</strong> The LendingPool contract is non-custodial. Platform operators do not hold or control any funds. All logic is autonomous on the Sepolia network.</p>
              <p><strong className="text-slate-200">6. Immutability:</strong> Once signed, this agreement cannot be amended. The terms above reflect the immutable on-chain state of Loan #{loanId}.</p>
            </div>
          </div>

          {/* ── Agreement Checkbox ── */}
          {!txReceipt && (
            <label className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-500"
              />
              <span className="text-slate-300 text-sm leading-relaxed">
                I confirm that I have read and fully understood the Terms and Conditions above, and I agree to be legally bound by the smart contract on-chain.
              </span>
            </label>
          )}

          {/* ── Error Banner ── */}
          {signingError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{signingError}</p>
            </div>
          )}

          {/* ── On-chain Receipt (shown after signing) ── */}
          {txReceipt && (
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-5">
              <div className="flex items-center gap-3 text-emerald-400 font-bold text-lg">
                <ShieldCheck className="w-6 h-6" />
                Agreement Signed & Confirmed On-Chain!
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                  <p className="text-slate-500 mb-1.5">Transaction Hash</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txReceipt.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-indigo-400 hover:underline break-all"
                  >
                    {txReceipt.hash}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                  <p className="text-slate-500 mb-1.5">Block Number</p>
                  <p className="text-white font-bold">{txReceipt.blockNumber?.toString()}</p>
                </div>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                  <p className="text-slate-500 mb-1.5">Gas Used</p>
                  <p className="text-white font-bold">{txReceipt.gasUsed?.toString()} units</p>
                </div>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                  <p className="text-slate-500 mb-1.5">Contract</p>
                  <p className="text-white truncate">{txReceipt.to}</p>
                </div>
              </div>
              <Link
                href="/borrower"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors text-sm"
              >
                Go to Borrower Dashboard →
              </Link>
            </div>
          )}

          {/* ── Action Buttons ── */}
          {!txReceipt && (
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={handleSign}
                disabled={isLoading || !agreed || !address}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold transition-all shadow-[0_0_24px_rgba(99,102,241,0.25)] disabled:shadow-none cursor-pointer"
              >
                {isLoading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Awaiting MetaMask…</>
                  : <><PenTool className="w-5 h-5" /> Sign with MetaMask</>
                }
              </button>
              <button
                onClick={() => router.push("/marketplace")}
                disabled={isLoading}
                className="px-8 py-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
                Reject Agreement
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
