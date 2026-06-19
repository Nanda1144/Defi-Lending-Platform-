import hre from "hardhat";

async function verifyContract(address: string, constructorArguments: any[] = []) {
  if (hre.network.name === "sepolia" || hre.network.name === "goerli") {
    console.log(`\n⏳ Verifying contract at ${address}...`);
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: constructorArguments,
      });
      console.log(`✅ Contract verified at ${address}`);
    } catch (error: any) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log(`✅ Contract at ${address} is already verified.`);
      } else {
        console.error(`❌ Verification failed for ${address}:`, error.message);
      }
    }
  } else {
    console.log(`\n⏭️ Skipping verification on ${hre.network.name} network.`);
  }
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer wallet configured. Please check your PRIVATE_KEY in .env.local");
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(`Deployer ${deployer.address} has 0 ETH. Please fund the wallet.`);
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("  DeFi Lending Platform — Deployment & Verification");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Network  : ${hre.network.name}`);
  console.log(`  Balance  : ${hre.ethers.formatEther(balance)} ETH`);
  console.log("═══════════════════════════════════════════════════\n");

  try {
    // ── Step 1: Deploy MockUSDC ──
    console.log("📦 Step 1: Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddress = await mockUSDC.getAddress();
    console.log(`   ✅ MockUSDC deployed at: ${mockUSDCAddress}\n`);

    // ── Step 2: Deploy Treasury ──
    console.log("📦 Step 2: Deploying Treasury...");
    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log(`   ✅ Treasury deployed at: ${treasuryAddress}\n`);

    // ── Step 3: Deploy LendingPool ──
    console.log("📦 Step 3: Deploying LendingPool...");
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(mockUSDCAddress, treasuryAddress);
    await lendingPool.waitForDeployment();
    const lendingPoolAddress = await lendingPool.getAddress();
    console.log(`   ✅ LendingPool deployed at: ${lendingPoolAddress}\n`);

    // ── Step 4: Configure Treasury ──
    console.log("⚙️  Step 4: Configuring Treasury → setLendingPool...");
    const tx = await treasury.setLendingPool(lendingPoolAddress);
    await tx.wait(2); // Wait for a few block confirmations to ensure it's mined securely
    console.log(`   ✅ Treasury authorized LendingPool\n`);

    // ── Step 5: Verification (if on Sepolia) ──
    if (hre.network.name === "sepolia") {
      console.log("🔍 Step 5: Waiting for 5 block confirmations before verification...");
      // Hardhat recommends waiting a few blocks for Etherscan to index the contracts
      // Note: In a real deploy script, you'd wait by checking tx receipts or sleeping.
      // Here we simulate a sleep for demonstration, or assume Etherscan is fast enough.
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec wait

      await verifyContract(mockUSDCAddress, []);
      await verifyContract(treasuryAddress, []);
      await verifyContract(lendingPoolAddress, [mockUSDCAddress, treasuryAddress]);
    }

    // ── Summary ──
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  🎉 Deployment Complete!");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  MockUSDC     : ${mockUSDCAddress}`);
    console.log(`  Treasury     : ${treasuryAddress}`);
    console.log(`  LendingPool  : ${lendingPoolAddress}`);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n📋 Add these to your .env.local:");
    console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS=${lendingPoolAddress}`);
    console.log(`  NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
    console.log(`  NEXT_PUBLIC_MOCK_USDC_ADDRESS=${mockUSDCAddress}`);

  } catch (error) {
    console.error("\n❌ Deployment failed unexpectedly:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Critical Error:", error);
    process.exit(1);
  });
