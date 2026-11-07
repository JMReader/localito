import {
  BaseError,
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  hexToNumber,
  http,
  isAddress,
  parseAbi,
  parseUnits,
  toHex,
  type Address,
  type Chain,
  type EIP1193Provider,
} from "viem";
import { arbitrum, base, mainnet, polygon } from "viem/chains";

export const ARGT_SYMBOL = "ARGt";
export const ARGT_DECIMALS = 18;

/** Default ARGt contract on Arbitrum One mainnet. */
export const ARGT_DEFAULT_TOKEN: Address =
  "0x59863989d080B22476DB95656d0C3CC18be92214";

export const ARGT_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const CHAINS_BY_KEY: Record<string, Chain> = {
  arbitrum: arbitrum,
  "arbitrum-one": arbitrum,
  arbitrumone: arbitrum,
  "42161": arbitrum,
  base: base,
  "8453": base,
  polygon: polygon,
  "137": polygon,
  ethereum: mainnet,
  mainnet: mainnet,
  eth: mainnet,
  "1": mainnet,
};

const DEFAULT_TOKEN_BY_CHAIN: Record<number, Address> = {
  [arbitrum.id]: ARGT_DEFAULT_TOKEN,
};

const KNOWN_CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: "Ethereum",
  [polygon.id]: "Polygon",
  [base.id]: "Base",
  [arbitrum.id]: "Arbitrum One",
};

export interface ArgtConfig {
  chain: Chain;
  chainId: number;
  chainName: string;
  tokenAddress: Address | null;
  explorerUrl: string;
  rpcUrl: string;
  /** Configuration problems meant to be shown in the UI (never secrets). */
  issues: string[];
}

let cachedConfig: ArgtConfig | null = null;

function readEnv(): {
  chainKey: string;
  tokenAddress: string;
  rpcUrl: string;
} {
  return {
    chainKey: (process.env.NEXT_PUBLIC_ARGT_CHAIN ?? "").trim().toLowerCase(),
    tokenAddress: (process.env.NEXT_PUBLIC_ARGT_TOKEN_ADDRESS ?? "").trim(),
    rpcUrl: (process.env.NEXT_PUBLIC_ARGT_RPC_URL ?? "").trim(),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Resolves the ARGt network from `NEXT_PUBLIC_ARGT_*` env vars.
 * Arbitrum One is the default; every supported chain can be selected by name
 * (`arbitrum`, `base`, `polygon`, `ethereum`) or by chain id.
 */
export function getArgtConfig(): ArgtConfig {
  if (cachedConfig) return cachedConfig;

  const env = readEnv();
  const issues: string[] = [];

  const requestedKey = env.chainKey || "arbitrum";
  const chain = CHAINS_BY_KEY[requestedKey];
  const resolvedChain = chain ?? arbitrum;

  if (!chain) {
    issues.push(
      `NEXT_PUBLIC_ARGT_CHAIN="${env.chainKey}" no es una red soportada (arbitrum, base, polygon, ethereum). Se usa Arbitrum One.`,
    );
  }

  let tokenAddress: Address | null = null;
  if (env.tokenAddress) {
    if (isAddress(env.tokenAddress)) {
      tokenAddress = getAddress(env.tokenAddress);
    } else {
      issues.push(
        "NEXT_PUBLIC_ARGT_TOKEN_ADDRESS no es una dirección 0x válida; no se puede leer ni transferir ARGt.",
      );
    }
  } else {
    tokenAddress = DEFAULT_TOKEN_BY_CHAIN[resolvedChain.id] ?? null;
    if (!tokenAddress) {
      issues.push(
        `No hay contrato ARGt por defecto para ${resolvedChain.name}. Configurá NEXT_PUBLIC_ARGT_TOKEN_ADDRESS.`,
      );
    }
  }

  const fallbackRpc = resolvedChain.rpcUrls.default.http[0];
  let rpcUrl = env.rpcUrl || fallbackRpc;
  if (env.rpcUrl && !isHttpUrl(env.rpcUrl)) {
    issues.push(
      "NEXT_PUBLIC_ARGT_RPC_URL no es una URL http(s) válida; se usa el RPC público por defecto.",
    );
    rpcUrl = fallbackRpc;
  }

  const explorerUrl =
    resolvedChain.blockExplorers?.default.url ?? "https://arbiscan.io";

  const config: ArgtConfig = {
    chain: resolvedChain,
    chainId: resolvedChain.id,
    chainName: resolvedChain.name,
    tokenAddress,
    explorerUrl,
    rpcUrl,
    issues,
  };

  cachedConfig = config;
  return config;
}

export function createArgtPublicClient(config: ArgtConfig) {
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

export function createArgtWalletClient(
  provider: EIP1193Provider,
  config: ArgtConfig,
) {
  return createWalletClient({
    chain: config.chain,
    transport: custom(provider),
  });
}

export function getInjectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export function normalizeAccounts(value: unknown): Address[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    typeof item === "string" && isAddress(item) ? [getAddress(item)] : [],
  );
}

export function parseChainId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    if (raw.startsWith("0x") || raw.startsWith("0X")) {
      try {
        return hexToNumber(raw as `0x${string}`);
      } catch {
        return null;
      }
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function chainLabel(chainId: number | null): string {
  if (chainId === null) return "sin datos";
  return KNOWN_CHAIN_NAMES[chainId] ?? `red ${chainId}`;
}

export function shortAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function formatArgt(value: bigint): string {
  return formatUnits(value, ARGT_DECIMALS);
}

export type ParsedArgtAmount = { value: bigint } | { error: string };

/** Parses a user typed decimal ARGt amount with 18-decimal fixed point math. */
export function parseArgtAmount(input: string): ParsedArgtAmount {
  const raw = input.trim().replace(",", ".");
  if (!raw) return { error: "Ingresá un monto en ARGt." };
  if (!/^\d*\.?\d+$/.test(raw)) {
    return { error: "Usá sólo números y punto decimal. Ejemplo: 12.5" };
  }
  const [, fraction = ""] = raw.split(".");
  if (fraction.length > ARGT_DECIMALS) {
    return { error: `ARGt tiene ${ARGT_DECIMALS} decimales como máximo.` };
  }
  try {
    const value = parseUnits(raw, ARGT_DECIMALS);
    if (value <= 0n) return { error: "El monto debe ser mayor a cero." };
    return { value };
  } catch {
    return { error: "Monto inválido." };
  }
}

export async function readArgtBalance(
  client: ReturnType<typeof createArgtPublicClient>,
  tokenAddress: Address,
  owner: Address,
): Promise<bigint> {
  return client.readContract({
    address: tokenAddress,
    abi: ARGT_ABI,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function readArgtSymbol(
  client: ReturnType<typeof createArgtPublicClient>,
  tokenAddress: Address,
): Promise<string> {
  return client.readContract({
    address: tokenAddress,
    abi: ARGT_ABI,
    functionName: "symbol",
  });
}

function errorCode(cause: unknown): number | string | undefined {
  if (typeof cause !== "object" || cause === null) return undefined;
  if (!("code" in cause)) return undefined;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "number" || typeof code === "string" ? code : undefined;
}

const USER_REJECTED_CODES = new Set<number | string>([4001, "4001", "ACTION_REJECTED"]);

export function isUserRejection(cause: unknown): boolean {
  const code = errorCode(cause);
  if (code !== undefined && USER_REJECTED_CODES.has(code)) return true;
  if (cause instanceof BaseError) {
    const rejected = cause.walk(
      (inner) => inner instanceof Error && inner.name === "UserRejectedRequestError",
    );
    return rejected !== null;
  }
  return cause instanceof Error && cause.name === "UserRejectedRequestError";
}

/** Safe, user facing wallet error message: never includes payloads or keys. */
export function describeWalletError(cause: unknown): string {
  const code = errorCode(cause);
  if (isUserRejection(cause)) {
    return "Rechazaste la solicitud en MetaMask. No se envió ninguna transacción.";
  }
  if (code === 4902 || code === "4902") {
    return "MetaMask no tiene configurada esta red. Agregala para continuar.";
  }
  if (code === -32002) {
    return "MetaMask ya tiene una solicitud pendiente. Abrilo y resolvelo antes de reintentar.";
  }
  if (cause instanceof BaseError) {
    return cause.shortMessage || "La wallet o el RPC rechazaron la operación.";
  }
  if (cause instanceof Error && cause.message) return cause.message;
  return "No se pudo completar la operación con la wallet.";
}

/**
 * Asks MetaMask to switch to the ARGt chain. Falls back to adding the chain
 * when the wallet does not know it yet (EIP-3326 / EIP-3085).
 */
export async function switchToArgtChain(
  provider: EIP1193Provider,
  chain: Chain,
): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: toHex(chain.id) }],
    });
  } catch (cause) {
    const code = errorCode(cause);
    if (code !== 4902 && code !== "4902") throw cause;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: toHex(chain.id),
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [...chain.rpcUrls.default.http],
          ...(chain.blockExplorers
            ? { blockExplorerUrls: [chain.blockExplorers.default.url] }
            : {}),
        },
      ],
    });
  }
}

export function explorerTxUrl(config: ArgtConfig, hash: string): string {
  return `${config.explorerUrl}/tx/${hash}`;
}

export function explorerAddressUrl(
  config: ArgtConfig,
  address: string,
): string {
  return `${config.explorerUrl}/address/${address}`;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}
