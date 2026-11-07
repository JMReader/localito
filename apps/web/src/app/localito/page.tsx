import type { Metadata } from "next";
import WalletApp from "@/components/WalletApp";

export const metadata: Metadata = {
  title: "Localito — moneda local",
  description:
    "Moneda local de demo: login por alias, saldo, pagos e historial sobre el ledger SQLite.",
};

export default function LocalitoPage() {
  return <WalletApp />;
}
