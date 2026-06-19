// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   DeFi Lending Platform                     ║
 * ║                     LendingPool.sol                         ║
 * ║                                                              ║
 * ║  Core lending engine managing the full loan lifecycle:       ║
 * ║  Creation → Acceptance → Repayment / Cancellation           ║
 * ║                                                              ║
 * ║  Author : Nanda Kishore                                     ║
 * ║  Network: Ethereum Sepolia Testnet                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LendingPool
 * @author Nanda Kishore
 * @notice Core contract for the DeFi Lending Platform.
 *         Manages peer-to-peer loan offers, borrowing, repayment, and cancellation.
 * @dev Uses OpenZeppelin's ReentrancyGuard, Ownable, and Pausable for security.
 *      All token transfers use SafeERC20 to handle non-standard ERC20 tokens.
 */
contract LendingPool is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════
    //                        ENUMS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Represents the current state of a loan throughout its lifecycle.
     * @dev OPEN(0) → ACTIVE(1) → REPAID(2) is the happy path.
     *      OPEN(0) → CANCELLED(3) when lender withdraws their offer.
     *      ACTIVE(1) → DEFAULTED(4) reserved for future keeper integration.
     */
    enum LoanStatus {
        OPEN,       // Lender created offer, waiting for a borrower
        ACTIVE,     // Borrower accepted, funds have been disbursed
        REPAID,     // Borrower has fully repaid the loan
        CANCELLED,  // Lender cancelled the open offer before acceptance
        DEFAULTED   // Loan expired without repayment (future use)
    }

    // ═══════════════════════════════════════════════════════════
    //                        STRUCTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Core data structure representing a single loan on the platform.
     * @dev All monetary values are stored in the token's smallest unit
     *      (e.g., 6 decimals for USDC: 1 USDC = 1_000_000).
     *      Interest and penalty rates use basis points (1 bp = 0.01%).
     */
    struct Loan {
        uint256 loanId;           // Unique auto-incremented identifier
        address lender;           // Address of the loan creator (fund provider)
        address borrower;         // Address of the borrower (address(0) when OPEN)
        uint256 principalAmount;  // Loan amount in token's smallest unit
        uint256 interestRate;     // Annual interest rate in basis points (500 = 5.00%)
        uint256 duration;         // Loan duration in seconds
        uint256 penaltyRate;      // Late repayment penalty rate in basis points
        uint256 createdAt;        // Timestamp when the loan offer was created
        uint256 startTime;        // Timestamp when borrower accepted (0 when OPEN)
        uint256 repaidAmount;     // Total amount repaid by borrower
        LoanStatus status;        // Current lifecycle state
    }

    // ═══════════════════════════════════════════════════════════
    //                    STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    /// @notice The ERC-20 token used for all lending operations (e.g., USDC)
    IERC20 public immutable lendingToken;

    /// @notice Treasury contract address where platform fees are sent
    address public treasuryAddress;

    /// @notice Auto-incrementing counter for generating unique loan IDs
    uint256 public loanCounter;

    /**
     * @notice Platform fee numerator: 1 basis point out of 100,000.
     * @dev fee = amount * PLATFORM_FEE_BPS / FEE_DENOMINATOR
     *      = amount * 1 / 100,000 = 0.001%
     */
    uint256 public constant PLATFORM_FEE_BPS = 1;

    /// @notice Fee denominator providing 0.001% precision
    uint256 public constant FEE_DENOMINATOR = 100_000;

    /// @notice Maximum allowed interest rate: 100% (10,000 basis points)
    uint256 public constant MAX_INTEREST_RATE = 10_000;

    /// @notice Maximum allowed penalty rate: 50% (5,000 basis points)
    uint256 public constant MAX_PENALTY_RATE = 5_000;

    /// @notice Maximum loan duration: 365 days
    uint256 public constant MAX_DURATION = 365 days;

    /// @notice Minimum loan amount to prevent fee rounding to zero
    uint256 public constant MIN_LOAN_AMOUNT = 1_000_000; // 1 USDC (6 decimals)

    // ═══════════════════════════════════════════════════════════
    //                       MAPPINGS
    // ═══════════════════════════════════════════════════════════

    /// @notice Loan ID → Loan data. Primary storage for all loans.
    mapping(uint256 => Loan) public loans;

    /// @notice Lender address → array of their loan IDs
    mapping(address => uint256[]) public lenderLoans;

    /// @notice Borrower address → array of their loan IDs
    mapping(address => uint256[]) public borrowerLoans;

    /// @notice Array of all currently OPEN loan IDs (the marketplace)
    uint256[] public openLoanIds;

    /// @notice Loan ID → index position in openLoanIds (for O(1) removal)
    mapping(uint256 => uint256) private _openLoanIndex;

    // ═══════════════════════════════════════════════════════════
    //                        EVENTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a lender creates a new loan offer.
     * @param loanId Unique identifier for the loan
     * @param lender Address of the lender who created the offer
     * @param principalAmount Amount of tokens offered for lending
     * @param interestRate Annual interest rate in basis points
     * @param duration Loan duration in seconds
     * @param penaltyRate Late repayment penalty in basis points
     */
    event LoanCreated(
        uint256 indexed loanId,
        address indexed lender,
        uint256 principalAmount,
        uint256 interestRate,
        uint256 duration,
        uint256 penaltyRate
    );

    /**
     * @notice Emitted when a borrower accepts an open loan offer.
     * @param loanId The accepted loan's ID
     * @param borrower Address of the borrower
     * @param lender Address of the lender
     * @param principalAmount Amount of tokens borrowed
     * @param startTime Timestamp when the loan became active
     */
    event LoanAccepted(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principalAmount,
        uint256 startTime
    );

    /**
     * @notice Emitted when a borrower fully repays their loan.
     * @param loanId The repaid loan's ID
     * @param borrower Address of the borrower
     * @param lender Address of the lender
     * @param totalRepaid Total amount paid (principal + interest + penalty)
     * @param interest Interest portion of the repayment
     * @param penalty Penalty portion (0 if repaid on time)
     */
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 totalRepaid,
        uint256 interest,
        uint256 penalty
    );

    /**
     * @notice Emitted when a lender cancels their open loan offer.
     * @param loanId The cancelled loan's ID
     * @param lender Address of the lender
     * @param principalAmount Amount of tokens refunded to the lender
     */
    event LoanCancelled(
        uint256 indexed loanId,
        address indexed lender,
        uint256 principalAmount
    );

    /**
     * @notice Emitted when a platform fee is collected.
     * @param loanId Associated loan ID
     * @param payer Address of the fee payer
     * @param amount Fee amount in tokens
     */
    event FeeCollected(
        uint256 indexed loanId,
        address indexed payer,
        uint256 amount
    );

    /**
     * @notice Emitted when the treasury address is updated.
     * @param oldTreasury Previous treasury address
     * @param newTreasury New treasury address
     */
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ═══════════════════════════════════════════════════════════
    //                       MODIFIERS
    // ═══════════════════════════════════════════════════════════

    /// @notice Ensures the loan ID exists in storage
    modifier validLoanId(uint256 _loanId) {
        require(_loanId < loanCounter, "LendingPool: loan does not exist");
        _;
    }

    /// @notice Ensures only the lender of a specific loan can call the function
    modifier onlyLoanLender(uint256 _loanId) {
        require(
            msg.sender == loans[_loanId].lender,
            "LendingPool: caller is not the lender"
        );
        _;
    }

    /// @notice Ensures only the borrower of a specific loan can call the function
    modifier onlyLoanBorrower(uint256 _loanId) {
        require(
            msg.sender == loans[_loanId].borrower,
            "LendingPool: caller is not the borrower"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════════
    //                      CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Initializes the LendingPool with token and treasury addresses.
     * @param _tokenAddress Address of the ERC-20 token used for lending (e.g., USDC)
     * @param _treasuryAddress Address of the Treasury contract for fee collection
     * @dev Both addresses are validated to be non-zero.
     *      The token address is immutable and cannot be changed after deployment.
     */
    constructor(
        address _tokenAddress,
        address _treasuryAddress
    ) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "LendingPool: invalid token address");
        require(_treasuryAddress != address(0), "LendingPool: invalid treasury address");

        lendingToken = IERC20(_tokenAddress);
        treasuryAddress = _treasuryAddress;
    }

    // ═══════════════════════════════════════════════════════════
    //                   CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Creates a new loan offer on the marketplace.
     * @dev The lender must have approved this contract to spend
     *      (principalAmount + lenderFee) tokens before calling.
     *      The principal is escrowed in this contract.
     *      The fee is sent directly to the Treasury.
     *
     * Flow:
     *   1. Validate all input parameters
     *   2. Calculate the platform fee (0.001% of principal)
     *   3. Transfer principal from lender → LendingPool (escrow)
     *   4. Transfer fee from lender → Treasury
     *   5. Create and store the Loan struct
     *   6. Add loan ID to marketplace (openLoanIds) and lender's portfolio
     *   7. Emit LoanCreated event
     *
     * @param _principalAmount Amount of tokens to lend (in smallest unit)
     * @param _interestRate Annual interest rate in basis points (100 = 1%)
     * @param _duration Loan duration in seconds
     * @param _penaltyRate Late repayment penalty in basis points
     * @return loanId The unique ID assigned to the new loan
     */
    function createLoanOffer(
        uint256 _principalAmount,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _penaltyRate
    ) external nonReentrant whenNotPaused returns (uint256 loanId) {
        // ── Input Validation ──
        require(
            _principalAmount >= MIN_LOAN_AMOUNT,
            "LendingPool: amount below minimum"
        );
        require(
            _interestRate > 0 && _interestRate <= MAX_INTEREST_RATE,
            "LendingPool: invalid interest rate"
        );
        require(
            _duration > 0 && _duration <= MAX_DURATION,
            "LendingPool: invalid duration"
        );
        require(
            _penaltyRate <= MAX_PENALTY_RATE,
            "LendingPool: penalty rate too high"
        );

        // ── Fee Calculation ──
        uint256 lenderFee = (_principalAmount * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;

        // ── Token Transfers (Checks-Effects-Interactions) ──
        // Transfer principal to this contract (escrow)
        lendingToken.safeTransferFrom(msg.sender, address(this), _principalAmount);

        // Transfer platform fee to Treasury
        if (lenderFee > 0) {
            lendingToken.safeTransferFrom(msg.sender, treasuryAddress, lenderFee);
        }

        // ── State Updates ──
        loanId = loanCounter;
        loanCounter++;

        loans[loanId] = Loan({
            loanId: loanId,
            lender: msg.sender,
            borrower: address(0),      // No borrower yet
            principalAmount: _principalAmount,
            interestRate: _interestRate,
            duration: _duration,
            penaltyRate: _penaltyRate,
            createdAt: block.timestamp,
            startTime: 0,              // Not active yet
            repaidAmount: 0,
            status: LoanStatus.OPEN
        });

        // Add to marketplace
        _openLoanIndex[loanId] = openLoanIds.length;
        openLoanIds.push(loanId);

        // Add to lender's portfolio
        lenderLoans[msg.sender].push(loanId);

        // ── Emit Events ──
        emit FeeCollected(loanId, msg.sender, lenderFee);
        emit LoanCreated(
            loanId,
            msg.sender,
            _principalAmount,
            _interestRate,
            _duration,
            _penaltyRate
        );
    }

    /**
     * @notice Cancels an open loan offer and refunds the escrowed principal.
     * @dev Only the lender who created the offer can cancel it.
     *      The platform fee paid during creation is NOT refunded.
     *      The principal is returned from escrow to the lender.
     *
     * Flow:
     *   1. Validate loan exists, is OPEN, and caller is the lender
     *   2. Update loan status to CANCELLED
     *   3. Remove from marketplace (openLoanIds)
     *   4. Refund escrowed principal to lender
     *   5. Emit LoanCancelled event
     *
     * @param _loanId The ID of the loan to cancel
     */
    function cancelLoanOffer(
        uint256 _loanId
    )
        external
        nonReentrant
        whenNotPaused
        validLoanId(_loanId)
        onlyLoanLender(_loanId)
    {
        Loan storage loan = loans[_loanId];

        require(
            loan.status == LoanStatus.OPEN,
            "LendingPool: loan is not open"
        );

        // ── State Updates (before external call) ──
        loan.status = LoanStatus.CANCELLED;

        // Remove from marketplace using swap-and-pop (O(1))
        _removeFromOpenLoans(_loanId);

        // ── Refund Principal ──
        lendingToken.safeTransfer(loan.lender, loan.principalAmount);

        // ── Emit Event ──
        emit LoanCancelled(_loanId, loan.lender, loan.principalAmount);
    }

    /**
     * @notice Allows a borrower to accept an open loan offer.
     * @dev The borrower must have approved this contract to spend
     *      the borrower fee before calling.
     *      Principal is transferred from escrow to the borrower.
     *      Borrower fee is sent directly to Treasury.
     *
     * Flow:
     *   1. Validate loan is OPEN and borrower is not the lender
     *   2. Calculate borrower's platform fee (0.001% of principal)
     *   3. Transfer borrower fee → Treasury
     *   4. Transfer escrowed principal → Borrower
     *   5. Update loan state (borrower, status, startTime)
     *   6. Remove from marketplace, add to borrower's portfolio
     *   7. Emit LoanAccepted event
     *
     * @param _loanId The ID of the loan to accept/borrow
     */
    function borrowLoan(
        uint256 _loanId
    ) external nonReentrant whenNotPaused validLoanId(_loanId) {
        Loan storage loan = loans[_loanId];

        require(
            loan.status == LoanStatus.OPEN,
            "LendingPool: loan is not open"
        );
        require(
            msg.sender != loan.lender,
            "LendingPool: lender cannot borrow own loan"
        );

        // ── Fee Calculation ──
        uint256 borrowerFee = (loan.principalAmount * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;

        // ── Token Transfers ──
        // Collect borrower's platform fee
        if (borrowerFee > 0) {
            lendingToken.safeTransferFrom(msg.sender, treasuryAddress, borrowerFee);
        }

        // Release escrowed principal to borrower
        lendingToken.safeTransfer(msg.sender, loan.principalAmount);

        // ── State Updates ──
        loan.borrower = msg.sender;
        loan.status = LoanStatus.ACTIVE;
        loan.startTime = block.timestamp;

        // Remove from marketplace
        _removeFromOpenLoans(_loanId);

        // Add to borrower's portfolio
        borrowerLoans[msg.sender].push(_loanId);

        // ── Emit Events ──
        emit FeeCollected(_loanId, msg.sender, borrowerFee);
        emit LoanAccepted(
            _loanId,
            msg.sender,
            loan.lender,
            loan.principalAmount,
            loan.startTime
        );
    }

    /**
     * @notice Allows the borrower to repay an active loan in full.
     * @dev Calculates total repayment including interest and any late penalty.
     *      The borrower must have approved this contract for the total amount.
     *      Full repayment is transferred directly to the lender.
     *
     * Repayment Formula:
     *   interest = (principal × interestRate × elapsed) / (365 days × 10,000)
     *   if overdue:
     *     penalty = (principal × penaltyRate × overdueTime) / (365 days × 10,000)
     *   totalRepayment = principal + interest + penalty
     *
     * Flow:
     *   1. Validate loan is ACTIVE and caller is the borrower
     *   2. Calculate interest based on elapsed time
     *   3. Calculate penalty if overdue
     *   4. Transfer total repayment from borrower → lender
     *   5. Update loan status to REPAID
     *   6. Emit LoanRepaid event
     *
     * @param _loanId The ID of the loan to repay
     */
    function repayLoan(
        uint256 _loanId
    )
        external
        nonReentrant
        whenNotPaused
        validLoanId(_loanId)
        onlyLoanBorrower(_loanId)
    {
        Loan storage loan = loans[_loanId];

        require(
            loan.status == LoanStatus.ACTIVE,
            "LendingPool: loan is not active"
        );

        // ── Calculate Repayment ──
        (
            uint256 principal,
            uint256 interest,
            uint256 penalty,
            uint256 totalRepayment
        ) = calculateRepayment(_loanId);

        // ── State Updates (before external call) ──
        loan.repaidAmount = totalRepayment;
        loan.status = LoanStatus.REPAID;

        // ── Transfer repayment to lender ──
        lendingToken.safeTransferFrom(msg.sender, loan.lender, totalRepayment);

        // ── Emit Event ──
        emit LoanRepaid(
            _loanId,
            loan.borrower,
            loan.lender,
            totalRepayment,
            interest,
            penalty
        );
    }

    // ═══════════════════════════════════════════════════════════
    //                    VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Returns the full details of a specific loan.
     * @param _loanId The ID of the loan to query
     * @return loan The complete Loan struct
     */
    function getLoanDetails(
        uint256 _loanId
    ) external view validLoanId(_loanId) returns (Loan memory) {
        return loans[_loanId];
    }

    /**
     * @notice Returns all currently open loan offers (the marketplace).
     * @dev Returns full Loan structs for frontend rendering.
     *      Uses pagination to prevent unbounded gas consumption.
     * @param _offset Starting index in the openLoanIds array
     * @param _limit Maximum number of loans to return
     * @return result Array of open Loan structs
     * @return total Total number of open loans available
     */
    function getAllOpenLoans(
        uint256 _offset,
        uint256 _limit
    ) external view returns (Loan[] memory result, uint256 total) {
        total = openLoanIds.length;

        if (_offset >= total) {
            return (new Loan[](0), total);
        }

        // Calculate actual count to return
        uint256 remaining = total - _offset;
        uint256 count = remaining < _limit ? remaining : _limit;

        result = new Loan[](count);

        for (uint256 i = 0; i < count; i++) {
            result[i] = loans[openLoanIds[_offset + i]];
        }

        return (result, total);
    }

    /**
     * @notice Calculates the full repayment amount for an active loan.
     * @dev Includes principal, accrued interest, and any late penalty.
     *      Can be called by anyone to preview the repayment cost.
     * @param _loanId The ID of the active loan
     * @return principal The original loan amount
     * @return interest Accrued interest based on elapsed time
     * @return penalty Late penalty (0 if within duration)
     * @return totalRepayment Sum of principal + interest + penalty
     */
    function calculateRepayment(
        uint256 _loanId
    )
        public
        view
        validLoanId(_loanId)
        returns (
            uint256 principal,
            uint256 interest,
            uint256 penalty,
            uint256 totalRepayment
        )
    {
        Loan storage loan = loans[_loanId];
        require(
            loan.status == LoanStatus.ACTIVE,
            "LendingPool: loan is not active"
        );

        principal = loan.principalAmount;
        uint256 elapsed = block.timestamp - loan.startTime;

        // Interest = (principal × rate × elapsed) / (365 days × 10,000)
        interest = (principal * loan.interestRate * elapsed) / (365 days * 10_000);

        // Penalty applies only if overdue
        if (elapsed > loan.duration) {
            uint256 overdueTime = elapsed - loan.duration;
            penalty = (principal * loan.penaltyRate * overdueTime) / (365 days * 10_000);
        }

        totalRepayment = principal + interest + penalty;
    }

    /**
     * @notice Returns all loan IDs created by a specific lender.
     * @param _lender The lender's wallet address
     * @return Array of loan IDs
     */
    function getLenderLoanIds(
        address _lender
    ) external view returns (uint256[] memory) {
        return lenderLoans[_lender];
    }

    /**
     * @notice Returns all loan IDs accepted by a specific borrower.
     * @param _borrower The borrower's wallet address
     * @return Array of loan IDs
     */
    function getBorrowerLoanIds(
        address _borrower
    ) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }

    /**
     * @notice Returns the total number of open loans in the marketplace.
     * @return The count of currently open loan offers
     */
    function getOpenLoanCount() external view returns (uint256) {
        return openLoanIds.length;
    }

    /**
     * @notice Calculates the platform fee for a given amount.
     * @param _amount The principal amount to calculate fee for
     * @return fee The platform fee (0.001% of the amount)
     */
    function calculateFee(uint256 _amount) public pure returns (uint256 fee) {
        fee = (_amount * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;
    }

    // ═══════════════════════════════════════════════════════════
    //                   ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Updates the Treasury contract address.
     * @dev Only callable by the contract owner.
     * @param _newTreasury The new Treasury contract address
     */
    function setTreasuryAddress(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "LendingPool: invalid treasury address");
        address oldTreasury = treasuryAddress;
        treasuryAddress = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /**
     * @notice Pauses all core operations (emergency circuit breaker).
     * @dev Only callable by the contract owner.
     *      When paused: createLoanOffer, cancelLoanOffer, borrowLoan, repayLoan
     *      are all blocked. View functions remain accessible.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes all core operations after an emergency pause.
     * @dev Only callable by the contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════
    //                  INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Removes a loan ID from the openLoanIds array using swap-and-pop.
     * @dev O(1) removal: swaps the target with the last element, then pops.
     *      This avoids expensive O(n) array shifting.
     *
     *      Example: Remove ID=3 from [1, 5, 3, 7, 9]
     *        1. index = _openLoanIndex[3] = 2
     *        2. Swap: [1, 5, 9, 7, 9] (last element copied to index 2)
     *        3. Update index: _openLoanIndex[9] = 2
     *        4. Pop: [1, 5, 9, 7]
     *        5. Delete: _openLoanIndex[3]
     *
     * @param _loanId The loan ID to remove from the open loans array
     */
    function _removeFromOpenLoans(uint256 _loanId) private {
        uint256 index = _openLoanIndex[_loanId];
        uint256 lastIndex = openLoanIds.length - 1;

        if (index != lastIndex) {
            uint256 lastLoanId = openLoanIds[lastIndex];
            openLoanIds[index] = lastLoanId;
            _openLoanIndex[lastLoanId] = index;
        }

        openLoanIds.pop();
        delete _openLoanIndex[_loanId];
    }
}
