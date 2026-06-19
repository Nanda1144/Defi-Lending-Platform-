import { expect } from "chai";
import hre from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("LendingPool & Treasury Ecosystem", function () {
  // ── Constants matching smart contract ──
  const MIN_LOAN_AMOUNT = 1_000_000n; // 1 USDC (6 decimals)
  const PLATFORM_FEE_BPS = 1n; // 0.001%
  const FEE_DENOMINATOR = 100_000n;

  // ── Standard Loan Parameters ──
  const PRINCIPAL = 10_000_000n; // 10 USDC
  const INTEREST_RATE = 500n; // 5%
  const DURATION = 30n * 24n * 60n * 60n; // 30 days in seconds
  const PENALTY_RATE = 200n; // 2%

  const INITIAL_BALANCE = 100_000_000n; // 100 USDC

  // Helper function to calculate expected fee
  const calculateFee = (amount: bigint) => (amount * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;

  async function deployLendingPoolFixture() {
    const [owner, lender, borrower, otherAccount] = await hre.ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();

    // Deploy Treasury
    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();

    // Deploy LendingPool
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(await mockUSDC.getAddress(), await treasury.getAddress());

    // Configure Treasury
    await treasury.setLendingPool(await lendingPool.getAddress());

    // Fund accounts
    await mockUSDC.mint(lender.address, INITIAL_BALANCE);
    await mockUSDC.mint(borrower.address, INITIAL_BALANCE);

    // Unlimited approvals for testing convenience
    // @ts-ignore
    await mockUSDC.connect(lender).approve(await lendingPool.getAddress(), hre.ethers.MaxUint256);
    // @ts-ignore
    await mockUSDC.connect(borrower).approve(await lendingPool.getAddress(), hre.ethers.MaxUint256);

    return { mockUSDC, treasury, lendingPool, owner, lender, borrower, otherAccount };
  }

  describe("1. Deployment & Initialization", function () {
    it("Should correctly initialize token and treasury addresses", async function () {
      const { mockUSDC, treasury, lendingPool } = await loadFixture(deployLendingPoolFixture);

      expect(await lendingPool.lendingToken()).to.equal(await mockUSDC.getAddress());
      expect(await lendingPool.treasuryAddress()).to.equal(await treasury.getAddress());
      expect(await treasury.lendingPoolAddress()).to.equal(await lendingPool.getAddress());
    });
  });

  describe("2. Create Loan Offer (Lender)", function () {
    it("Should successfully create a loan and deduct fee", async function () {
      const { lendingPool, mockUSDC, treasury, lender } = await loadFixture(deployLendingPoolFixture);

      const fee = calculateFee(PRINCIPAL);
      const initialLenderBal = await mockUSDC.balanceOf(lender.address);

      // @ts-ignore
      await expect(
        (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE)
      )
        .to.emit(lendingPool, "LoanCreated")
        .withArgs(0, lender.address, PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE)
        .and.to.emit(lendingPool, "FeeCollected")
        .withArgs(0, lender.address, fee);

      // Check Balances (Lender lost Principal + Fee)
      expect(await mockUSDC.balanceOf(lender.address)).to.equal(initialLenderBal - PRINCIPAL - fee);

      // Treasury received fee
      expect(await treasury.getBalance(await mockUSDC.getAddress())).to.equal(fee);

      // Escrow holds principal
      expect(await mockUSDC.balanceOf(await lendingPool.getAddress())).to.equal(PRINCIPAL);

      // Check Loan Struct
      const loan = await lendingPool.getLoanDetails(0);
      expect(loan.status).to.equal(0n); // OPEN
      expect(loan.principalAmount).to.equal(PRINCIPAL);
    });

    it("Should fail if amount is below MIN_LOAN_AMOUNT", async function () {
      const { lendingPool, lender } = await loadFixture(deployLendingPoolFixture);
      const tinyAmount = 100_000n; // 0.1 USDC

      // @ts-ignore
      await expect(
        (lendingPool as any).connect(lender).createLoanOffer(tinyAmount, INTEREST_RATE, DURATION, PENALTY_RATE)
      ).to.be.revertedWith("LendingPool: amount below minimum");
    });

    it("Should fail if interest rate or penalty is too high", async function () {
      const { lendingPool, lender } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await expect(
        (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, 15000n, DURATION, PENALTY_RATE)
      ).to.be.revertedWith("LendingPool: invalid interest rate");

      // @ts-ignore
      await expect(
        (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, 6000n)
      ).to.be.revertedWith("LendingPool: penalty rate too high");
    });
  });

  describe("3. Cancel Loan Offer (Lender)", function () {
    it("Should allow lender to cancel and receive principal refund", async function () {
      const { lendingPool, mockUSDC, lender } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);
      const balanceBeforeCancel = await mockUSDC.balanceOf(lender.address);

      await expect((lendingPool as any).connect(lender).cancelLoanOffer(0))
        .to.emit(lendingPool, "LoanCancelled")
        .withArgs(0, lender.address, PRINCIPAL);

      // Principal is refunded, but fee is NOT refunded
      expect(await mockUSDC.balanceOf(lender.address)).to.equal(balanceBeforeCancel + PRINCIPAL);

      const loan = await lendingPool.getLoanDetails(0);
      expect(loan.status).to.equal(3n); // CANCELLED
    });

    it("Should fail if a non-lender tries to cancel", async function () {
      const { lendingPool, lender, borrower } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);

      await expect(
        (lendingPool as any).connect(borrower).cancelLoanOffer(0)
      ).to.be.revertedWith("LendingPool: caller is not the lender");
    });
  });

  describe("4. Borrow Loan (Borrower)", function () {
    it("Should allow borrower to accept loan and receive principal", async function () {
      const { lendingPool, mockUSDC, treasury, lender, borrower } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);

      const fee = calculateFee(PRINCIPAL);
      const initialBorrowerBal = await mockUSDC.balanceOf(borrower.address);
      const initialTreasuryBal = await treasury.getBalance(await mockUSDC.getAddress());

      await expect((lendingPool as any).connect(borrower).borrowLoan(0))
        .to.emit(lendingPool, "LoanAccepted")
        .and.to.emit(lendingPool, "FeeCollected")
        .withArgs(0, borrower.address, fee);

      // Borrower received Principal but paid Fee
      expect(await mockUSDC.balanceOf(borrower.address)).to.equal(initialBorrowerBal + PRINCIPAL - fee);

      // Treasury has 2 fees now (Lender + Borrower)
      expect(await treasury.getBalance(await mockUSDC.getAddress())).to.equal(initialTreasuryBal + fee);

      const loan = await lendingPool.getLoanDetails(0);
      expect(loan.status).to.equal(1n); // ACTIVE
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.startTime).to.be.gt(0);
    });

    it("Should fail if lender tries to borrow their own loan", async function () {
      const { lendingPool, lender } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);

      await expect(
        (lendingPool as any).connect(lender).borrowLoan(0)
      ).to.be.revertedWith("LendingPool: lender cannot borrow own loan");
    });
  });

  describe("5. Repay Loan (Borrower)", function () {
    it("Should allow borrower to repay successfully within duration (No Penalty)", async function () {
      const { lendingPool, mockUSDC, lender, borrower } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);
      await (lendingPool as any).connect(borrower).borrowLoan(0);

      // Fast forward 15 days
      await time.increase(15 * 24 * 60 * 60);

      // Get repayment calculation
      const [principal, interest, penalty, total] = await lendingPool.calculateRepayment(0);

      expect(penalty).to.equal(0n);
      expect(interest).to.be.gt(0n);
      expect(total).to.equal(principal + interest);

      const lenderBalBefore = await mockUSDC.balanceOf(lender.address);

      await expect((lendingPool as any).connect(borrower).repayLoan(0))
        .to.emit(lendingPool, "LoanRepaid")
        .withArgs(0, borrower.address, lender.address, total, interest, 0n);

      // Lender receives principal + interest
      expect(await mockUSDC.balanceOf(lender.address)).to.equal(lenderBalBefore + total);

      const loan = await lendingPool.getLoanDetails(0);
      expect(loan.status).to.equal(2n); // REPAID
    });

    it("Should charge a penalty if repaid after duration", async function () {
      const { lendingPool, lender, borrower } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);
      await (lendingPool as any).connect(borrower).borrowLoan(0);

      // Fast forward 40 days (10 days overdue)
      await time.increase(40 * 24 * 60 * 60);

      const [, , penalty, ] = await lendingPool.calculateRepayment(0);

      expect(penalty).to.be.gt(0n); // Penalty should be applied

      await expect((lendingPool as any).connect(borrower).repayLoan(0))
        .to.emit(lendingPool, "LoanRepaid");
    });

    it("Should fail if a non‑borrower tries to repay", async function () {
      const { lendingPool, lender, borrower, otherAccount } = await loadFixture(deployLendingPoolFixture);

      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);
      await (lendingPool as any).connect(borrower).borrowLoan(0);

      await expect(
        (lendingPool as any).connect(otherAccount).repayLoan(0)
      ).to.be.revertedWith("LendingPool: caller is not the borrower");
    });
  });

  describe("6. Platform Fee Collection & Treasury", function () {
    it("Should allow owner to withdraw accumulated fees from Treasury", async function () {
      const { lendingPool, mockUSDC, treasury, owner, lender, borrower } = await loadFixture(deployLendingPoolFixture);

      // Lender creates loan -> Fee #1
      // @ts-ignore
      await (lendingPool as any).connect(lender).createLoanOffer(PRINCIPAL, INTEREST_RATE, DURATION, PENALTY_RATE);

      // Borrower accepts loan -> Fee #2
      await (lendingPool as any).connect(borrower).borrowLoan(0);

      const totalFee = calculateFee(PRINCIPAL) * 2n;
      expect(await treasury.getAvailableFees(await mockUSDC.getAddress())).to.equal(totalFee);

      const ownerBalBefore = await mockUSDC.balanceOf(owner.address);

      // Withdraw fees
      // @ts-ignore
// @ts-ignore
await expect(treasury.connect(owner).withdrawFees(await mockUSDC.getAddress(), totalFee, owner.address))
        .to.emit(treasury, "FeeWithdrawn")
        .withArgs(await mockUSDC.getAddress(), totalFee, owner.address);

      expect(await mockUSDC.balanceOf(owner.address)).to.equal(ownerBalBefore + totalFee);
      expect(await treasury.getAvailableFees(await mockUSDC.getAddress())).to.equal(0n);
    });

    it("Should reject non‑owners from withdrawing fees", async function () {
      const { mockUSDC, treasury, lender } = await loadFixture(deployLendingPoolFixture);

      await expect(
        // @ts-ignore
          treasury.connect(lender).withdrawFees(await mockUSDC.getAddress(), 100n, lender.address)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });
});
