"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listSavedPlans, deleteSavedPlan, type SavedPlan } from "@/lib/savedPlans";
import BrandHeader from "@/components/BrandHeader";
import ThemeToggle from "@/components/ThemeToggle";

function platColor(p: string): string {
  if (p === "Facebook")    return "#1877F2";
  if (p === "Instagram")   return "#E1306C";
  if (p === "Google Ads")  return "#EA4335";
  if (p === "TikTok Ads")  return "#444cf7";
  if (p === "YouTube Ads") return "#FF0000";
  return "#0071E3";
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const day  = 86_400_000;
  if (diff < 60_000)           return "agora mesmo";
  if (diff < 3_600_000)        return `${Math.floor(diff / 60_000)} min atrás`;
  if (diff < day)              return `${Math.floor(diff / 3_600_000)} h atrás`;
  if (diff < 7 * day)          return `${Math.floor(diff / day)} dias atrás`;
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
}

export default function Planejamentos() {
  const router = useRouter();
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    setPlans(listSavedPlans());
  }, []);

  function open(p: SavedPlan) {
    sessionStorage.setItem("campaignPlan", JSON.stringify(p.plan));
    sessionStorage.setItem("campaignPlanId", p.id);
    router.push("/resultado");
  }

  function remove(id: string) {
    deleteSavedPlan(id);
    setPlans(listSavedPlans());
    setConfirming(null);
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <header style={{
        background:"rgba(6,7,11,0.72)",
        backdropFilter:"blur(16px) saturate(140%)",
        WebkitBackdropFilter:"blur(16px) saturate(140%)",
        borderBottom:"1px solid var(--rule)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:54, position:"sticky", top:0, zIndex:10,
        padding:"0 18px",
      }}>
        <button type="button" onClick={() => router.push("/")} style={{
          background:"transparent", border:"none", cursor:"pointer",
          fontFamily:"inherit", fontSize:13, color:"var(--muted)",
          display:"flex", alignItems:"center", gap:4, padding:"6px 10px",
          borderRadius:6, transition:"background 0.15s, color 0.15s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
        >
          <span style={{ fontSize:14 }}>←</span> Menu
        </button>
        <BrandHeader />
        <ThemeToggle />
      </header>

      <main style={{ flex:1, padding:"36px 20px 72px", display:"flex", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:720 }}>

          {/* Heading */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", letterSpacing:"0.1em", textTransform:"uppercase" as const }}>
              Biblioteca
            </div>
            <h1 style={{ fontSize:28, fontWeight:800, color:"var(--text)", margin:"4px 0 0", letterSpacing:"-0.025em" }}>
              Planejamentos salvos
            </h1>
          </div>

          {/* Loading */}
          {plans === null && (
            <p style={{ color:"var(--muted)", fontSize:14 }}>Carregando…</p>
          )}

          {/* Empty state */}
          {plans && plans.length === 0 && (
            <div style={{
              background:"var(--surface)", borderRadius:16, border:"1px solid var(--border)",
              padding:"48px 24px", textAlign:"center" as const,
            }}>
              <div style={{ fontSize:42, marginBottom:12 }}>📁</div>
              <h2 style={{ fontSize:18, fontWeight:700, color:"var(--text)", margin:"0 0 8px" }}>
                Nenhum planejamento ainda
              </h2>
              <p style={{ fontSize:14, color:"var(--muted)", margin:"0 0 20px", lineHeight:1.55 }}>
                Quando você salvar um planejamento, ele aparece aqui pra consultar, atualizar ou exportar depois.
              </p>
              <button type="button" onClick={() => router.push("/novo")}
                className="btn-primary" style={{ margin:"0 auto" }}>
                ✨ Criar novo planejamento
              </button>
            </div>
          )}

          {/* Lista */}
          {plans && plans.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {plans.map(p => {
                const pl       = p.plan;
                const platforms = pl.overview.platforms || [];
                const isConfirming = confirming === p.id;
                return (
                  <div key={p.id} style={{
                    background:"var(--surface)", borderRadius:14,
                    border:"1px solid var(--border)",
                    boxShadow:"0 2px 14px rgba(0,0,0,0.035)",
                    overflow:"hidden",
                  }}>
                    <button type="button" onClick={() => open(p)} style={{
                      width:"100%", textAlign:"left" as const, border:"none", background:"transparent",
                      padding:"18px 22px", cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"flex-start", gap:16,
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{
                          fontSize:16, fontWeight:700, color:"var(--text)",
                          letterSpacing:"-0.018em", marginBottom:6,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const,
                        }}>
                          {p.name}
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                          {platforms.map(plat => {
                            const c = platColor(plat);
                            return (
                              <span key={plat} style={{
                                fontSize:10, fontWeight:700, color:c,
                                background: c + "12",
                                border: `1px solid ${c}22`,
                                padding:"3px 8px", borderRadius:5,
                              }}>{plat}</span>
                            );
                          })}
                        </div>
                        <div style={{ fontSize:12, color:"var(--muted)", display:"flex", gap:12, flexWrap:"wrap" }}>
                          <span>🎯 {pl.overview.objective}</span>
                          <span>📅 {pl.overview.duration}</span>
                          <span>💰 {pl.overview.dailyBudget || pl.overview.totalBudget}</span>
                        </div>
                      </div>
                      <div style={{ flexShrink:0, textAlign:"right" as const, display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                        <span style={{ fontSize:11, color:"var(--muted)" }}>{relativeDate(p.updatedAt)}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"var(--primary)" }}>Abrir →</span>
                      </div>
                    </button>

                    {/* Delete row */}
                    <div style={{
                      borderTop:"1px solid var(--border)",
                      padding:"8px 16px", display:"flex",
                      justifyContent:"flex-end", alignItems:"center", gap:10,
                      background:"var(--surface-2)",
                    }}>
                      {isConfirming ? (
                        <>
                          <span style={{ fontSize:12, color:"var(--danger)" }}>Excluir este planejamento?</span>
                          <button type="button" onClick={() => setConfirming(null)} style={{
                            background:"transparent", border:"1px solid var(--border-input)",
                            padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                            color:"var(--text-sub)", fontFamily:"inherit",
                          }}>Cancelar</button>
                          <button type="button" onClick={() => remove(p.id)} style={{
                            background:"var(--danger)", border:"none",
                            padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                            color:"white", fontFamily:"inherit", fontWeight:600,
                          }}>Excluir</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirming(p.id)} style={{
                          background:"transparent", border:"none",
                          fontSize:12, color:"var(--muted)", cursor:"pointer",
                          fontFamily:"inherit", padding:"4px 8px",
                          transition:"color 0.15s",
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
                        >🗑 Excluir</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
