import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campanha Tráfego | Audaza",
  description: "Gerador de planejamento de campanhas de tráfego pago com IA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
