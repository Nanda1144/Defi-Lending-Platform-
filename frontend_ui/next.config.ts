import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot‑module‑replacement requests from your local LAN IP (or any LAN address you use).
  // Adjust as needed for your environment.
  allowedDevOrigins: ["10.112.208.123"],
  // You can add other Next.js options here.
};

export default nextConfig;
