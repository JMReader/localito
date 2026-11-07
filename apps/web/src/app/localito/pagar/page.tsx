import React from "react";
import { LemonLocalitoWallet } from "@/components/localito/LemonLocalitoWallet";

export const metadata = {
  title: "Pagar con PRt · Locales Adheridos Lemon UI",
  description: "Buscador de comercios y locales que aceptan el token PRt, datos de destinatario y deslizador para pagar estilo Lemon Cash.",
};

export default function PagarPage() {
  return <LemonLocalitoWallet initialTab="pay" />;
}
