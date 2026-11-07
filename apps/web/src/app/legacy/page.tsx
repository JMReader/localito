import type { Metadata } from "next";
import WalletApp from "@/components/WalletApp";

export const metadata: Metadata = {
  title: "Localito legacy — sandbox SQLite",
  description:
    "Sandbox legacy de Localito: ledger SQLite de demo. No es PREStAR, sus balances no son PRt y no hay fuente de verdad on-chain.",
};

export default function LegacyPage() {
  return <WalletApp />;
}
