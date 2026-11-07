// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {PrestarCore} from "../src/PrestarCore.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract PrestarCoreTest is Test {
    uint128 internal constant MAX_PAYMENT = 100_000;
    uint128 internal constant MAX_ONRAMP = 1_000_000;
    uint128 internal constant MAX_OFFRAMP = 1_000_000;
    uint128 internal constant MAX_CREDIT = 50_000;
    uint128 internal constant MAX_POSITIVE = 500_000;

    uint128 internal constant ALICE_CREDIT = 10_000;
    uint128 internal constant BOB_CREDIT = 5_000;
    uint128 internal constant MEMBER_POSITIVE = 100_000;

    PrestarCore internal core;
    MockERC20 internal argt;

    address internal admin;
    address internal broker;
    address internal guardian;
    address internal alice;
    address internal bob;
    address internal carol;

    function setUp() public {
        admin = makeAddr("admin");
        broker = makeAddr("broker");
        guardian = makeAddr("guardian");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");

        argt = new MockERC20("Argentine Token", "ARGt", 18);
        core = _deployCore(argt);

        vm.startPrank(broker);
        core.addMember(alice, ALICE_CREDIT, MEMBER_POSITIVE);
        core.addMember(bob, BOB_CREDIT, MEMBER_POSITIVE);
        vm.stopPrank();

        argt.mint(alice, 2_000_000e18);
        argt.mint(bob, 2_000_000e18);
    }

    // ------------------------------------------------------------------
    // Setup helpers
    // ------------------------------------------------------------------

    function _caps() internal pure returns (PrestarCore.Caps memory) {
        return PrestarCore.Caps({
            maxPaymentCents: MAX_PAYMENT,
            maxOnrampCents: MAX_ONRAMP,
            maxOfframpCents: MAX_OFFRAMP,
            maxCreditLimitCents: MAX_CREDIT,
            maxPositiveCents: MAX_POSITIVE
        });
    }

    function _deployCore(MockERC20 token) internal returns (PrestarCore) {
        return new PrestarCore(IERC20(address(token)), admin, broker, guardian, _caps());
    }

    function _deposit(address who, uint256 cents) internal {
        uint256 raw = cents * core.ARGT_RAW_PER_PRT_CENT();
        vm.startPrank(who);
        argt.approve(address(core), raw);
        core.onramp(cents);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Construction / membership
    // ------------------------------------------------------------------

    function testInitialConfig() public view {
        assertEq(address(core.argt()), address(argt));
        assertEq(core.PRT_DECIMALS(), 2);
        assertEq(core.ARGT_RAW_PER_PRT_CENT(), 1e16);
        assertEq(core.memberCount(), 2);
        assertEq(core.memberAt(0), alice);
        assertEq(core.memberAt(1), bob);
        assertEq(core.sumBalances(), 0);
        assertEq(core.reserveBalanceCents(), 0);
        assertEq(core.netIssuedCents(), 0);
    }

    function testAddMemberOnlyBroker() public {
        vm.prank(alice);
        vm.expectRevert();
        core.addMember(carol, 1_000, 10_000);
    }

    function testAddMemberRejectsDuplicateAndZero() public {
        address reserve = core.RESERVE_ACCOUNT();
        vm.startPrank(broker);
        vm.expectRevert(bytes("member exists"));
        core.addMember(alice, 1_000, 10_000);

        vm.expectRevert(bytes("member=0"));
        core.addMember(address(0), 1_000, 10_000);

        vm.expectRevert(bytes("member=reserve"));
        core.addMember(reserve, 1_000, 10_000);
        vm.stopPrank();
    }

    function testAddMemberRespectsGlobalCaps() public {
        vm.startPrank(broker);
        vm.expectRevert(bytes("credit over cap"));
        core.addMember(carol, MAX_CREDIT + 1, MEMBER_POSITIVE);

        vm.expectRevert(bytes("positive over cap"));
        core.addMember(carol, 1_000, MAX_POSITIVE + 1);
        vm.stopPrank();
    }

    function testSetLimitsAndSuspend() public {
        vm.startPrank(broker);
        core.setLimits(alice, 20_000, 150_000);
        (uint8 status, int256 balance, uint128 credit, uint128 positive) = core.memberInfo(alice);
        assertEq(status, uint8(PrestarCore.Status.Active));
        assertEq(balance, 0);
        assertEq(credit, 20_000);
        assertEq(positive, 150_000);

        core.setMemberStatus(alice, PrestarCore.Status.Suspended);
        vm.stopPrank();

        (status, balance, credit, positive) = core.memberInfo(alice);
        assertEq(status, uint8(PrestarCore.Status.Suspended));
    }

    // ------------------------------------------------------------------
    // pay
    // ------------------------------------------------------------------

    function testPayMovesBalanceAndKeepsZeroSum() public {
        vm.prank(bob);
        core.pay(alice, 1_500);

        assertEq(core.balanceOfMember(bob), -1_500);
        assertEq(core.balanceOfMember(alice), 1_500);
        assertEq(core.sumBalances(), 0);
        assertEq(core.reserveBalanceCents(), 0);
    }

    function testPayRejectsOverCreditLimit() public {
        vm.prank(bob);
        vm.expectRevert(bytes("credit limit"));
        core.pay(alice, uint256(BOB_CREDIT) + 1);
    }

    function testPayRejectsOverMaxPositive() public {
        vm.prank(broker);
        core.setLimits(alice, ALICE_CREDIT, 2_000);

        vm.prank(bob);
        vm.expectRevert(bytes("max positive"));
        core.pay(alice, 2_001);
    }

    function testPayRejectsSelfZeroContractAndReserve() public {
        address reserve = core.RESERVE_ACCOUNT();
        vm.startPrank(alice);
        vm.expectRevert(bytes("self pay"));
        core.pay(alice, 1);

        vm.expectRevert(bytes("to=0"));
        core.pay(address(0), 1);

        vm.expectRevert(bytes("to=contract"));
        core.pay(address(core), 1);

        vm.expectRevert(bytes("to=reserve"));
        core.pay(reserve, 1);
        vm.stopPrank();
    }

    function testPayRejectsInactiveMembers() public {
        vm.prank(broker);
        core.setMemberStatus(bob, PrestarCore.Status.Suspended);

        vm.prank(bob);
        vm.expectRevert(bytes("member inactive"));
        core.pay(alice, 1);

        vm.startPrank(broker);
        core.setMemberStatus(bob, PrestarCore.Status.Active);
        core.setMemberStatus(alice, PrestarCore.Status.Suspended);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(bytes("member inactive"));
        core.pay(alice, 1);
    }

    function testPayRejectsZeroAndAboveCap() public {
        vm.startPrank(alice);
        vm.expectRevert(bytes("amount=0"));
        core.pay(bob, 0);

        vm.expectRevert(bytes("cap: payment"));
        core.pay(bob, uint256(MAX_PAYMENT) + 1);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // onramp
    // ------------------------------------------------------------------

    function testOnrampCreditsCentsAndCustodiesExactArgt() public {
        uint256 cents = 10_000;
        uint256 raw = cents * 1e16;

        uint256 aliceArgtBefore = argt.balanceOf(alice);
        uint256 contractBefore = argt.balanceOf(address(core));

        _deposit(alice, cents);

        assertEq(core.balanceOfMember(alice), int256(cents));
        assertEq(core.reserveBalanceCents(), -int256(cents));
        assertEq(core.netIssuedCents(), cents);
        assertEq(argt.balanceOf(alice), aliceArgtBefore - raw);
        assertEq(argt.balanceOf(address(core)), contractBefore + raw);
        assertEq(core.argtReserveRaw(), raw);
        assertEq(core.sumBalances(), 0);
    }

    function testOnrampRequiresAllowance() public {
        vm.prank(alice);
        vm.expectRevert();
        core.onramp(100);
    }

    function testOnrampRespectsMaxPositive() public {
        _deposit(alice, MEMBER_POSITIVE);
        vm.startPrank(alice);
        argt.approve(address(core), 1e18);
        vm.expectRevert(bytes("max positive"));
        core.onramp(1);
        vm.stopPrank();
    }

    function testOnrampRejectsInactiveAndCaps() public {
        vm.prank(broker);
        core.setMemberStatus(alice, PrestarCore.Status.Suspended);

        vm.startPrank(alice);
        argt.approve(address(core), type(uint256).max);
        vm.expectRevert(bytes("member inactive"));
        core.onramp(1);
        vm.stopPrank();

        vm.prank(broker);
        core.setMemberStatus(alice, PrestarCore.Status.Active);

        vm.startPrank(alice);
        argt.approve(address(core), type(uint256).max);
        vm.expectRevert(bytes("cap: onramp"));
        core.onramp(uint256(MAX_ONRAMP) + 1);
        vm.stopPrank();
    }

    function testOnrampRejectsFeeOnTransfer() public {
        MockERC20 feeToken = new MockERC20("Fee ARGt", "ARGt", 18);
        PrestarCore feeCore = _deployCore(feeToken);

        vm.prank(broker);
        feeCore.addMember(alice, ALICE_CREDIT, MEMBER_POSITIVE);

        feeToken.mint(alice, 1_000e18);
        feeToken.setFee(100, makeAddr("feeCollector"));

        vm.startPrank(alice);
        feeToken.approve(address(feeCore), 1_000e18);
        vm.expectRevert(bytes("fee-on-transfer"));
        feeCore.onramp(1_000);
        vm.stopPrank();

        assertEq(feeCore.balanceOfMember(alice), 0);
        assertEq(feeToken.balanceOf(address(feeCore)), 0);
    }

    // ------------------------------------------------------------------
    // offramp
    // ------------------------------------------------------------------

    function testOfframpDebitsCentsAndReturnsExactArgt() public {
        _deposit(alice, 10_000);

        uint256 cents = 4_000;
        uint256 raw = cents * 1e16;
        uint256 aliceBefore = argt.balanceOf(alice);

        vm.prank(alice);
        core.offramp(cents);

        assertEq(core.balanceOfMember(alice), 6_000);
        assertEq(core.reserveBalanceCents(), -6_000);
        assertEq(argt.balanceOf(alice), aliceBefore + raw);
        assertEq(core.argtReserveRaw(), 6_000 * 1e16);
        assertEq(core.sumBalances(), 0);
    }

    function testOfframpRequiresPositivePrt() public {
        vm.prank(alice);
        vm.expectRevert(bytes("insufficient PRt"));
        core.offramp(1);
    }

    function testOfframpBlockedWhenReserveHasNoArgt() public {
        // Bob pays Alice with credit, so Alice owns PRt that is not backed by ARGt yet.
        vm.prank(bob);
        core.pay(alice, 1_000);

        assertEq(core.balanceOfMember(alice), 1_000);
        assertEq(core.argtReserveRaw(), 0);

        vm.prank(alice);
        vm.expectRevert(bytes("reserve insufficient"));
        core.offramp(1_000);
    }

    function testOfframpRejectsFeeOnTransfer() public {
        MockERC20 feeToken = new MockERC20("Fee ARGt", "ARGt", 18);
        PrestarCore feeCore = _deployCore(feeToken);

        vm.prank(broker);
        feeCore.addMember(alice, ALICE_CREDIT, MEMBER_POSITIVE);

        feeToken.mint(alice, 2_000e18);
        vm.startPrank(alice);
        feeToken.approve(address(feeCore), type(uint256).max);
        feeCore.onramp(1_000);
        vm.stopPrank();

        feeToken.setFee(100, makeAddr("feeCollector"));

        vm.prank(alice);
        vm.expectRevert(bytes("fee-on-transfer"));
        feeCore.offramp(1_000);
    }

    function testOfframpRespectsCap() public {
        _deposit(alice, 500);
        vm.prank(alice);
        vm.expectRevert(bytes("cap: offramp"));
        core.offramp(uint256(MAX_OFFRAMP) + 1);
    }

    // ------------------------------------------------------------------
    // Pause / caps / roles
    // ------------------------------------------------------------------

    function testGuardianPausesAndAdminUnpauses() public {
        vm.prank(guardian);
        core.pause();
        assertTrue(core.paused());

        vm.startPrank(alice);
        vm.expectRevert();
        core.pay(bob, 1);
        vm.stopPrank();

        vm.prank(admin);
        core.unpause();
        assertFalse(core.paused());

        vm.prank(alice);
        core.pay(bob, 1);
        assertEq(core.balanceOfMember(bob), 1);
    }

    function testOnlyGuardianCanPause() public {
        vm.prank(admin);
        vm.expectRevert();
        core.pause();
    }

    function testOnlyAdminCanUnpause() public {
        vm.prank(guardian);
        core.pause();

        vm.prank(guardian);
        vm.expectRevert();
        core.unpause();
    }

    function testOnlyAdminCanSetCaps() public {
        vm.prank(guardian);
        vm.expectRevert();
        core.setCaps(_caps());
    }

    function testCapsUpdateIsEnforced() public {
        PrestarCore.Caps memory updated = _caps();
        updated.maxPaymentCents = 1_000;

        vm.prank(admin);
        core.setCaps(updated);

        vm.prank(alice);
        vm.expectRevert(bytes("cap: payment"));
        core.pay(bob, 1_001);

        vm.prank(alice);
        core.pay(bob, 1_000);
        assertEq(core.balanceOfMember(bob), 1_000);
    }

    function testSetLimitsOverCapsReverts() public {
        vm.startPrank(broker);
        vm.expectRevert(bytes("credit over cap"));
        core.setLimits(alice, MAX_CREDIT + 1, MEMBER_POSITIVE);

        vm.expectRevert(bytes("positive over cap"));
        core.setLimits(alice, ALICE_CREDIT, MAX_POSITIVE + 1);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Invariants / fuzz
    // ------------------------------------------------------------------

    function testZeroSumAfterMixedFlow() public {
        _deposit(alice, 50_000);
        _deposit(bob, 20_000);

        vm.prank(alice);
        core.pay(bob, 15_000);

        vm.prank(bob);
        core.offramp(5_000);

        vm.prank(alice);
        core.offramp(10_000);

        assertEq(core.sumBalances(), 0);
        assertEq(
            core.sumBalances(),
            core.reserveBalanceCents() +
                core.balanceOfMember(alice) +
                core.balanceOfMember(bob)
        );
        assertEq(core.argtReserveRaw(), core.netIssuedCents() * 1e16);
    }

    function testFuzzPayKeepsZeroSum(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, BOB_CREDIT);

        vm.prank(bob);
        core.pay(alice, amount);

        assertEq(core.balanceOfMember(bob), -int256(amount));
        assertEq(core.balanceOfMember(alice), int256(amount));
        assertEq(core.sumBalances(), 0);
    }

    function testFuzzOnrampOfframpRoundTrip(uint96 rawCents) public {
        uint256 cents = bound(uint256(rawCents), 1, MEMBER_POSITIVE);
        uint256 raw = cents * 1e16;
        uint256 aliceArgtBefore = argt.balanceOf(alice);
        uint256 contractBefore = argt.balanceOf(address(core));

        _deposit(alice, cents);

        assertEq(core.balanceOfMember(alice), int256(cents));
        assertEq(core.sumBalances(), 0);

        vm.prank(alice);
        core.offramp(cents);

        assertEq(core.balanceOfMember(alice), 0);
        assertEq(core.reserveBalanceCents(), 0);
        assertEq(argt.balanceOf(alice), aliceArgtBefore);
        assertEq(argt.balanceOf(address(core)), contractBefore);
        assertEq(core.argtReserveRaw(), contractBefore);
        assertEq(core.sumBalances(), 0);
        assertEq(raw, cents * 1e16);
    }

    function testFuzzOnrampNeverExceedsOneToOne(uint96 rawCents) public {
        uint256 cents = bound(uint256(rawCents), 1, MEMBER_POSITIVE);
        uint256 aliceBefore = argt.balanceOf(alice);

        _deposit(alice, cents);

        assertEq(aliceBefore - argt.balanceOf(alice), cents * 1e16);
        assertEq(core.argtReserveRaw(), core.netIssuedCents() * 1e16);
    }
}
