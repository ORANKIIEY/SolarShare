// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IShareHook} from "./interfaces/IShareHook.sol";
import {SolarShareToken} from "./SolarShareToken.sol";
import {MeterOracle} from "./MeterOracle.sol";

/// @title RevenueDistributor
/// @notice The operator pays monthly income in USDC; every share earns an
///         equal part and holders claim it. Two safety rules:
///         1. Total deposits can never exceed (energy sold, as signed by the
///            meter) x (tariff). Money only flows when the meter proves it.
///         2. Nobody can claim while the meter is not OK (THEFT, TAMPER, OFFLINE).
/// @dev Uses the reward-per-share pattern: each deposit raises
///      `rewardPerShare`; a holder is owed balance x (rewardPerShare - the
///      value at their last checkpoint). The token calls
///      `beforeShareBalanceChange` before any balance moves, so the old
///      balance is credited first and transfers never break payouts.
contract RevenueDistributor is AccessControl, ReentrancyGuard, IShareHook {
    using SafeERC20 for IERC20;

    /// @notice Can deposit income.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev rewardPerShare is scaled by this for precision.
    uint256 public constant PRECISION = 1e18;

    /// @notice Why a wallet can't claim right now (NONE = it can).
    enum ClaimBlocker {
        NONE,
        NOTHING_TO_CLAIM,
        METER_NOT_OK,
        NOT_APPROVED,
        FROZEN,
        PAUSED
    }

    IERC20 public immutable usdc;
    SolarShareToken public immutable token;
    MeterOracle public immutable oracle;

    /// @notice USDC (6 decimals) per kWh sold. 200000 = 0.20 USDC/kWh.
    uint256 public tariffUsdcPerKwh;

    uint256 public totalDeposited;
    uint256 public totalClaimed;
    /// @notice USDC earned per share since launch, times PRECISION.
    uint256 public rewardPerShare;

    mapping(address account => uint256) private _checkpoint;
    mapping(address account => uint256) private _owed;
    mapping(address account => uint256) public totalClaimedBy;

    event IncomeDeposited(address indexed by, uint256 amount, uint256 totalDeposited, uint256 rewardPerShare);
    event PayoutClaimed(address indexed account, uint256 amount);
    event TariffSet(uint256 previous, uint256 current);
    event UnclaimedMoved(address indexed from, address indexed to, uint256 amount);

    error DepositExceedsAttestedEnergy(uint256 requested, uint256 remaining);
    error MeterNotOk(MeterOracle.Status status);
    error NothingToClaim();
    error AccountNotApproved(address account);
    error AccountFrozen(address account);
    error SharesPaused();
    error NoSharesIssued();
    error ZeroAmount();
    error ZeroAddress();
    error OnlyToken();

    constructor(address admin, IERC20 usdc_, SolarShareToken token_, MeterOracle oracle_, uint256 tariffUsdcPerKwh_) {
        if (
            admin == address(0) || address(usdc_) == address(0) || address(token_) == address(0)
                || address(oracle_) == address(0)
        ) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        usdc = usdc_;
        token = token_;
        oracle = oracle_;
        tariffUsdcPerKwh = tariffUsdcPerKwh_;
        emit TariffSet(0, tariffUsdcPerKwh_);
    }

    modifier onlyToken() {
        if (msg.sender != address(token)) revert OnlyToken();
        _;
    }

    // ------------------------------------------------------------- operator

    /// @notice Pay in income. Caller must first `usdc.approve(this, amount)`.
    function deposit(uint256 amount) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 supply = token.totalSupply();
        if (supply == 0) revert NoSharesIssued();
        uint256 remaining = remainingDepositAllowance();
        if (amount > remaining) revert DepositExceedsAttestedEnergy(amount, remaining);

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;
        rewardPerShare += (amount * PRECISION) / supply;
        emit IncomeDeposited(msg.sender, amount, totalDeposited, rewardPerShare);
    }

    /// @notice Change the price per kWh. This also changes the deposit cap
    ///         for all energy sold so far, so only the admin can do it.
    function setTariff(uint256 usdcPerKwh) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TariffSet(tariffUsdcPerKwh, usdcPerKwh);
        tariffUsdcPerKwh = usdcPerKwh;
    }

    // -------------------------------------------------------------- holders

    /// @notice Send all your pending USDC to your wallet.
    function claim() external nonReentrant {
        ClaimBlocker blocker = claimBlocker(msg.sender);
        if (blocker == ClaimBlocker.PAUSED) revert SharesPaused();
        if (blocker == ClaimBlocker.FROZEN) revert AccountFrozen(msg.sender);
        if (blocker == ClaimBlocker.NOT_APPROVED) revert AccountNotApproved(msg.sender);
        if (blocker == ClaimBlocker.METER_NOT_OK) revert MeterNotOk(oracle.status());
        if (blocker == ClaimBlocker.NOTHING_TO_CLAIM) revert NothingToClaim();

        _settle(msg.sender);
        uint256 amount = _owed[msg.sender];
        _owed[msg.sender] = 0;
        totalClaimed += amount;
        totalClaimedBy[msg.sender] += amount;
        usdc.safeTransfer(msg.sender, amount);
        emit PayoutClaimed(msg.sender, amount);
    }

    // ---------------------------------------------------------------- reads

    function pendingPayout(address account) public view returns (uint256) {
        return _owed[account] + _accrued(account);
    }

    /// @notice The first reason `account` can't claim, or NONE.
    function claimBlocker(address account) public view returns (ClaimBlocker) {
        if (token.paused()) return ClaimBlocker.PAUSED;
        if (token.isFrozen(account)) return ClaimBlocker.FROZEN;
        if (!token.isApproved(account)) return ClaimBlocker.NOT_APPROVED;
        if (oracle.status() != MeterOracle.Status.OK) return ClaimBlocker.METER_NOT_OK;
        if (pendingPayout(account) == 0) return ClaimBlocker.NOTHING_TO_CLAIM;
        return ClaimBlocker.NONE;
    }

    /// @notice Most income that can ever be deposited: attested kWh sold x tariff.
    function depositCap() public view returns (uint256) {
        return (uint256(oracle.totalSoldWh()) * tariffUsdcPerKwh) / 1000;
    }

    function remainingDepositAllowance() public view returns (uint256) {
        uint256 cap = depositCap();
        return cap > totalDeposited ? cap - totalDeposited : 0;
    }

    // ------------------------------------------------------- token hooks

    /// @inheritdoc IShareHook
    function beforeShareBalanceChange(address from, address to) external onlyToken {
        if (from != address(0)) _settle(from);
        if (to != address(0)) _settle(to);
    }

    /// @inheritdoc IShareHook
    function moveUnclaimed(address from, address to) external onlyToken {
        _settle(from);
        _settle(to);
        uint256 amount = _owed[from];
        _owed[from] = 0;
        _owed[to] += amount;
        emit UnclaimedMoved(from, to, amount);
    }

    // ------------------------------------------------------------- internal

    function _accrued(address account) private view returns (uint256) {
        return (token.balanceOf(account) * (rewardPerShare - _checkpoint[account])) / PRECISION;
    }

    function _settle(address account) private {
        _owed[account] += _accrued(account);
        _checkpoint[account] = rewardPerShare;
    }
}
