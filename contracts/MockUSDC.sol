// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   DeFi Lending Platform                     ║
 * ║                     MockUSDC.sol                            ║
 * ║                                                              ║
 * ║  ERC-20 test token simulating USDC for Sepolia testnet.     ║
 * ║  NOT for mainnet deployment.                                ║
 * ║                                                              ║
 * ║  Author : Nanda Kishore                                     ║
 * ║  Network: Ethereum Sepolia Testnet ONLY                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @author Nanda Kishore
 * @notice A mock ERC-20 token simulating USDC for testnet development.
 * @dev Uses 6 decimals to match real USDC. Includes a public faucet
 *      function for easy testing. NOT intended for mainnet deployment.
 */
contract MockUSDC is ERC20, Ownable {
    /// @notice Token uses 6 decimals to match real USDC
    uint8 private constant DECIMALS = 6;

    /// @notice Maximum amount per faucet claim: 10,000 USDC
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** DECIMALS;

    /// @notice Cooldown period between faucet claims: 24 hours
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /// @notice Tracks last faucet claim timestamp per address
    mapping(address => uint256) public lastFaucetClaim;

    // ═══════════════════════════════════════════════════════════
    //                        EVENTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Emitted when tokens are claimed from the faucet.
     * @param claimer The address that claimed tokens
     * @param amount The amount of tokens claimed
     */
    event FaucetClaimed(address indexed claimer, uint256 amount);

    // ═══════════════════════════════════════════════════════════
    //                      CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Deploys the MockUSDC token with an initial supply to the deployer.
     * @dev Mints 1,000,000 USDC to the deployer for initial distribution.
     */
    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        // Mint 1,000,000 USDC to deployer
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }

    // ═══════════════════════════════════════════════════════════
    //                   CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Returns 6 decimals to match real USDC.
     * @return Number of decimals (6)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Allows the owner to mint tokens to any address.
     * @dev Only callable by the contract owner.
     * @param _to The recipient address
     * @param _amount The amount of tokens to mint (in smallest unit)
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "MockUSDC: mint to zero address");
        _mint(_to, _amount);
    }

    /**
     * @notice Public faucet for anyone to claim test tokens.
     * @dev Limited to FAUCET_AMOUNT per claim with a 24-hour cooldown.
     *      Designed for easy testnet usage without owner intervention.
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "MockUSDC: faucet cooldown active"
        );

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}
