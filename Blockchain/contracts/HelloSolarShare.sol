// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HelloSolarShare
/// @notice Toolchain smoke test only. It proves that compiling, deploying and
///         testing work. Delete it once the real SolarShare contracts land.
contract HelloSolarShare {
    string public constant NAME = "SolarShare";

    function greet() external pure returns (string memory) {
        return "Hello from SolarShare";
    }
}
