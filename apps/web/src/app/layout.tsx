import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CriteriaLock // Bloqueo de Plata & Smart Escrow Onchain (Twin Finance)",
  description:
    "Protocolo de custodia inteligente en ARGt y USDT sobre Avalanche C-Chain. Bloqueá la plata, fijá criterios de aceptación verificables y cobrá al segundo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#000000] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
