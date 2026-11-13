// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IShareHook} from "./interfaces/IShareHook.sol";

/// @title SolarShareToken
/// @notice One token = one share of the Block A community solar mini-grid.
///         Whole shares only (0 decimals), at most 3,500 ever exist, and only
///         wallets approved by the KYC officer can hold or move them.
/// @dev Rules live in `_update`, which every mint, transfer and burn goes through.
contract SolarShareToken is ERC20, AccessControl, Pausable {
    /// @notice Can approve, revoke, freeze and unfreeze wallets.
    bytes32 public constant KYC_ROLE = keccak256("KYC_ROLE");
    /// @notice Can create new shares (given to ShareSale).
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Hard cap: the mini-grid is split into exactly 3,500 shares.
    uint256 public constant MAX_SUPPLY = 3_500;

    /// @notice A legal document about the asset, proven by its SHA-256 hash.
    struct AssetDocument {
        string name; // e.g. "SPV_CERTIFICATE"
        bytes32 sha256Hash; // SHA-256 of the file
        string uri; // where to download it, e.g. "ipfs://..."
        uint64 updatedAt; // block time of the last change
    }

    mapping(address account => bool) private _approved;
    mapping(address account => bool) private _frozen;

    AssetDocument[] private _documents;
    mapping(bytes32 nameHash => uint256 indexPlusOne) private _documentIndex;

    /// @notice The RevenueDistributor, told about every balance change.
    IShareHook public distributor;

    /// @dev True only inside `recover`, so shares can leave a frozen wallet.
    bool private _recovering;

    event WalletApproved(address indexed account, address indexed by);
    event WalletRevoked(address indexed account, address indexed by);
    event WalletFrozen(address indexed account, address indexed by);
    event WalletUnfrozen(address indexed account, address indexed by);
    event WalletRecovered(address indexed lost, address indexed newWallet, uint256 amount, address indexed by);
    event DocumentSet(string name, bytes32 sha256Hash, string uri);
    event DistributorSet(address indexed distributor);

    error AccountNotApproved(address account);
    error AccountFrozen(address account);
    error MaxSupplyExceeded(uint256 requested, uint256 remaining);
    error ZeroAddress();
    error SameWallet();
    error EmptyDocument();

    constructor(address admin) ERC20("Block A Solar Share", "SSBA") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Shares are whole: you can't own half a share.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ---------------------------------------------------------------- reads

    function isApproved(address account) public view returns (bool) {
        return _approved[account];
    }

    function isFrozen(address account) public view returns (bool) {
        return _frozen[account];
    }

    function getDocuments() external view returns (AssetDocument[] memory) {
        return _documents;
    }

    function getDocument(string calldata name) external view returns (AssetDocument memory doc) {
        uint256 i = _documentIndex[keccak256(bytes(name))];
        if (i != 0) doc = _documents[i - 1];
    }

    // ------------------------------------------------------------- KYC role

    function approveWallet(address account) external onlyRole(KYC_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _approved[account] = true;
        emit WalletApproved(account, msg.sender);
    }

    function revokeWallet(address account) external onlyRole(KYC_ROLE) {
        _approved[account] = false;
        emit WalletRevoked(account, msg.sender);
    }

    function freeze(address account) external onlyRole(KYC_ROLE) {
        _frozen[account] = true;
        emit WalletFrozen(account, msg.sender);
    }

    function unfreeze(address account) external onlyRole(KYC_ROLE) {
        _frozen[account] = false;
        emit WalletUnfrozen(account, msg.sender);
    }

    // ----------------------------------------------------------- minter role

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // ------------------------------------------------------------ admin role

    /// @notice Moves every share AND every unclaimed payout from a lost or
    ///         frozen wallet to a new approved wallet, then freezes the old one.
    /// @dev Works while paused too: it's an emergency tool.
    function recover(address lost, address newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (lost == address(0) || newWallet == address(0)) revert ZeroAddress();
        if (lost == newWallet) revert SameWallet();
        _requireCanHold(newWallet);

        uint256 amount = balanceOf(lost);
        _recovering = true;
        _transfer(lost, newWallet, amount);
        _recovering = false;

        if (address(distributor) != address(0)) distributor.moveUnclaimed(lost, newWallet);

        if (!_frozen[lost]) {
            _frozen[lost] = true;
            emit WalletFrozen(lost, msg.sender);
        }
        emit WalletRecovered(lost, newWallet, amount, msg.sender);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Adds or replaces an asset document (same name = replace).
    function setDocument(string calldata name, bytes32 sha256Hash, string calldata uri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (bytes(name).length == 0 || sha256Hash == bytes32(0) || bytes(uri).length == 0) revert EmptyDocument();
        bytes32 key = keccak256(bytes(name));
        AssetDocument memory doc = AssetDocument(name, sha256Hash, uri, uint64(block.timestamp));
        uint256 i = _documentIndex[key];
        if (i == 0) {
            _documents.push(doc);
            _documentIndex[key] = _documents.length;
        } else {
            _documents[i - 1] = doc;
        }
        emit DocumentSet(name, sha256Hash, uri);
    }

    function setDistributor(address newDistributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        distributor = IShareHook(newDistributor);
        emit DistributorSet(newDistributor);
    }

    // -------------------------------------------------------------- internal

    /// @dev Every balance change passes through here: mint (from = 0),
    ///      transfer, and recovery.
    function _update(address from, address to, uint256 value) internal override {
        if (!_recovering) {
            _requireNotPaused();
            if (from != address(0)) _requireCanHold(from);
        }
        if (to != address(0)) _requireCanHold(to);

        if (from == address(0)) {
            uint256 remaining = MAX_SUPPLY - totalSupply();
            if (value > remaining) revert MaxSupplyExceeded(value, remaining);
        }

        // Let the distributor settle payouts at the OLD balances first.
        if (address(distributor) != address(0)) distributor.beforeShareBalanceChange(from, to);

        super._update(from, to, value);
    }

    function _requireCanHold(address account) private view {
        if (_frozen[account]) revert AccountFrozen(account);
        if (!_approved[account]) revert AccountNotApproved(account);
    }
}
