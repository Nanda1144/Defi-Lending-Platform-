import React from "react";
import { useWallet } from "../hooks/useWallet";
import { Loader2 } from "lucide-react";

/**
 * Reusable Connect Wallet button.
 * Shows the connected address (truncated) when wallet is connected,
 * otherwise displays a button that triggers the MetaMask connection.
 * Handles loading state and error display.
 */
export default function ConnectButton() {
  const { address, connectWallet, isConnecting, error } = useWallet();

  const truncated = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div className="flex items-center space-x-3">
      {error && (
        <span className="text-rose-400 text-sm">{error}</span>
      )}
      <button
        onClick={() => {
          if (!address) {
            void connectWallet();
          }
        }}
        disabled={isConnecting}
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white flex items-center gap-2 transition"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          truncated || "Connect Wallet"
        )}
      </button>
    </div>
  );
}
