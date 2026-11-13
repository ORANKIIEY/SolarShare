// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title MeterOracle
/// @notice Accepts readings signed by the solar meter (an ESP32 with its own
///         secp256k1 key) and turns them into a status: OK, THEFT, TAMPER or
///         OFFLINE. Anyone can relay a reading; only the meter's signature counts.
/// @dev The signed message is EIP-712 typed data, exactly as in the issue #4
///      spike. The device sends (r, s) with low s; the relayer tries v = 27 and
///      v = 28 off-chain and submits the one that recovers `deviceSigner`.
contract MeterOracle is EIP712, AccessControl {
    /// @notice Can tune the theft threshold and the offline timeout.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice The system is rated 10 kW; anything above is not a real reading.
    uint32 public constant MAX_POWER_W = 10_000;
    /// @notice How far ahead of the chain's clock a device clock may be.
    uint64 public constant MAX_FUTURE_DRIFT = 5 minutes;

    bytes32 public constant METER_READING_TYPEHASH = keccak256(
        "MeterReading(uint32 meterId,uint64 seq,uint64 timestamp,uint64 energyProducedWh,uint64 energySoldWh,uint32 powerW,bool tamper)"
    );

    enum Status {
        OK,
        THEFT,
        TAMPER,
        OFFLINE
    }

    /// @notice Energy totals are cumulative since the meter was installed.
    struct MeterReading {
        uint32 meterId;
        uint64 seq;
        uint64 timestamp;
        uint64 energyProducedWh;
        uint64 energySoldWh;
        uint32 powerW;
        bool tamper;
    }

    /// @notice Everything a dashboard needs in one call.
    struct MeterState {
        Status status;
        uint32 meterId;
        address deviceSigner;
        uint64 lastSeq;
        uint64 lastTimestamp;
        uint64 totalProducedWh;
        uint64 totalSoldWh;
        uint32 lastPowerW;
        uint16 lastGapBps;
        bool theftActive;
        bool tamperActive;
        bool offline;
        uint16 theftGapBps;
        uint64 offlineTimeout;
    }

    uint32 public meterId;
    address public deviceSigner;

    MeterReading private _latest;
    bool public theftActive;
    bool public tamperActive;
    /// @notice How far sold was below produced in the last reading, in basis points.
    uint16 public lastGapBps;

    /// @notice THEFT when sold is more than this many bps below produced. 1500 = 15%.
    uint16 public theftGapBps = 1500;
    /// @notice OFFLINE when the last reading is older than this many seconds.
    uint64 public offlineTimeout = 600;
    /// @notice Readings older than this many seconds are rejected.
    uint64 public maxReadingAge = 1 hours;

    event ReadingAccepted(
        uint32 indexed meterId,
        uint64 indexed seq,
        uint64 timestamp,
        uint64 energyProducedWh,
        uint64 energySoldWh,
        uint32 powerW,
        bool tamper,
        uint16 gapBps
    );
    event StatusChanged(Status previous, Status current);
    event TheftDetected(uint32 indexed meterId, uint64 indexed seq, uint64 deltaProducedWh, uint64 deltaSoldWh, uint16 gapBps);
    event TamperDetected(uint32 indexed meterId, uint64 indexed seq);
    event TamperCleared(address indexed by);
    event DeviceSet(uint32 indexed meterId, address indexed signer);
    event TheftGapSet(uint16 bps);
    event OfflineTimeoutSet(uint64 seconds_);
    event MaxReadingAgeSet(uint64 seconds_);

    error DeviceNotSet();
    error WrongMeter(uint32 got, uint32 expected);
    error InvalidSigner(address recovered);
    error SeqNotIncreasing(uint64 seq, uint64 lastSeq);
    error EnergyWentDown();
    error TimestampTooOld(uint64 timestamp, uint256 oldestAllowed);
    error TimestampInFuture(uint64 timestamp, uint256 latestAllowed);
    error PowerTooHigh(uint32 powerW, uint32 max);
    error InvalidSetting();
    error ZeroAddress();

    constructor(address admin, uint32 meterId_, address deviceSigner_) EIP712("SolarShare MeterOracle", "1") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        meterId = meterId_;
        deviceSigner = deviceSigner_;
        if (deviceSigner_ != address(0)) emit DeviceSet(meterId_, deviceSigner_);
    }

    // ---------------------------------------------------------------- write

    /// @notice Submit one signed reading. Anyone may call this (the relayer does).
    function submitReading(MeterReading calldata reading, uint8 v, bytes32 r, bytes32 s) external {
        if (deviceSigner == address(0)) revert DeviceNotSet();
        if (reading.meterId != meterId) revert WrongMeter(reading.meterId, meterId);

        address recovered = ECDSA.recover(readingDigest(reading), v, r, s);
        if (recovered != deviceSigner) revert InvalidSigner(recovered);

        MeterReading memory prev = _latest;
        _checkReading(reading, prev);
        _record(reading, prev);
    }

    function _checkReading(MeterReading calldata reading, MeterReading memory prev) private view {
        if (reading.seq <= prev.seq) revert SeqNotIncreasing(reading.seq, prev.seq);

        uint256 oldest = block.timestamp > maxReadingAge ? block.timestamp - maxReadingAge : 0;
        if (prev.timestamp > oldest) oldest = prev.timestamp;
        if (reading.timestamp < oldest) revert TimestampTooOld(reading.timestamp, oldest);
        uint256 latest = block.timestamp + MAX_FUTURE_DRIFT;
        if (reading.timestamp > latest) revert TimestampInFuture(reading.timestamp, latest);

        if (reading.energyProducedWh < prev.energyProducedWh || reading.energySoldWh < prev.energySoldWh) {
            revert EnergyWentDown();
        }
        if (reading.powerW > MAX_POWER_W) revert PowerTooHigh(reading.powerW, MAX_POWER_W);
    }

    function _record(MeterReading calldata reading, MeterReading memory prev) private {
        Status before = status();

        // Theft is judged on the change since the previous reading, so it
        // clears by itself once the gap is back to normal.
        uint64 deltaProduced = reading.energyProducedWh - prev.energyProducedWh;
        uint64 deltaSold = reading.energySoldWh - prev.energySoldWh;
        uint16 gap = gapBps(deltaProduced, deltaSold);
        bool theft = gap > theftGapBps;

        _latest = reading;
        lastGapBps = gap;
        theftActive = theft;

        _emitAccepted(reading, gap);
        if (theft) emit TheftDetected(reading.meterId, reading.seq, deltaProduced, deltaSold, gap);
        if (reading.tamper && !tamperActive) {
            tamperActive = true;
            emit TamperDetected(reading.meterId, reading.seq);
        }

        _emitIfChanged(before);
    }

    function _emitAccepted(MeterReading calldata reading, uint16 gap) private {
        emit ReadingAccepted(
            reading.meterId,
            reading.seq,
            reading.timestamp,
            reading.energyProducedWh,
            reading.energySoldWh,
            reading.powerW,
            reading.tamper,
            gap
        );
    }

    // ---------------------------------------------------------------- admin

    /// @notice Register or replace the meter. The counters carry on, so a
    ///         replacement device must continue from the current seq and totals.
    function setDevice(uint32 meterId_, address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (signer == address(0)) revert ZeroAddress();
        meterId = meterId_;
        deviceSigner = signer;
        emit DeviceSet(meterId_, signer);
    }

    /// @notice Clear TAMPER after someone has inspected the meter.
    function clearTamper() external onlyRole(DEFAULT_ADMIN_ROLE) {
        Status before = status();
        tamperActive = false;
        emit TamperCleared(msg.sender);
        _emitIfChanged(before);
    }

    function setTheftGapBps(uint16 bps) external onlyRole(OPERATOR_ROLE) {
        if (bps > 10_000) revert InvalidSetting();
        theftGapBps = bps;
        emit TheftGapSet(bps);
    }

    function setOfflineTimeout(uint64 seconds_) external onlyRole(OPERATOR_ROLE) {
        if (seconds_ == 0) revert InvalidSetting();
        offlineTimeout = seconds_;
        emit OfflineTimeoutSet(seconds_);
    }

    function setMaxReadingAge(uint64 seconds_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (seconds_ == 0) revert InvalidSetting();
        maxReadingAge = seconds_;
        emit MaxReadingAgeSet(seconds_);
    }

    // ---------------------------------------------------------------- reads

    /// @notice TAMPER beats THEFT beats OFFLINE beats OK.
    function status() public view returns (Status) {
        if (tamperActive) return Status.TAMPER;
        if (theftActive) return Status.THEFT;
        if (isOffline()) return Status.OFFLINE;
        return Status.OK;
    }

    /// @notice OFFLINE is worked out at read time: no reading yet, or the
    ///         last one is older than `offlineTimeout`.
    function isOffline() public view returns (bool) {
        return _latest.seq == 0 || block.timestamp > uint256(_latest.timestamp) + offlineTimeout;
    }

    function latestReading() external view returns (MeterReading memory) {
        return _latest;
    }

    function lastSeq() external view returns (uint64) {
        return _latest.seq;
    }

    /// @notice Total energy produced, as attested by the meter (Wh).
    function totalProducedWh() external view returns (uint64) {
        return _latest.energyProducedWh;
    }

    /// @notice Total energy sold to neighbours, as attested by the meter (Wh).
    function totalSoldWh() external view returns (uint64) {
        return _latest.energySoldWh;
    }

    function getMeterState() external view returns (MeterState memory) {
        return MeterState({
            status: status(),
            meterId: meterId,
            deviceSigner: deviceSigner,
            lastSeq: _latest.seq,
            lastTimestamp: _latest.timestamp,
            totalProducedWh: _latest.energyProducedWh,
            totalSoldWh: _latest.energySoldWh,
            lastPowerW: _latest.powerW,
            lastGapBps: lastGapBps,
            theftActive: theftActive,
            tamperActive: tamperActive,
            offline: isOffline(),
            theftGapBps: theftGapBps,
            offlineTimeout: offlineTimeout
        });
    }

    /// @notice The EIP-712 digest the device signs. Handy for the relayer.
    function readingDigest(MeterReading calldata reading) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    METER_READING_TYPEHASH,
                    reading.meterId,
                    reading.seq,
                    reading.timestamp,
                    reading.energyProducedWh,
                    reading.energySoldWh,
                    reading.powerW,
                    reading.tamper
                )
            )
        );
    }

    /// @notice How far `sold` is below `produced`, in basis points (0 if not below).
    function gapBps(uint64 produced, uint64 sold) public pure returns (uint16) {
        if (produced == 0 || sold >= produced) return 0;
        return uint16((uint256(produced - sold) * 10_000) / produced);
    }

    function _emitIfChanged(Status before) private {
        Status current = status();
        if (current != before) emit StatusChanged(before, current);
    }
}
