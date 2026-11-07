// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PrestarCore} from "../src/PrestarCore.sol";

/**
 * @title Deploy
 * @notice Simula y (sólo con `--broadcast`) despliega PrestarCore en Arbitrum One.
 *
 * Todos los argumentos del constructor salen del entorno (ver `.env.example`):
 * ARGT_ADDRESS, ADMIN_ADDRESS, BROKER_ADDRESS, GUARDIAN_ADDRESS y los cinco caps
 * en centavos de PRt. El script no conoce ninguna clave privada: la cuenta que
 * firma la elige Foundry por CLI (`--ledger`, `--account`, o `--private-key`
 * pasado a mano), nunca este archivo.
 *
 * Sin `--broadcast` no se envía ninguna transacción. El contrato no es
 * upgradeable y el deploy es irreversible: leer `../README.md` antes.
 */
contract Deploy is Script {
    function run() external returns (PrestarCore core) {
        address argt = _envAddress("ARGT_ADDRESS");
        address admin = _envAddress("ADMIN_ADDRESS");
        address broker = _envAddress("BROKER_ADDRESS");
        address guardian = _envAddress("GUARDIAN_ADDRESS");

        PrestarCore.Caps memory caps = PrestarCore.Caps({
            maxPaymentCents: _envUint128("MAX_PAYMENT_CENTS"),
            maxOnrampCents: _envUint128("MAX_ONRAMP_CENTS"),
            maxOfframpCents: _envUint128("MAX_OFFRAMP_CENTS"),
            maxCreditLimitCents: _envUint128("MAX_CREDIT_LIMIT_CENTS"),
            maxPositiveCents: _envUint128("MAX_POSITIVE_CENTS")
        });

        console2.log("== PrestarCore deploy ==");
        console2.log("chainId:", block.chainid);
        console2.log("ARGT_ADDRESS:", argt);
        console2.log("ADMIN_ADDRESS:", admin);
        console2.log("BROKER_ADDRESS:", broker);
        console2.log("GUARDIAN_ADDRESS:", guardian);
        console2.log("caps (centavos de PRt, 2 decimales):");
        console2.log("  maxPaymentCents     :", uint256(caps.maxPaymentCents));
        console2.log("  maxOnrampCents      :", uint256(caps.maxOnrampCents));
        console2.log("  maxOfframpCents     :", uint256(caps.maxOfframpCents));
        console2.log("  maxCreditLimitCents :", uint256(caps.maxCreditLimitCents));
        console2.log("  maxPositiveCents    :", uint256(caps.maxPositiveCents));
        console2.log("");

        vm.startBroadcast();
        console2.log("broadcaster:", msg.sender);
        core = new PrestarCore(IERC20(argt), admin, broker, guardian, caps);
        vm.stopBroadcast();

        console2.log("");
        console2.log("PrestarCore:", address(core));
        console2.log("Reserva de ARGt inicial: 0 raw (el constructor no mueve tokens).");
        console2.log("Sin --broadcast este address es solo una simulacion.");
    }

    /// @dev Address obligatoria y distinta de cero; el nombre aparece en el error.
    function _envAddress(string memory name) internal view returns (address value) {
        string memory raw = _envString(name);
        value = vm.parseAddress(raw);
        require(value != address(0), string.concat(name, " is the zero address"));
    }

    /// @dev Cap en centavos: debe entrar en uint128 y ser mayor que cero.
    function _envUint128(string memory name) internal view returns (uint128 value) {
        uint256 parsed = vm.parseUint(_envString(name));
        require(parsed > 0, string.concat(name, " must be greater than 0"));
        require(parsed <= type(uint128).max, string.concat(name, " does not fit in uint128"));
        value = uint128(parsed);
    }

    function _envString(string memory name) internal view returns (string memory value) {
        value = vm.envOr(name, string(""));
        require(bytes(value).length != 0, string.concat("missing env var: ", name));
    }
}
