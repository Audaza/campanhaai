"use client";

import { Rocket } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   Logo "Audaza Campanha" — estilo /apps audaza.com
   Quadrado azul + ícone foguete + "Audaza" bold + "Campanha" muted.
═══════════════════════════════════════════════════════ */

export default function BrandHeader({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: 7,
        background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 4px 14px rgba(91,158,255,0.35)",
      }}>
        <Rocket size={size * 0.55} color="#fff" strokeWidth={2.2} />
      </div>
      <span
        className="font-display"
        style={{
          fontSize: 15, fontWeight: 600,
          letterSpacing: "-0.02em", lineHeight: 1,
          color: "var(--text)",
        }}
      >
        Audaza{" "}
        <span style={{ color: "var(--muted)", fontWeight: 500 }}>Campanha</span>
      </span>
    </div>
  );
}
