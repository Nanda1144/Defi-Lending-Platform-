// ── Smart Contract Addresses ──
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const MOCK_USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "";

// ── Smart Contract ABIs ──

// Minimal ABI for LendingPool interactions
export const LENDING_POOL_ABI = [
  "function createLoanOffer(uint256 _principalAmount, uint256 _interestRate, uint256 _duration, uint256 _penaltyRate) external returns (uint256)",
  "function cancelLoanOffer(uint256 _loanId) external",
  "function borrowLoan(uint256 _loanId) external",
  "function repayLoan(uint256 _loanId) external",
  "function getLoanDetails(uint256 _loanId) external view returns (tuple(uint256 loanId, address lender, address borrower, uint256 principalAmount, uint256 interestRate, uint256 duration, uint256 penaltyRate, uint256 createdAt, uint256 startTime, uint256 repaidAmount, uint8 status))",
  "function getAllOpenLoans(uint256 _offset, uint256 _limit) external view returns (tuple(uint256 loanId, address lender, address borrower, uint256 principalAmount, uint256 interestRate, uint256 duration, uint256 penaltyRate, uint256 createdAt, uint256 startTime, uint256 repaidAmount, uint8 status)[], uint256)",
  "function calculateRepayment(uint256 _loanId) public view returns (uint256 principal, uint256 interest, uint256 penalty, uint256 totalRepayment)",
  "function calculateFee(uint256 _amount) public pure returns (uint256)",
  "function getLenderLoanIds(address _lender) external view returns (uint256[] memory)",
  "function getBorrowerLoanIds(address _borrower) external view returns (uint256[] memory)",
  "event LoanCreated(uint256 indexed loanId, address indexed lender, uint256 principalAmount, uint256 interestRate, uint256 duration, uint256 penaltyRate)",
  "event LoanAccepted(uint256 indexed loanId, address indexed borrower, address indexed lender, uint256 principalAmount, uint256 startTime)",
  "event LoanRepaid(uint256 indexed loanId, address indexed borrower, address indexed lender, uint256 totalRepaid, uint256 interest, uint256 penalty)",
  "event LoanCancelled(uint256 indexed loanId, address indexed lender, uint256 principalAmount)",
  "event FeeCollected(uint256 indexed loanId, address indexed payer, uint256 amount)"
];

// Minimal ABI for standard ERC20 operations and Testnet Faucet
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function faucet() external" // MockUSDC specific for Sepolia testnet
];
