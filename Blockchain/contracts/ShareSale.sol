// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SolarShareToken} from "./SolarShareToken.sol";

/// @title ShareSale
/// @notice Approved investors buy new shares at a fixed USDC price. The USDC
///         goes straight to the operator's treasury and the shares are minted
///         to the buyer, up to the 3,500 cap.
/// @dev Needs SolarShareToken's MINTER_ROLE.
contract ShareSale is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    SolarShareToken public immutable token;
    IERC20 public immutable usdc;

    /// @notice Where sale money goes.
    address public treasury;
    /// @notice USDC (6 decimals) per share. 5000000 = 5 USDC.
    uint256 public pricePerShare;

    event SharesPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event PriceSet(uint256 previous, uint256 current);
    event TreasurySet(address indexed treasury);

    error AccountNotApproved(address account);
    error AccountFrozen(address account);
    error SoldOut(uint256 requested, uint256 remaining);
    error ZeroAmount();
    error ZeroAddress();

    constructor(address admin, SolarShareToken token_, IERC20 usdc_, address treasury_, uint256 pricePerShare_) {
        if (
            admin == address(0) || address(token_) == address(0) || address(usdc_) == address(0)
                || treasury_ == address(0)
        ) revert ZeroAddress();
        if (pricePerShare_ == 0) revert ZeroAmount();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        token = token_;
        usdc = usdc_;
        treasury = treasury_;
        pricePerShare = pricePerShare_;
        emit TreasurySet(treasury_);
        emit PriceSet(0, pricePerShare_);
    }

    /// @notice Buy `amount` shares. First call `usdc.approve(this, quote(amount))`.
    function buy(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (token.isFrozen(msg.sender)) revert AccountFrozen(msg.sender);
        if (!token.isApproved(msg.sender)) revert AccountNotApproved(msg.sender);
        uint256 remaining = sharesRemaining();
        if (amount > remaining) revert SoldOut(amount, remaining);

        uint256 cost = quote(amount);
        usdc.safeTransferFrom(msg.sender, treasury, cost);
        token.mint(msg.sender, amount);
        emit SharesPurchased(msg.sender, amount, cost);
    }

    function quote(uint256 amount) public view returns (uint256) {
        return amount * pricePerShare;
    }

    function sharesRemaining() public view returns (uint256) {
        return token.MAX_SUPPLY() - token.totalSupply();
    }

    function setPrice(uint256 newPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newPrice == 0) revert ZeroAmount();
        emit PriceSet(pricePerShare, newPrice);
        pricePerShare = newPrice;
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasurySet(newTreasury);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
