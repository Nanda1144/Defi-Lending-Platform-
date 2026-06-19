"use client";

import { useWallet } from "../hooks/useWallet";
import { ArrowRight, ShieldCheck, Zap, Activity, Globe, Wallet, HandCoins, Building2, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { connectWallet, address, isConnecting } = useWallet();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">DeFi Lend</span>
          </div>
          
          <div className="flex items-center gap-4">
            {address ? (
              <span className="px-4 py-2 rounded-full border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)] disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
            DeFi Lending Platform
          </h1>
          <p className="text-xl lg:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto font-light">
            Secure Decentralized Lending Without Banks
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {address ? (
              <Link 
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Activity className="w-5 h-5" />
                Go to Dashboard
              </Link>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Wallet className="w-5 h-5" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
            <Link 
              href="/marketplace"
              className="w-full sm:w-auto px-8 py-4 rounded-full border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300 font-semibold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              View Marketplace
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Statistics Section ── */}
      <section className="border-y border-slate-800/50 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-slate-800/50">
            {[
              { label: "Total Value Locked", value: "$4.2M" },
              { label: "Active Loans", value: "1,204" },
              { label: "Total Borrowers", value: "3,892" },
              { label: "Total Lenders", value: "2,145" }
            ].map((stat, i) => (
              <div key={i} className="text-center px-4">
                <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Get started in minutes and experience the future of finance.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Wallet, title: "Step 1: Connect Wallet", desc: "Link your MetaMask securely." },
              { icon: HandCoins, title: "Step 2: Deposit Funds", desc: "Supply USDC or ETH to the pool." },
              { icon: Building2, title: "Step 3: Borrow", desc: "Borrow instantly against collateral." },
              { icon: Activity, title: "Step 4: Repay Loan", desc: "Settle your balance anytime." },
            ].map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-slate-800/20 border border-slate-800 hover:border-indigo-500/50 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supported Tokens & Benefits ── */}
      <section className="py-24 bg-slate-900/30 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Platform Benefits */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Why Choose DeFi Lend?</h2>
            <div className="space-y-6">
              {[
                { icon: Globe, title: "No Banks", desc: "Direct peer-to-peer lending with zero intermediaries." },
                { icon: ShieldCheck, title: "Smart Contract Security", desc: "Fully audited open-source smart contracts." },
                { icon: LinkIcon, title: "Transparent Transactions", desc: "All data is verifiable on the blockchain." },
                { icon: Zap, title: "Instant Settlement", desc: "Loans are funded and settled instantly." }
              ].map((benefit, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <benefit.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supported Tokens */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl" />
            <div className="relative p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Supported Assets</h3>
              <div className="grid gap-4">
                {[
                  { symbol: "USDC", name: "USD Coin", color: "text-blue-400", bg: "bg-blue-500/10" },
                  { symbol: "DAI", name: "Dai Stablecoin", color: "text-yellow-400", bg: "bg-yellow-500/10" },
                  { symbol: "ETH", name: "Ethereum", color: "text-purple-400", bg: "bg-purple-500/10" }
                ].map((token) => (
                  <div key={token.symbol} className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${token.bg}`}>
                        <span className={`font-bold ${token.color}`}>{token.symbol[0]}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white">{token.symbol}</p>
                        <p className="text-sm text-slate-400">{token.name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-400 bg-green-400/10 px-3 py-1 rounded-full">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/50 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500">© 2026 DeFi Lending Platform. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
