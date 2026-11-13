// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice FAKE USDC for local tests only. Anyone can mint any amount.
///         Never deploy this to a public network: on Base Sepolia we use
///         Circle's test USDC at 0x036CbD53842c5426634e7929541eC2318f3dCF7e.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC (test only)", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
