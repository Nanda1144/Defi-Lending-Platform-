// src/lib/contractABI.ts
// Simple re‑exports of the compiled contract ABIs.
// Keeping the import paths relative to this file makes them easy for the rest of the codebase.

//import LendingPool from "../../../artifacts/contracts/LendingPool.sol/LendingPool.json";
//import MockUSDC from "../../../artifacts/contracts/MockUSDC.sol/MockUSDC.json";

import LendingPool from "./abi/LendingPool.json";

import MockUSDC from "./abi/MockUSDC.json";

export const lendingPoolABI = LendingPool.abi;

export const mockUSDCABI = MockUSDC.abi;

