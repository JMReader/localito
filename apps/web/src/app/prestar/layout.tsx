import type { Metadata } from "next";
import "./prestar.css";

export const metadata: Metadata = {
  title: "PREStAR — crédito mutuo PRt",
  description:
    "Crédito mutuo B2B en PRt con reserva y rampa 1:1 en ARGt sobre Arbitrum One.",
};

export default function PrestarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
