import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseAbi,
  parseUnits,
  type Address,
  type Chain,
  type EIP1193Provider,
} from "viem";
import { arbitrum } from "viem/chains";

import { ARGT_DECIMALS, ARGT_DEFAULT_TOKEN, ARGT_SYMBOL } from "./argt";

/** PREStAR only runs against Arbitrum One mainnet. No other chain is accepted. */
export const PRESTAR_CHAIN_ID = 42161;
export const PRESTAR_CHAIN: Chain = arbitrum;
export const PRESTAR_EXPLORER_URL = "https://arbiscan.io";
export const PRT_DECIMALS = 2;
/** 1 PRt (100 cents) = 1 ARGt (1e18 raw) => 1 cent = 1e16 raw. */
export const ARGT_RAW_PER_PRT_CENT = 10n ** 16n;

export const PRESTAR_CORE_ABI = parseAbi([
  "function balanceOfMember(address account) view returns (int256)",
  "function memberInfo(address account) view returns (uint8 status, int256 balanceCents, uint128 creditLimitCents, uint128 maxPositiveCents)",
  "function reserveBalanceCents() view returns (int256)",
  "function netIssuedCents() view returns (uint256)",
  "function argtReserveRaw() view returns (uint256)",
  "function paused() view returns (bool)",
  "function pay(address to, uint256 amountCents)",
  "function onramp(uint256 amountCents)",
  "function offramp(uint256 amountCents)",
]);

export const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export interface PrestarConfig {
  chain: Chain;
  chainId: number;
  chainName: string;
  coreAddress: Address | null;
  argtAddress: Address;
  explorerUrl: string;
  rpcUrl: string;
  /** Human-readable configuration problems shown in the UI (never secrets). */
  issues: string[];
}

export interface PrestarState {
  memberBalanceCents: bigint;
  argtBalance: bigint;
  argtAllowance: bigint;
  argtSymbol: string;
  paused: boolean;
}

let cachedConfig: PrestarConfig | null = null;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function readEnv(): {
  coreAddress: string;
  argtAddress: string;
  rpcUrl: string;
  legacyRpcUrl: string;
} {
  return {
    coreAddress: (process.env.NEXT_PUBLIC_PRESTAR_CORE_ADDRESS ?? "").trim(),
    argtAddress: (process.env.NEXT_PUBLIC_ARGT_TOKEN_ADDRESS ?? "").trim(),
    rpcUrl: (process.env.NEXT_PUBLIC_PRESTAR_RPC_URL ?? "").trim(),
    legacyRpcUrl: (process.env.NEXT_PUBLIC_ARGT_RPC_URL ?? "").trim(),
  };
}

/**
 * Reads PREStAR configuration from public env vars. The chain is hardcoded to
 * Arbitrum One (42161); the core address has no default and must be provided
 * after a verified deployment. When absent, every write path is disabled.
 */
export function getPrestarConfig(): PrestarConfig {
  if (cachedConfig) return cachedConfig;

  const env = readEnv();
  const issues: string[] = [];

  let coreAddress: Address | null = null;
  if (!env.coreAddress) {
    issues.push(
      "PrestarCore aún no desplegado: configurá NEXT_PUBLIC_PRESTAR_CORE_ADDRESS con el address verificado. Las operaciones on-chain están deshabilitadas.",
    );
  } else if (isAddress(env.coreAddress)) {
    coreAddress = getAddress(env.coreAddress);
  } else {
    issues.push(
      "NEXT_PUBLIC_PRESTAR_CORE_ADDRESS no es una dirección 0x válida. Las operaciones on-chain están deshabilitadas.",
    );
  }

  let argtAddress: Address = ARGT_DEFAULT_TOKEN;
  if (env.argtAddress) {
    if (isAddress(env.argtAddress)) {
      argtAddress = getAddress(env.argtAddress);
    } else {
      issues.push(
        "NEXT_PUBLIC_ARGT_TOKEN_ADDRESS no es una dirección 0x válida; se usa el ARGt por defecto de Arbitrum One.",
      );
    }
  }

  const fallbackRpc = PRESTAR_CHAIN.rpcUrls.default.http[0];
  const requestedRpc = env.rpcUrl || env.legacyRpcUrl;
  let rpcUrl = requestedRpc || fallbackRpc;
  if (requestedRpc && !isHttpUrl(requestedRpc)) {
    issues.push(
      "NEXT_PUBLIC_PRESTAR_RPC_URL no es una URL http(s) válida; se usa el RPC público de Arbitrum One.",
    );
    rpcUrl = fallbackRpc;
  }

  const config: PrestarConfig = {
    chain: PRESTAR_CHAIN,
    chainId: PRESTAR_CHAIN_ID,
    chainName: "Arbitrum One",
    coreAddress,
    argtAddress,
    explorerUrl: PRESTAR_EXPLORER_URL,
    rpcUrl,
    issues,
  };

  cachedConfig = config;
  return config;
}

export function createPrestarPublicClient(config: PrestarConfig) {
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

export function createPrestarWalletClient(provider: EIP1193Provider) {
  return createWalletClient({
    chain: PRESTAR_CHAIN,
    transport: custom(provider),
  });
}

export function isPrestarReady(config: PrestarConfig): boolean {
  return config.coreAddress !== null && config.chainId === PRESTAR_CHAIN_ID;
}

export type ParsedPrtCents = { value: bigint } | { error: string };

/**
 * Parses a PRt amount typed by the user into integer cents. No floats:
 * `parseUnits` handles the 2-decimal fixed point and rejects fractions of a
 * cent.
 */
export function parsePrtCents(input: string): ParsedPrtCents {
  let raw = input.trim().replace(",", ".");
  if (!raw) return { error: "Ingresá un monto en PRt." };
  if (raw.startsWith(".")) raw = `0${raw}`;
  if (raw.endsWith(".")) raw = raw.slice(0, -1);
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return {
      error: "Usá sólo números y hasta 2 decimales (PRt se maneja en centavos).",
    };
  }
  try {
    const value = parseUnits(raw, PRT_DECIMALS);
    if (value <= 0n) return { error: "El monto debe ser mayor a cero." };
    return { value };
  } catch {
    return { error: "Monto inválido." };
  }
}

export function formatPrtCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${grouped},${fraction}`;
}

export function prtCentsToArgtRaw(cents: bigint): bigint {
  return cents * ARGT_RAW_PER_PRT_CENT;
}

export function formatArgtRaw(raw: bigint): string {
  const value = formatUnits(raw, ARGT_DECIMALS);
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

export function formatArgtAllowance(raw: bigint): string {
  if (raw === 0n) return "0 ARGt";
  if (raw >= 10n ** 30n) return "ilimitada";
  return `${formatArgtRaw(raw)} ARGt`;
}

export async function readPrestarState(
  client: ReturnType<typeof createPrestarPublicClient>,
  config: PrestarConfig,
  owner: Address,
): Promise<PrestarState> {
  const core = config.coreAddress;
  if (!core) throw new Error("PrestarCore no está configurado.");

  const [memberBalanceCents, argtBalance, argtAllowance, argtSymbol, paused] =
    await Promise.all([
      client.readContract({
        address: core,
        abi: PRESTAR_CORE_ABI,
        functionName: "balanceOfMember",
        args: [owner],
      }),
      client.readContract({
        address: config.argtAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [owner],
      }),
      client.readContract({
        address: config.argtAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [owner, core],
      }),
      readArgtSymbol(client, config),
      client
        .readContract({
          address: core,
          abi: PRESTAR_CORE_ABI,
          functionName: "paused",
        })
        .catch(() => false),
    ]);

  return {
    memberBalanceCents,
    argtBalance,
    argtAllowance,
    argtSymbol,
    paused,
  };
}

export interface ArgtWalletState {
  argtBalance: bigint;
  argtSymbol: string;
}

function readArgtSymbol(
  client: ReturnType<typeof createPrestarPublicClient>,
  config: PrestarConfig,
): Promise<string> {
  return client
    .readContract({
      address: config.argtAddress,
      abi: ERC20_ABI,
      functionName: "symbol",
    })
    .catch(() => ARGT_SYMBOL);
}

/**
 * Reads the ARGt wallet readout without touching PrestarCore, so the direct
 * ARGt transfer keeps working while the contract is not deployed.
 */
export async function readArgtWalletState(
  client: ReturnType<typeof createPrestarPublicClient>,
  config: PrestarConfig,
  owner: Address,
): Promise<ArgtWalletState> {
  const [argtBalance, argtSymbol] = await Promise.all([
    client.readContract({
      address: config.argtAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    }),
    readArgtSymbol(client, config),
  ]);

  return { argtBalance, argtSymbol };
}

export function explorerTxUrl(config: PrestarConfig, hash: string): string {
  return `${config.explorerUrl}/tx/${hash}`;
}

export function explorerAddressUrl(
  config: PrestarConfig,
  address: string,
): string {
  return `${config.explorerUrl}/address/${address}`;
}
