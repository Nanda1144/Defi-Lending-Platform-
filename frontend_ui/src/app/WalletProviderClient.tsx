"use client";

import { WalletProvider } from "../context/WalletContext";
import React, { ReactNode } from "react";

/** Client wrapper to provide wallet context inside the server layout */
export default function WalletProviderClient({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
