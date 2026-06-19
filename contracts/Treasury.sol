// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   DeFi Lending Platform                     ║
 * ║                      Treasury.sol                           ║
 * ║                                                              ║
 * ║  Secure vault for platform fee collection and management.   ║
 * ║  Isolated from lending pool funds for maximum security.     ║
 * ║                                                              ║
 * ║  Author : Nanda Kishore                                     ║
 * ║  Network: Ethereum Sepolia Testnet                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @author Nanda Kishore
 * @notice Secure vault that collects, holds, and disburses platform fees.
 * @dev Fees are deposited by the LendingPool contract during loan creation
 *      and borrowing. Only the contract owner can withdraw accumulated fees.
 *      The Treasury is intentionally separated from LendingPool to ensure
 *      that platform revenue is never mixed with active loan funds.
 */
contract Treasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════
    //                    STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    /// @notice Address of the authorized LendingPool contract
    address public lendingPoolAddress;

    /// @notice Token address → Total fees ever collected
    mapping(address => uint256) public totalFeesCollected;

    /// @notice Token address → Total fees withdrawn by owner
    mapping(address => uint256) public totalFeesWithdrawn;

    // ═══════════════════════════════════════════════════════════
    //                        EVENTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Emitted when fees are received from the LendingPool.
     * @param token The ERC-20 token address
     * @param amount The fee amount received
     * @param from The address that paid the fee
     * @param loanId The associated loan ID
     */
    event FeeReceived(
        address indexed token,
        uint256 amount,
        address indexed from,
        uint256 indexed loanId
    );

    /**
     * @notice Emitted when the owner withdraws accumulated fees.
     * @param token The ERC-20 token address
     * @param amount The amount withdrawn
     * @param to The recipient address
     */
    event FeeWithdrawn(
        address indexed token,
        uint256 amount,
        address indexed to
    );

    /**
     * @notice Emitted when the authorized LendingPool address is updated.
     * @param oldLendingPool Previous LendingPool address
     * @param newLendingPool New LendingPool address
     */
    event LendingPoolUpdated(
        address indexed oldLendingPool,
        address indexed newLendingPool
    );

    // ═══════════════════════════════════════════════════════════
    //                      CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Initializes the Treasury contract.
     * @dev The deployer becomes the owner with withdrawal privileges.
     *      LendingPool address is set separately after deployment
     *      since LendingPool needs Treasury's address in its constructor.
     */
    constructor() Ownable(msg.sender) {}

    // ═══════════════════════════════════════════════════════════
    //                   CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Records a fee deposit. Called externally for accounting.
     * @dev The actual token transfer happens via safeTransferFrom in
     *      LendingPool — fees are sent directly to this contract's address.
     *      This function is for tracking purposes only.
     * @param _token The ERC-20 token address
     * @param _amount The fee amount deposited
     * @param _from The address that paid the fee
     * @param _loanId The associated loan ID
     */
    function recordFee(
        address _token,
        uint256 _amount,
        address _from,
        uint256 _loanId
    ) external {
        require(
            msg.sender == lendingPoolAddress,
            "Treasury: caller is not LendingPool"
        );

        totalFeesCollected[_token] += _amount;
        emit FeeReceived(_token, _amount, _from, _loanId);
    }

    /**
     * @notice Withdraws accumulated fees to a specified address.
     * @dev Only the contract owner can withdraw.
     *      Uses SafeERC20 for secure token transfers.
     * @param _token The ERC-20 token address to withdraw
     * @param _amount The amount to withdraw
     * @param _to The recipient address
     */
    function withdrawFees(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyOwner nonReentrant {
        require(_to != address(0), "Treasury: invalid recipient");
        require(_amount > 0, "Treasury: amount must be > 0");

        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance >= _amount, "Treasury: insufficient balance");

        totalFeesWithdrawn[_token] += _amount;

        IERC20(_token).safeTransfer(_to, _amount);

        emit FeeWithdrawn(_token, _amount, _to);
    }

    // ═══════════════════════════════════════════════════════════
    //                    VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Returns the current token balance held by the Treasury.
     * @param _token The ERC-20 token address to query
     * @return The current balance of the specified token
     */
    function getBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * @notice Returns the available (unwithdrawn) fees for a token.
     * @param _token The ERC-20 token address
     * @return The amount of fees available for withdrawal
     */
    function getAvailableFees(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    // ═══════════════════════════════════════════════════════════
    //                   ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Sets the authorized LendingPool contract address.
     * @dev Only callable by the owner. Must be called after LendingPool deployment.
     * @param _lendingPool The LendingPool contract address
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        require(_lendingPool != address(0), "Treasury: invalid LendingPool address");
        address old = lendingPoolAddress;
        lendingPoolAddress = _lendingPool;
        emit LendingPoolUpdated(old, _lendingPool);
    }

    /**
     * @notice Emergency withdrawal of all tokens of a specific type.
     * @dev Only callable by the owner. Use only in emergencies.
     * @param _token The ERC-20 token address to withdraw
     * @param _to The recipient address
     */
    function emergencyWithdraw(
        address _token,
        address _to
    ) external onlyOwner nonReentrant {
        require(_to != address(0), "Treasury: invalid recipient");
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "Treasury: no balance");

        totalFeesWithdrawn[_token] += balance;

        IERC20(_token).safeTransfer(_to, balance);

        emit FeeWithdrawn(_token, balance, _to);
    }
}
