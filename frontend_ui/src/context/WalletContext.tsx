"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";

type WalletContextType = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
};

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7"; // 11155111

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address && !!signer;

  const switchToSepolia = async (eth: any) => {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }] });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia Test Network",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }]
        });
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }] });
      } else {
        throw switchError;
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    const browserProvider = new ethers.BrowserProvider(eth);
    setProvider(browserProvider);

    const storedAddress = localStorage.getItem("walletAddress");
    const storedChain = localStorage.getItem("walletChainId");

    if (storedAddress) {
      setAddress(storedAddress);
      if (storedChain) setChainId(storedChain);
      browserProvider.getSigner().then(setSigner).catch(() => {});
    }

    const handleAccounts = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        const addr = ethers.getAddress(accounts[0]);
        setAddress(addr);
        localStorage.setItem("walletAddress", addr);
        browserProvider.getSigner().then(setSigner).catch(() => {});
      }
    };

    const handleChain = (newChainId: string) => {
      setChainId(newChainId);
      localStorage.setItem("walletChainId", newChainId);
    };

    eth.on("accountsChanged", handleAccounts);
    eth.on("chainChanged", handleChain);

    return () => {
      eth.removeListener("accountsChanged", handleAccounts);
      eth.removeListener("chainChanged", handleChain);
    };
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("MetaMask not installed");

      let currentProvider = provider;
      if (!currentProvider) {
        currentProvider = new ethers.BrowserProvider(eth);
        setProvider(currentProvider);
      }

      const accounts = await currentProvider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) throw new Error("No accounts returned");
      
      const addr = ethers.getAddress(accounts[0]);
      setAddress(addr);
      localStorage.setItem("walletAddress", addr);

      await switchToSepolia(eth);

      const net = await currentProvider.getNetwork();
      const hexChain = `0x${net.chainId.toString(16)}`;
      setChainId(hexChain);
      localStorage.setItem("walletChainId", hexChain);

      const _signer = await currentProvider.getSigner();
      setSigner(_signer);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setChainId(null);
    setSigner(null);
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletChainId");
  };

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        isConnected,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
