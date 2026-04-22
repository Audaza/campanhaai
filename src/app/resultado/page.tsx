"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CampaignPlan, Platform } from "@/types/campaign";
import { ArrowLeft, Download } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import CampaignPDF from "@/components/CampaignPDF";

/* ─── Clean metadata from copy ─── */
const META_RE = /^[0-9][0-9,.\sKkMm]*likes?,\s*[0-9][0-9,.\sKkMm]*comments?\s*-\s*[^:]+:\s*/i;
function cleanCopy(text: string): string {
  if (!text) return "";
  return text.replace(META_RE, "").trim();
}
function extractPostDate(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\bon\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s*:/i);
  if (!m) return null;
  const d = new Date(m[1]);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/* ─── Platform config ─── */
const PLAT: Record<string, { color: string; bg: string; glyph: string }> = {
  "Meta Ads":    { color: "#1877F2", bg: "rgba(24,119,242,0.09)",  glyph: "f" },
  "Facebook":    { color: "#1877F2", bg: "rgba(24,119,242,0.09)",  glyph: "f" },
  "Instagram":   { color: "#E1306C", bg: "rgba(225,48,108,0.09)",  glyph: "◈" },
  "Google Ads":  { color: "#EA4335", bg: "rgba(234,67,53,0.09)",   glyph: "G" },
  "TikTok Ads":  { color: "#0a0a0a", bg: "rgba(0,0,0,0.06)",       glyph: "♪" },
  "YouTube Ads": { color: "#FF0000", bg: "rgba(255,0,0,0.09)",     glyph: "▶" },
};
function pc(p: string) {
  if (p.includes("Facebook")) return PLAT["Facebook"];
  if (p.includes("Instagram") && !p.includes("Facebook")) return PLAT["Instagram"];
  return PLAT[p] ?? { color: "#0071E3", bg: "rgba(0,113,227,0.09)", glyph: "●" };
}

/* ─── Copy button ─── */
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); })}
      style={{
        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
        border: ok ? "1px solid rgba(22,163,74,0.3)" : "1px solid #e4e8ef",
        background: ok ? "#f0fdf4" : "#f6f8fa",
        color: ok ? "#16a34a" : "#8994a6",
        cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
        whiteSpace: "nowrap" as const, flexShrink: 0,
      }}
    >
      {ok ? "✓ Copiado" : "Copiar"}
    </button>
  );
}

/* ─── Section heading ─── */
function Heading({ title, label }: { title: string; label: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
        textTransform: "uppercase" as const, color: "#9ba8bb",
        margin: "0 0 4px",
      }}>{label}</p>
      <h2 style={{
        fontSize: 19, fontWeight: 700, color: "#0d1117",
        margin: 0, letterSpacing: "-0.03em",
      }}>{title}</h2>
    </div>
  );
}

/* ─── Audience row ─── */
function AudienceRow({ audience, color }: { audience: string; color: string }) {
  const parts = audience.includes(" · ") ? audience.split(" · ").filter(Boolean) : [audience];
  return (
    <div style={{
      padding: "11px 14px", borderLeft: `3px solid ${color}`,
      background: `${color}07`, borderRadius: "0 9px 9px 0",
    }}>
      <p style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase" as const, color, margin: "0 0 7px",
      }}>Público-alvo</p>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
        {parts.map((part, i) => (
          <span key={i} style={{
            fontSize: 12, color: "#0d1117", background: "white",
            border: `1px solid ${color}20`, borderRadius: 20,
            padding: "3px 11px", fontWeight: 500,
          }}>{part}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ResultadoPage() {
  const router = useRouter();
  const [plan, setPlan]     = useState<CampaignPlan | null>(null);
  const [isClient, setClient] = useState(false);

  useEffect(() => {
    setClient(true);
    const raw = sessionStorage.getItem("campaignPlan");
    if (!raw) { router.push("/"); return; }
    setPlan(JSON.parse(raw));
  }, [router]);

  if (!plan) return (
    <div style={{ minHeight: "100vh", background: "#f3f5f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg style={{ width: 28, height: 28, animation: "spin 0.8s linear infinite", color: "#0071E3" }} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  const totalAdSets = plan.campaigns.reduce((s, c) => s + c.adSets.length, 0);
  const totalAds    = plan.campaigns.reduce((s, c) => s + c.adSets.reduce((ss, as) => ss + as.ads.length, 0), 0);
  const totalFiles  = plan.campaigns.reduce((s, c) =>
    s + c.adSets.reduce((ss, as) => ss + as.ads.filter(a => a.fileDataUrl || a.fileName).length, 0), 0);

  const stats: Array<{ label: string; value: number; icon: string; accent?: boolean }> = [
    { label: "Campanhas", value: plan.campaigns.length, icon: "◐" },
    { label: "Conjuntos", value: totalAdSets,           icon: "◧" },
    { label: "Anúncios",  value: totalAds,              icon: "◇" },
    ...(totalFiles > 0 ? [{ label: "Criativos", value: totalFiles, icon: "✦", accent: true }] : []),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .res-root { font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rise { animation: riseIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rise-0 { animation-delay: 0.00s; }
        .rise-1 { animation-delay: 0.07s; }
        .rise-2 { animation-delay: 0.14s; }
        .rise-3 { animation-delay: 0.21s; }
        .rise-4 { animation-delay: 0.28s; }

        .card {
          background: #ffffff;
          border: 1px solid #e4e8ef;
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03);
        }

        .topbar-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          font-size: 13px; font-weight: 500; color: #5a6478;
          font-family: inherit; padding: 6px 0; transition: color 0.15s;
          letter-spacing: -0.01em;
        }
        .topbar-btn:hover { color: #0d1117; }

        .export-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 8px; border: none;
          font-size: 13px; font-weight: 600; font-family: inherit;
          background: #0d1117; color: white;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          letter-spacing: -0.015em;
        }
        .export-btn:hover { background: #1e2d3d; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.22); }
        .export-btn:disabled { background: #e8ebf1; color: #9ba8bb; cursor: not-allowed; transform: none; box-shadow: none; }

        .stat-cell {
          flex: 1; padding: 18px 20px; text-align: center;
          border-right: 1px solid #e4e8ef;
          transition: background 0.15s;
        }
        .stat-cell:last-child { border-right: none; }
        .stat-cell:hover { background: #fafbfd; }

        .budget-card {
          background: white; border: 1px solid #e4e8ef;
          border-radius: 12px; padding: 20px 22px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .budget-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); transform: translateY(-1px); }

        .bar-track { background: #eef0f5; border-radius: 99px; height: 4px; overflow: hidden; }
        .bar-fill   { height: 100%; border-radius: 99px; }

        .adset-card {
          background: #f8f9fb; border-radius: 11px;
          border: 1px solid #e4e8ef; overflow: hidden;
          transition: border-color 0.15s;
        }

        .ad-item {
          background: white; border-radius: 9px;
          border: 1px solid #eaecf2; padding: 12px 14px;
          transition: box-shadow 0.15s;
        }
        .ad-item:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.05); }

        .tl-node {
          position: absolute; left: -52px; top: 0;
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; z-index: 1;
        }
      `}</style>

      <div className="res-root" style={{ minHeight: "100vh", background: "#f3f5f8" }}>

        {/* ── Topbar ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(243,245,248,0.88)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "1px solid #e4e8ef",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", height: 54,
        }}>
          <button className="topbar-btn" onClick={() => router.push("/")}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Nova campanha
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: "linear-gradient(135deg, #0061c8, #34aadc)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 13, color: "white", fontWeight: 800, letterSpacing: "-0.03em" }}>C</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0d1117", letterSpacing: "-0.025em" }}>
              Campanha Tráfego | Audaza
            </span>
          </div>

          {isClient && (
            <PDFDownloadLink
              document={<CampaignPDF plan={plan} />}
              fileName={`campanha-${plan.overview.clientName.toLowerCase().replace(/\s+/g, "-")}.pdf`}
            >
              {({ loading: l }) => (
                <button disabled={l} className="export-btn" style={l ? { background: "#e8ebf1", color: "#9ba8bb", cursor: "not-allowed" } : {}}>
                  <Download style={{ width: 13, height: 13 }} />
                  {l ? "Gerando…" : "Exportar PDF"}
                </button>
              )}
            </PDFDownloadLink>
          )}
        </header>

        <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px 100px" }}>

          {/* ═══════════════════════════════════════
              OVERVIEW
          ═══════════════════════════════════════ */}
          <div className="card rise rise-0" style={{ marginBottom: 20, overflow: "hidden" }}>

            {/* Hero */}
            <div style={{
              background: "linear-gradient(135deg, #0057c2 0%, #0071E3 35%, #1a8aff 70%, #34aadc 100%)",
              padding: "32px 32px 28px", position: "relative", overflow: "hidden",
            }}>
              {/* Decorative circles */}
              <div style={{ position: "absolute", top: -80, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -50, right: 100, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 20, right: 200, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: "rgba(255,255,255,0.5)", margin: "0 0 18px",
              }}>
                Planejamento Estratégico · {new Date().toLocaleDateString("pt-BR")}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" as const }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{
                    fontSize: 30, fontWeight: 800, color: "white", margin: "0 0 5px",
                    letterSpacing: "-0.04em", lineHeight: 1.1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                  }}>
                    {plan.overview.clientName}
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.62)", margin: 0 }}>
                    {plan.overview.product}
                  </p>
                </div>

                <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                    margin: "0 0 5px", letterSpacing: "0.08em", textTransform: "uppercase" as const,
                  }}>
                    {plan.overview.dailyBudget ? "Invest. Diário" : "Orçamento Total"}
                  </p>
                  <p style={{
                    fontSize: 30, fontWeight: 800, color: "white",
                    margin: 0, letterSpacing: "-0.04em", lineHeight: 1.1,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {plan.overview.dailyBudget || plan.overview.totalBudget}
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 20 }}>
                {[
                  `🎯 ${plan.overview.objective}`,
                  `📅 ${plan.overview.duration}`,
                  ...plan.overview.platforms,
                ].map((tag, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)",
                    background: "rgba(255,255,255,0.13)", padding: "4px 12px",
                    borderRadius: 6, backdropFilter: "blur(4px)",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{ padding: "22px 32px 0" }}>
              <p style={{ fontSize: 14, color: "#5a6478", lineHeight: 1.75, margin: 0, maxWidth: 680 }}>
                {plan.overview.summary}
              </p>
            </div>

            {/* Stats strip */}
            <div style={{ display: "flex", borderTop: "1px solid #e4e8ef", marginTop: 22 }}>
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="stat-cell"
                  style={s.accent ? {
                    background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.01) 100%)",
                    borderTop: "2px solid #f59e0b",
                    marginTop: -1,
                    position: "relative",
                  } : undefined}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 6 }}>
                    <span style={{
                      fontSize: 14,
                      color: s.accent ? "#f59e0b" : "#c5ccd6",
                      lineHeight: 1,
                    }}>
                      {s.icon}
                    </span>
                    <p style={{
                      fontSize: 28, fontWeight: 800,
                      color: s.accent ? "#c77600" : "#0d1117",
                      margin: 0, letterSpacing: "-0.045em", lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {s.value}
                    </p>
                  </div>
                  <p style={{
                    fontSize: 11,
                    color: s.accent ? "#a36300" : "#9ba8bb",
                    margin: 0,
                    fontWeight: s.accent ? 700 : 500,
                    letterSpacing: s.accent ? "0.04em" : 0,
                    textTransform: s.accent ? "uppercase" as const : undefined,
                  }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════
              BUDGET DISTRIBUTION
          ═══════════════════════════════════════ */}
          <section className="rise rise-1" style={{ marginBottom: 24 }}>
            <Heading title="Distribuição de Orçamento" label="Investimento" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {plan.budgetDistribution.map((b, i) => {
                const c = pc(b.platform);
                return (
                  <div key={i} className="budget-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{
                        width: 38, height: 38, background: c.bg, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, border: `1px solid ${c.color}18`,
                      }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.glyph}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0d1117", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                          {b.platform}
                        </p>
                        <p style={{ fontSize: 11, color: "#9ba8bb", margin: "2px 0 0" }}>
                          {b.percentage}% do orçamento
                        </p>
                      </div>
                      <p style={{
                        fontSize: 17, fontWeight: 800, color: c.color,
                        margin: 0, flexShrink: 0, letterSpacing: "-0.03em",
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {b.amount}
                      </p>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${b.percentage}%`, background: c.color }} />
                    </div>
                    <p style={{ fontSize: 11.5, color: "#8994a6", lineHeight: 1.55, margin: "10px 0 0" }}>
                      {b.allocation}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═══════════════════════════════════════
              CAMPAIGNS
          ═══════════════════════════════════════ */}
          <section className="rise rise-2" style={{ marginBottom: 24 }}>
            <Heading title="Estrutura de Campanhas" label="Organização" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {plan.campaigns.map((campaign, ci) => {
                const c = pc(campaign.platform);
                return (
                  <div key={ci} className="card" style={{ overflow: "hidden" }}>

                    {/* Campaign header */}
                    <div style={{
                      padding: "16px 24px",
                      borderBottom: "1px solid #e4e8ef",
                      borderLeft: `4px solid ${c.color}`,
                      background: `linear-gradient(90deg, ${c.color}06 0%, transparent 55%)`,
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.01em",
                            color: c.color, background: c.bg,
                            padding: "3px 9px", borderRadius: 5,
                            border: `1px solid ${c.color}22`,
                            whiteSpace: "nowrap" as const, flexShrink: 0,
                          }}>
                            {campaign.platform}
                          </span>
                          {campaign.objective && (
                            <span style={{ fontSize: 12, color: "#9ba8bb" }}>{campaign.objective}</span>
                          )}
                        </div>
                        <h3 style={{
                          fontSize: 14, fontWeight: 700, color: "#0d1117",
                          margin: 0, letterSpacing: "-0.018em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                        }}>
                          {campaign.name}
                        </h3>
                      </div>
                      {campaign.totalBudget && campaign.totalBudget !== "A definir" && (
                        <span style={{
                          fontSize: 17, fontWeight: 800, color: c.color,
                          flexShrink: 0, letterSpacing: "-0.03em",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {campaign.totalBudget}
                        </span>
                      )}
                    </div>

                    {/* Adsets */}
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {campaign.adSets.map((adSet, j) => (
                        <div key={j} className="adset-card">

                          {/* Adset header */}
                          <div style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between", gap: 12,
                            padding: "11px 16px", borderBottom: "1px solid #eaecf2",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: 7,
                                background: c.color, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, color: "white",
                              }}>
                                {j + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: 13, fontWeight: 700, color: "#0d1117",
                                  margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                                }}>
                                  {adSet.name || `Conjunto ${j + 1}`}
                                </p>
                                <p style={{ fontSize: 11, color: "#9ba8bb", margin: "2px 0 0" }}>
                                  {adSet.ads.length} anúncio{adSet.ads.length !== 1 ? "s" : ""}
                                  {adSet.ads.length > 0 && ` · ${[...new Set(adSet.ads.map(a => a.format))].join(", ")}`}
                                </p>
                              </div>
                            </div>
                            {adSet.budget && (
                              <span style={{
                                fontSize: 12, fontWeight: 700, color: c.color,
                                background: c.bg, padding: "4px 12px", borderRadius: 6,
                                border: `1px solid ${c.color}20`, flexShrink: 0,
                              }}>
                                {adSet.budget}/dia
                              </span>
                            )}
                          </div>

                          {/* Adset body */}
                          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                            {adSet.audience && <AudienceRow audience={adSet.audience} color={c.color} />}

                            {adSet.ads.map((ad, k) => (
                              <div key={k} className="ad-item">
                                <div style={{
                                  display: "flex", alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: (ad.copy || ad.fileDataUrl || ad.fileName) ? 10 : 0,
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, color: c.color,
                                      background: c.bg, padding: "2px 8px", borderRadius: 4,
                                      letterSpacing: "0.02em",
                                    }}>
                                      {ad.format}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5a6478" }}>
                                      {ad.name || `Anúncio ${k + 1}`}
                                    </span>
                                  </div>
                                  {ad.copy && <CopyBtn text={cleanCopy(ad.copy)} />}
                                </div>

                                {/* Image (50%) ao lado da copy */}
                                {((ad.fileDataUrl && ad.fileType === "image") || ad.copy) && (
                                  <div style={{
                                    display: "flex",
                                    gap: 14,
                                    alignItems: "flex-start",
                                    flexWrap: "wrap" as const,
                                  }}>
                                    {ad.fileDataUrl && ad.fileType === "image" && (
                                      <div style={{
                                        flex: "0 1 50%",
                                        minWidth: 140,
                                        maxWidth: ad.copy ? "50%" : "100%",
                                      }}>
                                        <img
                                          src={ad.fileDataUrl}
                                          alt={ad.fileName ?? ad.name}
                                          style={{ width: "100%", height: "auto", borderRadius: 8, display: "block", border: "1px solid #e4e8ef" }}
                                        />
                                      </div>
                                    )}
                                    {ad.copy && (
                                      <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <p style={{
                                          fontSize: 13,
                                          color: "#5a6478",
                                          lineHeight: 1.72,
                                          margin: 0,
                                          whiteSpace: "pre-wrap" as const,
                                        }}>
                                          {cleanCopy(ad.copy)}
                                        </p>
                                        {extractPostDate(ad.copy) && (
                                          <span style={{
                                            alignSelf: "flex-start",
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: "#9ba8bb",
                                            background: "#f6f8fa",
                                            border: "1px solid #e4e8ef",
                                            padding: "3px 9px",
                                            borderRadius: 999,
                                            letterSpacing: "0.01em",
                                          }}>
                                            📅 Publicado em {extractPostDate(ad.copy)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {ad.fileName && ad.fileType === "video" && (
                                  <div style={{
                                    display: "flex", alignItems: "center", gap: 8, marginTop: 8,
                                    background: "#f6f8fa", borderRadius: 7, padding: "8px 11px",
                                    border: "1px solid #e4e8ef",
                                  }}>
                                    <span style={{ fontSize: 16 }}>🎬</span>
                                    <span style={{ fontSize: 12, color: "#9ba8bb" }}>{ad.fileName}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═══════════════════════════════════════
              TIMELINE
          ═══════════════════════════════════════ */}
          <section className="rise rise-3">
            <Heading title="Cronograma de Implementação" label="Timeline" />
            <div className="card" style={{ padding: "28px 32px" }}>
              <div style={{ position: "relative", paddingLeft: 52 }}>

                {/* Vertical gradient line */}
                <div style={{
                  position: "absolute", left: 13, top: 14, bottom: 14,
                  width: 2, borderRadius: 2,
                  background: "linear-gradient(to bottom, #0071E3, #16a34a)",
                  opacity: 0.18,
                }} />

                {plan.timeline.map((phase, i) => {
                  const isFirst = i === 0;
                  const isLast  = i === plan.timeline.length - 1;
                  const accent  = isFirst ? "#0071E3" : isLast ? "#16a34a" : "#c8d0db";
                  const nodeBg  = isFirst ? "#0071E3" : isLast ? "#16a34a" : "white";
                  const nodeClr = isFirst || isLast ? "white" : "#9ba8bb";
                  const pillBg  = isFirst ? "#EBF5FF" : isLast ? "#dcfce7" : "#f3f5f8";
                  const pillClr = isFirst ? "#0071E3" : isLast ? "#16a34a" : "#8994a6";

                  return (
                    <div key={i} style={{ position: "relative", marginBottom: i < plan.timeline.length - 1 ? 28 : 0 }}>
                      {/* Node */}
                      <div className="tl-node" style={{
                        background: nodeBg, color: nodeClr,
                        border: `2px solid ${accent}`,
                        boxShadow: isFirst || isLast ? `0 0 0 4px ${accent}18` : "none",
                      }}>
                        {i + 1}
                      </div>

                      {/* Phase row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0d1117", margin: 0, letterSpacing: "-0.02em" }}>
                          {phase.phase}
                        </h3>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: pillClr,
                          background: pillBg, padding: "3px 10px", borderRadius: 6,
                        }}>
                          {phase.duration}
                        </span>
                      </div>

                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                        {phase.actions.map((action, j) => (
                          <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#5a6478", lineHeight: 1.65 }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: "50%",
                              background: accent, flexShrink: 0,
                              marginTop: 8, opacity: 0.55, display: "inline-block",
                            }} />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
