import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "PREStAR — crédito mutuo PRt",
  description: "Crédito mutuo B2B en PRt con reserva y swap 1:1 en ARGt.",
};

export default function PrestarPage() {
  return <HomePage />;
}
