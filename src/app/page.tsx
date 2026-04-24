"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listSavedPlans } from "@/lib/savedPlans";

export default function Home() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(listSavedPlans().length);
  }, []);

  const options = [
    {
      key:        "novo",
      emoji:      "✨",
      title:      "Novo planejamento",
      desc:       "Comece um projeto do zero — cliente, objetivo, orçamento e estrutura completa em minutos.",
      cta:        "Iniciar agora",
      color:      "#0071E3",
      bg:         "rgba(0,113,227,0.08)",
      onClick:    () => router.push("/novo"),
    },
    {
      key:        "salvos",
      emoji:      "📁",
      title:      "Planejamentos salvos",
      desc:       count === null
        ? "Carregando…"
        : count === 0
          ? "Nenhum projeto salvo ainda. Seus planejamentos aparecem aqui depois que você salvar."
          : `${count} ${count === 1 ? "projeto guardado" : "projetos guardados"} — abra ou atualize quando quiser.`,
      cta:        count && count > 0 ? "Ver planejamentos" : "Ver lista",
      color:      "#34C759",
      bg:         "rgba(52,199,89,0.08)",
      onClick:    () => router.push("/planejamentos"),
    },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <header style={{
        background:"rgba(255,255,255,0.82)",
        backdropFilter:"saturate(200%) blur(24px)",
        WebkitBackdropFilter:"saturate(200%) blur(24px)",
        borderBottom:"1px solid var(--border)",
        display:"flex", alignItems:"center", justifyContent:"center",
        height:52, position:"sticky", top:0, zIndex:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:22, height:22, borderRadius:6,
            background:"linear-gradient(135deg,#0071E3,#34aadc)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <span style={{ fontSize:11, color:"white", fontWeight:800 }}>C</span>
          </div>
          <span style={{ fontSize:15, fontWeight:700, color:"var(--text)", letterSpacing:"-0.02em" }}>
            Campanha Tráfego | Audaza
          </span>
        </div>
      </header>

      <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"72px 20px 80px" }}>
        <div style={{ width:"100%", maxWidth:620 }}>

          {/* Hero */}
          <div style={{ textAlign:"center" as const, marginBottom:40 }}>
            <h1 style={{
              fontSize:34, fontWeight:800, color:"var(--text)",
              margin:0, letterSpacing:"-0.03em", lineHeight:1.15,
            }}>
              Planejamento de tráfego com IA
            </h1>
            <p style={{
              fontSize:16, color:"var(--muted)", marginTop:12, marginBottom:0,
              lineHeight:1.55, fontWeight:400,
            }}>
              Crie estratégias completas em poucos minutos — estrutura de campanhas, orçamento e cronograma automatizados.
            </p>
          </div>

          {/* Menu cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {options.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={opt.onClick}
                style={{
                  background:"var(--surface)",
                  borderRadius:18,
                  border:"1px solid var(--border)",
                  boxShadow:"0 2px 20px rgba(0,0,0,0.04)",
                  padding:"24px 26px",
                  textAlign:"left" as const,
                  cursor:"pointer",
                  fontFamily:"inherit",
                  display:"flex",
                  alignItems:"center",
                  gap:20,
                  transition:"transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLElement).style.borderColor = opt.color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                <div style={{
                  width:58, height:58, borderRadius:14, flexShrink:0,
                  background: opt.bg,
                  border:`1px solid ${opt.color}22`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:28,
                }}>
                  {opt.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:17, fontWeight:700, color:"var(--text)",
                    letterSpacing:"-0.015em", marginBottom:4,
                  }}>
                    {opt.title}
                  </div>
                  <div style={{
                    fontSize:13, color:"var(--muted)", lineHeight:1.5,
                  }}>
                    {opt.desc}
                  </div>
                </div>
                <div style={{
                  flexShrink:0, color:opt.color, fontSize:13, fontWeight:600,
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  {opt.cta}
                  <span style={{ fontSize:16 }}>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
