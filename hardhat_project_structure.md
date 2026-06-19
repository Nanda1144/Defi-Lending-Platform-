# 🛠️ Hardhat Project Setup — DeFi Lending Platform

This guide outlines the complete TypeScript-based Hardhat project structure for the DeFi Lending Platform.

---

## 📂 Folder Structure

```text
DeFi-Lending-Platform/
│
├── contracts/                  # Smart Contracts directory
│   ├── LendingPool.sol         # Core lending engine
│   ├── Treasury.sol            # Fee collection vault
│   └── MockUSDC.sol            # Test ERC-20 token
│
├── scripts/                    # Deployment scripts
│   └── deploy.ts               # Automated deployment sequence
│
├── test/                       # Testing directory
│   ├── LendingPool.test.ts     # Core logic tests
│   └── Treasury.test.ts        # Treasury unit tests
│
├── artifacts/                  # Compiled contract artifacts (auto-generated)
├── cache/                      # Hardhat cache (auto-generated)
├── node_modules/               # Dependencies (auto-generated)
│
├── .env.local                  # Environment variables
├── hardhat.config.ts           # Hardhat configuration file
├── tsconfig.json               # TypeScript configuration
└── package.json                # Project metadata & scripts
```

---

## 📦 Installation Commands

Run the following commands in your terminal to set up the complete Hardhat environment with TypeScript and OpenZeppelin:

```bash
# Initialize npm project
npm init -y

# Install Hardhat and core plugins
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv

# Install TypeScript dependencies
npm install --save-dev typescript ts-node @types/node @types/mocha @types/chai

# Install OpenZeppelin Contracts (Security Libraries)
npm install @openzeppelin/contracts
```

---

## ⚙️ hardhat.config.ts

Create `hardhat.config.ts` at the root of your project:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
```

---

## 🔐 Environment Variables

Create a `.env.local` file at the root of your project. **Never commit this file to GitHub.**

```env
# ── Network Configuration ──
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia

# Infura or Alchemy RPC URL
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Your MetaMask Private Key (for deploying contracts)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# ── Deployed Contract Addresses ──
# (Populate these after running the deployment script)
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_MOCK_USDC_ADDRESS=
```

---

## 📜 Deployment Script Structure (scripts/deploy.ts)

Create `scripts/deploy.ts` to manage the multi-contract deployment sequence:

```typescript
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // 1. Deploy MockUSDC
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`MockUSDC deployed at: ${mockUSDCAddress}`);

  // 2. Deploy Treasury
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`Treasury deployed at: ${treasuryAddress}`);

  // 3. Deploy LendingPool
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(mockUSDCAddress, treasuryAddress);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log(`LendingPool deployed at: ${lendingPoolAddress}`);

  // 4. Configure Treasury Authorization
  console.log("Configuring Treasury -> setLendingPool...");
  const tx = await treasury.setLendingPool(lendingPoolAddress);
  await tx.wait();
  console.log("Treasury authorized LendingPool successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
```

---

## 🛠️ Usage Commands

Once everything is set up, use these commands to interact with your project:

```bash
# Compile Smart Contracts
npx hardhat compile

# Run Local Blockchain Node
npx hardhat node

# Deploy to Local Network
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to Sepolia Testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Verify Contracts on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```
