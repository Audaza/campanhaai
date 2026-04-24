import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campanha Tráfego | Audaza",
  description: "Gerador de planejamento de campanhas de tráfego pago com IA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        {/* Navegador não deve cachear o HTML — chunks .js/.css já têm hash no nome */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
