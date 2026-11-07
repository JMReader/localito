// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {PrestarCore} from "../src/PrestarCore.sol";

/**
 * Optional read-only fork test. It never sends a transaction to mainnet.
 * Run with ARBITRUM_RPC_URL set; otherwise Foundry skips the test.
 */
contract PrestarCoreForkTest is Test {
    address internal constant ARGT = 0x59863989d080B22476DB95656d0C3CC18be92214;

    function testForkArgtMetadataAndCoreConstruction() public {
        string memory rpcUrl = vm.envOr("ARBITRUM_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            vm.skip(true);
            return;
        }

        vm.createSelectFork(rpcUrl);

        assertGt(ARGT.code.length, 0, "ARGt contract not found on Arbitrum One");
        assertEq(IERC20Metadata(ARGT).decimals(), 18);
        assertGt(IERC20(ARGT).totalSupply(), 0);

        PrestarCore core = new PrestarCore(
            IERC20(ARGT),
            makeAddr("admin"),
            makeAddr("broker"),
            makeAddr("guardian"),
            PrestarCore.Caps({
                maxPaymentCents: 100_000,
                maxOnrampCents: 1_000_000,
                maxOfframpCents: 1_000_000,
                maxCreditLimitCents: 50_000,
                maxPositiveCents: 500_000
            })
        );

        assertEq(address(core.argt()), ARGT);
        assertEq(core.argtReserveRaw(), 0);
        assertEq(core.sumBalances(), 0);
    }
}
