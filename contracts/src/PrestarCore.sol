// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PrestarCore
 * @notice Mutual-credit ledger (PRt) plus a reserve-backed 1:1 ARGt on/off-ramp.
 *
 * PRt is NOT an ERC-20. Balances are signed cents (2 decimals) kept inside this
 * contract. The sum of every member balance plus the system reserve account is
 * always zero. ARGt (18 decimals) is the only token this contract custodies.
 *
 * 1 PRt (100 cents) = 1 ARGt (1e18 raw), therefore 1 cent = 1e16 raw ARGt.
 *
 * This contract has not been audited and is not production-ready. See
 * docs/prestar-producto-v0.2.md for open legal/co-owner questions.
 */
contract PrestarCore is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant BROKER_ROLE = keccak256("BROKER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint8 public constant PRT_DECIMALS = 2;
    uint256 public constant ARGT_RAW_PER_PRT_CENT = 10 ** 16;

    /// @notice System ledger account that mirrors member PRt movements. Not a wallet.
    address public constant RESERVE_ACCOUNT = address(0x000000000000000000000000000000000000dEaD);

    enum Status {
        None,
        Active,
        Suspended
    }

    struct Member {
        Status status;
        int256 balanceCents;
        uint128 creditLimitCents;
        uint128 maxPositiveCents;
    }

    struct Caps {
        uint128 maxPaymentCents;
        uint128 maxOnrampCents;
        uint128 maxOfframpCents;
        uint128 maxCreditLimitCents;
        uint128 maxPositiveCents;
    }

    IERC20 public immutable argt;
    Caps public caps;

    mapping(address => Member) private _members;
    address[] private _memberAccounts;

    event MemberAdded(address indexed member, uint128 creditLimitCents, uint128 maxPositiveCents);
    event MemberStatusChanged(address indexed member, Status status);
    event LimitsUpdated(address indexed member, uint128 creditLimitCents, uint128 maxPositiveCents);
    event Payment(address indexed from, address indexed to, uint256 amountCents);
    event Onramp(address indexed member, uint256 amountCents, uint256 argtRaw);
    event Offramp(address indexed member, uint256 amountCents, uint256 argtRaw);
    event ReserveUpdated(int256 balanceCents);
    event CapsUpdated(
        uint128 maxPaymentCents,
        uint128 maxOnrampCents,
        uint128 maxOfframpCents,
        uint128 maxCreditLimitCents,
        uint128 maxPositiveCents
    );

    constructor(
        IERC20 argt_,
        address admin,
        address broker,
        address guardian,
        Caps memory initialCaps
    ) {
        require(address(argt_) != address(0), "argt=0");
        require(admin != address(0), "admin=0");
        require(broker != address(0), "broker=0");
        require(guardian != address(0), "guardian=0");
        _validateCaps(initialCaps);

        argt = argt_;
        caps = initialCaps;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BROKER_ROLE, broker);
        _grantRole(GUARDIAN_ROLE, guardian);

        emit CapsUpdated(
            initialCaps.maxPaymentCents,
            initialCaps.maxOnrampCents,
            initialCaps.maxOfframpCents,
            initialCaps.maxCreditLimitCents,
            initialCaps.maxPositiveCents
        );
    }

    // ---------------------------------------------------------------------
    // Admin / broker
    // ---------------------------------------------------------------------

    function addMember(
        address member,
        uint128 creditLimitCents,
        uint128 maxPositiveCents
    ) external onlyRole(BROKER_ROLE) {
        require(member != address(0), "member=0");
        require(member != address(this), "member=contract");
        require(member != RESERVE_ACCOUNT, "member=reserve");
        require(_members[member].status == Status.None, "member exists");
        _validateMemberLimits(creditLimitCents, maxPositiveCents);

        _members[member] = Member({
            status: Status.Active,
            balanceCents: 0,
            creditLimitCents: creditLimitCents,
            maxPositiveCents: maxPositiveCents
        });
        _memberAccounts.push(member);

        emit MemberAdded(member, creditLimitCents, maxPositiveCents);
        emit MemberStatusChanged(member, Status.Active);
    }

    function setLimits(
        address member,
        uint128 creditLimitCents,
        uint128 maxPositiveCents
    ) external onlyRole(BROKER_ROLE) {
        require(_members[member].status != Status.None, "unknown member");
        _validateMemberLimits(creditLimitCents, maxPositiveCents);

        _members[member].creditLimitCents = creditLimitCents;
        _members[member].maxPositiveCents = maxPositiveCents;

        emit LimitsUpdated(member, creditLimitCents, maxPositiveCents);
    }

    function setMemberStatus(address member, Status status) external onlyRole(BROKER_ROLE) {
        require(status == Status.Active || status == Status.Suspended, "bad status");
        require(_members[member].status != Status.None, "unknown member");
        _members[member].status = status;
        emit MemberStatusChanged(member, status);
    }

    function setCaps(Caps memory newCaps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _validateCaps(newCaps);
        caps = newCaps;
        emit CapsUpdated(
            newCaps.maxPaymentCents,
            newCaps.maxOnrampCents,
            newCaps.maxOfframpCents,
            newCaps.maxCreditLimitCents,
            newCaps.maxPositiveCents
        );
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Member flows
    // ---------------------------------------------------------------------

    function pay(address to, uint256 amountCents) external nonReentrant whenNotPaused {
        _requireAmount(amountCents);
        require(amountCents <= caps.maxPaymentCents, "cap: payment");
        require(to != msg.sender, "self pay");
        require(to != address(0), "to=0");
        require(to != address(this), "to=contract");
        require(to != RESERVE_ACCOUNT, "to=reserve");

        Member storage fromMember = _members[msg.sender];
        Member storage toMember = _members[to];
        require(fromMember.status == Status.Active, "member inactive");
        require(toMember.status == Status.Active, "member inactive");

        int256 amount = int256(amountCents);
        int256 newFrom = fromMember.balanceCents - amount;
        int256 newTo = toMember.balanceCents + amount;

        require(newFrom >= -int256(uint256(fromMember.creditLimitCents)), "credit limit");
        require(newTo <= int256(uint256(toMember.maxPositiveCents)), "max positive");

        fromMember.balanceCents = newFrom;
        toMember.balanceCents = newTo;

        emit Payment(msg.sender, to, amountCents);
    }

    function onramp(uint256 amountCents) external nonReentrant whenNotPaused {
        _requireAmount(amountCents);
        require(amountCents <= caps.maxOnrampCents, "cap: onramp");

        Member storage member = _members[msg.sender];
        require(member.status == Status.Active, "member inactive");

        int256 amount = int256(amountCents);
        int256 newBalance = member.balanceCents + amount;
        require(newBalance <= int256(uint256(member.maxPositiveCents)), "max positive");

        uint256 argtRaw = amountCents * ARGT_RAW_PER_PRT_CENT;
        uint256 beforeBalance = argt.balanceOf(address(this));
        argt.safeTransferFrom(msg.sender, address(this), argtRaw);
        require(argt.balanceOf(address(this)) - beforeBalance == argtRaw, "fee-on-transfer");

        member.balanceCents = newBalance;
        Member storage reserve = _members[RESERVE_ACCOUNT];
        reserve.balanceCents -= amount;
        emit ReserveUpdated(reserve.balanceCents);
        emit Onramp(msg.sender, amountCents, argtRaw);
    }

    function offramp(uint256 amountCents) external nonReentrant whenNotPaused {
        _requireAmount(amountCents);
        require(amountCents <= caps.maxOfframpCents, "cap: offramp");

        Member storage member = _members[msg.sender];
        require(member.status == Status.Active, "member inactive");

        int256 amount = int256(amountCents);
        require(member.balanceCents >= amount, "insufficient PRt");

        uint256 argtRaw = amountCents * ARGT_RAW_PER_PRT_CENT;
        require(argt.balanceOf(address(this)) >= argtRaw, "reserve insufficient");

        member.balanceCents -= amount;
        Member storage reserve = _members[RESERVE_ACCOUNT];
        reserve.balanceCents += amount;
        emit ReserveUpdated(reserve.balanceCents);

        uint256 contractBefore = argt.balanceOf(address(this));
        uint256 recipientBefore = argt.balanceOf(msg.sender);
        argt.safeTransfer(msg.sender, argtRaw);
        require(contractBefore - argt.balanceOf(address(this)) == argtRaw, "fee-on-transfer");
        require(argt.balanceOf(msg.sender) - recipientBefore == argtRaw, "fee-on-transfer");

        emit Offramp(msg.sender, amountCents, argtRaw);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function balanceOfMember(address account) external view returns (int256) {
        return _members[account].balanceCents;
    }

    function memberInfo(
        address account
    )
        external
        view
        returns (uint8 status, int256 balanceCents, uint128 creditLimitCents, uint128 maxPositiveCents)
    {
        Member storage member = _members[account];
        return (
            uint8(member.status),
            member.balanceCents,
            member.creditLimitCents,
            member.maxPositiveCents
        );
    }

    function reserveBalanceCents() external view returns (int256) {
        return _members[RESERVE_ACCOUNT].balanceCents;
    }

    function netIssuedCents() external view returns (uint256) {
        int256 reserve = _members[RESERVE_ACCOUNT].balanceCents;
        return reserve < 0 ? uint256(-reserve) : 0;
    }

    function argtReserveRaw() external view returns (uint256) {
        return argt.balanceOf(address(this));
    }

    function memberCount() external view returns (uint256) {
        return _memberAccounts.length;
    }

    function memberAt(uint256 index) external view returns (address) {
        return _memberAccounts[index];
    }

    function sumBalances() external view returns (int256 sum) {
        sum = _members[RESERVE_ACCOUNT].balanceCents;
        uint256 length = _memberAccounts.length;
        for (uint256 i = 0; i < length; i++) {
            sum += _members[_memberAccounts[i]].balanceCents;
        }
    }

    function prtToArgt(uint256 amountCents) external pure returns (uint256) {
        return amountCents * ARGT_RAW_PER_PRT_CENT;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _requireAmount(uint256 amountCents) internal pure {
        require(amountCents > 0, "amount=0");
        require(amountCents <= type(uint128).max, "amount too large");
    }

    function _validateCaps(Caps memory value) internal pure {
        require(value.maxPaymentCents > 0, "cap payment=0");
        require(value.maxOnrampCents > 0, "cap onramp=0");
        require(value.maxOfframpCents > 0, "cap offramp=0");
        require(value.maxCreditLimitCents > 0, "cap credit=0");
        require(value.maxPositiveCents > 0, "cap positive=0");
    }

    function _validateMemberLimits(uint128 creditLimitCents, uint128 maxPositiveCents) internal view {
        require(creditLimitCents <= caps.maxCreditLimitCents, "credit over cap");
        require(maxPositiveCents <= caps.maxPositiveCents, "positive over cap");
    }
}
