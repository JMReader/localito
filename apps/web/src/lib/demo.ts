export interface DemoAlias {
  alias: string;
  name: string;
  role: "member" | "merchant";
}

/**
 * Seed aliases documented in the v0 API contract. They only drive the login
 * picker; balances and limits are always read from the API.
 */
export const DEMO_ALIASES: DemoAlias[] = [
  { alias: "ana", name: "Ana", role: "member" },
  { alias: "bruno", name: "Bruno", role: "member" },
  { alias: "kiosco", name: "Kiosco La Esquina", role: "merchant" },
  { alias: "cafe", name: "Café Central", role: "merchant" },
  { alias: "foto", name: "Fotocopias Norte", role: "merchant" },
];

export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function roleLabel(role: string): string {
  return role === "merchant" ? "comercio" : "vecino";
}
