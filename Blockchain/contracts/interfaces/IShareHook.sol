// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IShareHook
/// @notice Called by SolarShareToken so the RevenueDistributor can keep
///         payouts correct when shares are minted, moved or recovered.
interface IShareHook {
    /// @notice Called BEFORE any balance changes (mint, transfer, recovery).
    ///         `from` is address(0) for a mint.
    function beforeShareBalanceChange(address from, address to) external;

    /// @notice Called during an admin recovery, after the shares moved:
    ///         unclaimed payouts follow the shares to the new wallet.
    function moveUnclaimed(address from, address to) external;
}
