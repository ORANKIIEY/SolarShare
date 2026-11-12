// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title SpikeSignatureCheck
/// @notice Spike only (issue #4). Shows that Solidity rebuilds the same
///         EIP-712 digest as the ESP32 and recovers the device address from
///         its signature. The real MeterOracle (issue #7) replaces this.
/// @dev Uses the spike's FIXED PLACEHOLDER verifyingContract, not address(this).
contract SpikeSignatureCheck {
    struct MeterReading {
        uint32 meterId;
        uint64 seq;
        uint64 timestamp;
        uint64 energyProducedWh;
        uint64 energySoldWh;
        uint32 powerW;
        bool tamper;
    }

    address public constant SPIKE_VERIFYING_CONTRACT = 0x1111111111111111111111111111111111111111;

    bytes32 public constant METER_READING_TYPEHASH = keccak256(
        "MeterReading(uint32 meterId,uint64 seq,uint64 timestamp,uint64 energyProducedWh,uint64 energySoldWh,uint32 powerW,bool tamper)"
    );

    function domainSeparator() public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("SolarShare MeterOracle")),
                keccak256(bytes("1")),
                uint256(84532),
                SPIKE_VERIFYING_CONTRACT
            )
        );
    }

    function digest(MeterReading calldata r) public pure returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                METER_READING_TYPEHASH,
                r.meterId,
                r.seq,
                r.timestamp,
                r.energyProducedWh,
                r.energySoldWh,
                r.powerW,
                r.tamper
            )
        );
        return keccak256(abi.encodePacked(hex"1901", domainSeparator(), structHash));
    }

    /// @notice Recovers the signer. Reverts on high-s or otherwise invalid signatures.
    function recoverSigner(MeterReading calldata r, uint8 v, bytes32 sigR, bytes32 sigS)
        external
        pure
        returns (address)
    {
        return ECDSA.recover(digest(r), v, sigR, sigS);
    }
}
