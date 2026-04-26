import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Audaza Campanha",
  description: "Gerador de planejamento de campanhas de tráfego pago com IA",
};

/* Inicializador de tema sem flash (lê localStorage antes do React montar) */
const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('audaza-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(_){}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`h-full ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="theme-color" content="#06070b" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full" style={{ position: "relative" }}>
        <div className="app-bg" />
        <div className="app-grain" />
        <div style={{ position: "relative", zIndex: 5 }}>{children}</div>
      </body>
    </html>
  );
}
