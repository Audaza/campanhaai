"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CampaignPlan } from "@/types/campaign";
import { ArrowLeft, Download, Check, Save, RotateCw, AlertCircle, Sparkles } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import CampaignPDF from "@/components/CampaignPDF";
import { PlatformLogo } from "@/components/PlatformLogo";
import { savePlan } from "@/lib/savedPlans";
import { getHierarchyLabels } from "@/lib/hierarchy";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════ */
const C = {
  bg:        "#f4f6fa",
  surface:   "#ffffff",
  border:    "#e4e8ef",
  borderMid: "#eef0f5",
  text:      "#0d1117",
  subtext:   "#475263",
  muted:     "#8994a6",
  soft:      "#c8d0db",
  brand:     "#0071E3",
  brandDark: "#0057c2",
  brandSoft: "#EBF5FF",
  accent:    "#16a34a",
  accentBg:  "#dcfce7",
} as const;

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function platformsToDisplay(platform: string, all: readonly string[]): string[] {
  const isMeta = platform === "Facebook" || platform === "Instagram";
  const bothMeta = all.includes("Facebook") && all.includes("Instagram");
  if (isMeta && bothMeta) return ["Facebook", "Instagram"];
  return [platform];
}
function platformLabel(platform: string, all: readonly string[]): string {
  const isMeta = platform === "Facebook" || platform === "Instagram";
  const bothMeta = all.includes("Facebook") && all.includes("Instagram");
  if (isMeta && bothMeta) return "Meta (Facebook + Instagram)";
  return platform;
}

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

const PLAT: Record<string, { color: string; bg: string }> = {
  "Meta Ads":    { color: "#1877F2", bg: "rgba(24,119,242,0.09)" },
  "Facebook":    { color: "#1877F2", bg: "rgba(24,119,242,0.09)" },
  "Instagram":   { color: "#E1306C", bg: "rgba(225,48,108,0.09)" },
  "Google Ads":  { color: "#EA4335", bg: "rgba(234,67,53,0.09)"  },
  "TikTok Ads":  { color: "#444cf7", bg: "rgba(68,76,247,0.09)"  },
  "YouTube Ads": { color: "#FF0000", bg: "rgba(255,0,0,0.09)"    },
};
function pc(p: string) {
  if (p.includes("Facebook")) return PLAT["Facebook"];
  if (p.includes("Instagram") && !p.includes("Facebook")) return PLAT["Instagram"];
  return PLAT[p] ?? { color: C.brand, bg: "rgba(0,113,227,0.09)" };
}

/* ═══════════════════════════════════════════════════════
   COMPONENTES REUTILIZÁVEIS
═══════════════════════════════════════════════════════ */

/** Botão de copiar */
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); })}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
        border: ok ? `1px solid ${C.accent}40` : `1px solid ${C.border}`,
        background: ok ? C.accentBg : C.bg,
        color: ok ? C.accent : C.muted,
        cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
        whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {ok ? <><Check size={11} /> Copiado</> : "Copiar"}
    </button>
  );
}

/** Título de seção: eyebrow + h2 + barra */
function SectionTitle({
  eyebrow, title, subtitle, style,
}: { eyebrow: string; title: string; subtitle?: string; style?: CSSProperties }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 4, height: 16, background: C.brand, borderRadius: 2 }} />
        <p style={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em",
          textTransform: "uppercase", color: C.brand, margin: 0,
        }}>
          {eyebrow}
        </p>
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 800, color: C.text,
        margin: 0, letterSpacing: "-0.035em", lineHeight: 1.15,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Chip genérico */
function Chip({ label, color = C.muted, bg = C.borderMid, icon }: {
  label: string; color?: string; bg?: string; icon?: ReactNode;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11.5, fontWeight: 700, color,
      background: bg, padding: "4px 10px", borderRadius: 999,
      border: `1px solid ${color}1a`, letterSpacing: "0.01em",
    }}>
      {icon}
      {label}
    </span>
  );
}

/** Bloco de público-alvo com chips */
function AudienceBlock({ audience, color, label }: { audience: string; color: string; label?: string }) {
  const parts = audience.includes(" · ") ? audience.split(" · ").filter(Boolean) : [audience];
  return (
    <div style={{
      padding: "10px 14px", borderLeft: `3px solid ${color}`,
      background: `${color}09`, borderRadius: "0 10px 10px 0",
    }}>
      <p style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em",
        textTransform: "uppercase", color, margin: "0 0 6px",
      }}>
        {label ?? "Público-alvo"}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {parts.map((part, i) => (
          <span key={i} style={{
            fontSize: 12, color: C.text, background: C.surface,
            border: `1px solid ${color}26`, borderRadius: 999,
            padding: "3px 10px", fontWeight: 500,
          }}>
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PÁGINA
═══════════════════════════════════════════════════════ */
export default function ResultadoPage() {
  const router = useRouter();
  const [plan, setPlan]       = useState<CampaignPlan | null>(null);
  const [isClient, setClient] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setClient(true);
    const raw = sessionStorage.getItem("campaignPlan");
    if (!raw) { router.push("/"); return; }
    setPlan(JSON.parse(raw));
    const id = sessionStorage.getItem("campaignPlanId");
    if (id) setSavedId(id);
  }, [router]);

  function handleSave() {
    if (!plan) return;
    setSaveState("saving");
    try {
      const saved = savePlan(plan, savedId ?? undefined);
      setSavedId(saved.id);
      sessionStorage.setItem("campaignPlanId", saved.id);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2500);
    }
  }

  if (!plan) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg style={{ width: 28, height: 28, animation: "spin 0.8s linear infinite", color: C.brand }} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  /* Stats agregados */
  const totalAdSets = plan.campaigns.reduce((s, c) => s + c.adSets.length, 0);
  const totalAds = plan.campaigns.reduce(
    (s, c) => s + (getHierarchyLabels(c.platform, c.googleCampaignType).hasManualAds
      ? c.adSets.reduce((ss, as) => ss + as.ads.length, 0) : 0), 0);
  const totalFiles = plan.campaigns.reduce((s, c) =>
    s + c.adSets.reduce((ss, as) => ss + as.ads.filter(a => a.fileDataUrl || a.fileName).length, 0), 0);

  const allLabels = plan.campaigns.map(c => getHierarchyLabels(c.platform, c.googleCampaignType));
  const uniqueAdSet = [...new Set(allLabels.map(l => l.adSetPlural))];
  const uniqueAd    = [...new Set(allLabels.map(l => l.adPlural))];
  const adSetStatLabel = uniqueAdSet.length === 1 ? uniqueAdSet[0] : "Conjuntos";
  const adStatLabel    = uniqueAd.length    === 1 ? uniqueAd[0]    : "Anúncios";

  const stats = [
    { label: "Campanhas",      value: plan.campaigns.length },
    { label: adSetStatLabel,   value: totalAdSets },
    ...(totalAds > 0   ? [{ label: adStatLabel, value: totalAds }]         : []),
    ...(totalFiles > 0 ? [{ label: "Criativos", value: totalFiles, accent: true }] : []),
  ];

  const maxBudgetPct = Math.max(...plan.budgetDistribution.map(b => b.percentage), 1);

  /* Estados do botão salvar */
  const saveBtnConfig = {
    saving: { icon: <RotateCw size={13} style={{ animation: "spin 0.8s linear infinite" }} />, label: "Salvando…", bg: C.bg,        color: C.subtext },
    saved:  { icon: <Check size={13} />,                                                        label: savedId ? "Atualizado" : "Salvo", bg: C.accentBg, color: C.accent },
    error:  { icon: <AlertCircle size={13} />,                                                  label: "Erro ao salvar",           bg: "#fee2e2", color: "#dc2626" },
    idle:   { icon: savedId ? <RotateCw size={13} /> : <Save size={13} />,                     label: savedId ? "Atualizar" : "Salvar", bg: C.surface, color: C.subtext },
  }[saveState];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .res-root { font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .rise { animation: riseIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .d-0 { animation-delay: 0.00s; }
        .d-1 { animation-delay: 0.06s; }
        .d-2 { animation-delay: 0.12s; }
        .d-3 { animation-delay: 0.18s; }
        .d-4 { animation-delay: 0.24s; }
        .d-5 { animation-delay: 0.30s; }

        .card {
          background: ${C.surface};
          border: 1px solid ${C.border};
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(13,17,23,0.04), 0 6px 24px rgba(13,17,23,0.03);
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .card-hover:hover {
          box-shadow: 0 4px 8px rgba(13,17,23,0.05), 0 14px 44px rgba(13,17,23,0.06);
          transform: translateY(-1px);
        }

        .topbar-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid transparent;
          cursor: pointer; font-size: 13px; font-weight: 600;
          color: ${C.subtext}; font-family: inherit;
          padding: 7px 12px; border-radius: 8px;
          transition: all 0.18s; letter-spacing: -0.01em;
        }
        .topbar-btn:hover { background: ${C.bg}; color: ${C.text}; }

        .export-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 9px; border: none;
          font-size: 13px; font-weight: 700; font-family: inherit;
          background: ${C.text}; color: white;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(13,17,23,0.2), 0 4px 14px rgba(13,17,23,0.12);
          letter-spacing: -0.015em;
        }
        .export-btn:hover {
          background: #1a2332; transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(13,17,23,0.24), 0 8px 22px rgba(13,17,23,0.18);
        }
        .export-btn:disabled {
          background: ${C.border}; color: ${C.muted}; cursor: not-allowed;
          transform: none; box-shadow: none;
        }

        .stat-cell {
          flex: 1; padding: 18px 16px; text-align: center;
          border-right: 1px solid ${C.border};
          transition: background 0.15s;
        }
        .stat-cell:last-child { border-right: none; }
        .stat-cell:hover { background: #fafbfd; }

        .bar-track { background: ${C.borderMid}; border-radius: 99px; height: 5px; overflow: hidden; }
        .bar-fill {
          height: 100%; border-radius: 99px;
          background-image: linear-gradient(90deg, currentColor 0%, currentColor 100%);
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .adset-card {
          background: ${C.bg}; border-radius: 11px;
          border: 1px solid ${C.borderMid}; overflow: hidden;
          transition: border-color 0.2s;
        }

        .ad-item {
          background: ${C.surface}; border-radius: 9px;
          border: 1px solid ${C.borderMid}; padding: 12px 14px;
          transition: all 0.2s;
        }
        .ad-item:hover {
          box-shadow: 0 2px 10px rgba(13,17,23,0.05);
          border-color: ${C.border};
        }

        .tl-node {
          position: absolute; left: -52px; top: 0;
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; z-index: 1;
          font-variant-numeric: tabular-nums;
        }

        .rec-card {
          display: flex; gap: 14px;
          background: ${C.surface}; border-radius: 11px;
          border: 1px solid ${C.border};
          padding: 16px 18px;
          transition: all 0.2s;
        }
        .rec-card:hover {
          border-color: ${C.brand}40;
          box-shadow: 0 4px 16px rgba(0,113,227,0.08);
          transform: translateY(-1px);
        }

        @media (max-width: 720px) {
          .budget-grid { grid-template-columns: 1fr !important; }
          .hero-row { flex-direction: column !important; align-items: flex-start !important; }
          .hero-budget { text-align: left !important; }
          .stat-cell { padding: 14px 10px; }
        }
      `}</style>

      <div className="res-root" style={{ minHeight: "100vh", background: C.bg }}>

        {/* ═════ TOPBAR ═════ */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(244,246,250,0.82)",
          backdropFilter: "blur(22px) saturate(180%)",
          WebkitBackdropFilter: "blur(22px) saturate(180%)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 58,
        }}>
          <button className="topbar-btn" onClick={() => router.push("/")}>
            <ArrowLeft size={14} />
            Menu
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.brandDark}, #34aadc)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,113,227,0.3)",
            }}>
              <span style={{ fontSize: 13, color: "white", fontWeight: 800, letterSpacing: "-0.03em" }}>C</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-0.025em" }}>
              Campanha Tráfego · Audaza
            </span>
          </div>

          {isClient && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="topbar-btn"
                style={{
                  background: saveBtnConfig.bg,
                  color: saveBtnConfig.color,
                  border: saveState === "saved" ? `1px solid ${C.accent}35` : `1px solid ${C.border}`,
                }}
              >
                {saveBtnConfig.icon}
                {saveBtnConfig.label}
              </button>

              <PDFDownloadLink
                document={<CampaignPDF plan={plan} />}
                fileName={`campanha-${plan.overview.clientName.toLowerCase().replace(/\s+/g, "-")}.pdf`}
              >
                {({ loading: l }) => (
                  <button disabled={l} className="export-btn">
                    <Download size={13} />
                    {l ? "Gerando…" : "Exportar PDF"}
                  </button>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </header>

        <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 120px" }}>

          {/* ═════ HERO / OVERVIEW ═════ */}
          <section className="card rise d-0" style={{ marginBottom: 28, overflow: "hidden" }}>
            <div style={{
              background: `linear-gradient(135deg, #002d6b 0%, ${C.brandDark} 28%, ${C.brand} 62%, #34aadc 100%)`,
              padding: "36px 36px 30px", position: "relative", overflow: "hidden",
            }}>
              {/* Gradient mesh decorativo */}
              <div style={{
                position: "absolute", top: -100, right: -80, width: 340, height: 340,
                borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", bottom: -60, right: 60, width: 200, height: 200,
                borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", top: 24, right: 240, width: 90, height: 90,
                borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none",
              }} />

              {/* Eyebrow */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 20 }}>
                <Sparkles size={13} style={{ color: "rgba(255,255,255,0.85)" }} />
                <p style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.72)", margin: 0,
                }}>
                  Planejamento Estratégico · {new Date().toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="hero-row" style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: 20, flexWrap: "wrap", position: "relative",
              }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h1 style={{
                    fontSize: 34, fontWeight: 800, color: "white", margin: "0 0 6px",
                    letterSpacing: "-0.045em", lineHeight: 1.08,
                  }}>
                    {plan.overview.clientName}
                  </h1>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.45 }}>
                    {plan.overview.product}
                  </p>
                </div>

                <div className="hero-budget" style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{
                    fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.68)",
                    margin: "0 0 6px", letterSpacing: "0.12em", textTransform: "uppercase",
                  }}>
                    {plan.overview.dailyBudget ? "Invest. Diário" : "Orçamento"}
                  </p>
                  <p style={{
                    fontSize: 34, fontWeight: 800, color: "white",
                    margin: 0, letterSpacing: "-0.045em", lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {plan.overview.dailyBudget || plan.overview.totalBudget}
                  </p>
                </div>
              </div>

              {/* Chips da campanha */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 22, position: "relative" }}>
                {[plan.overview.objective, plan.overview.duration, ...plan.overview.platforms].map((tag, i) => (
                  <span key={i} style={{
                    fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.95)",
                    background: "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    padding: "4px 12px", borderRadius: 999,
                    backdropFilter: "blur(6px)",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{ padding: "24px 36px 2px" }}>
              <p style={{
                fontSize: 14.5, color: C.subtext, lineHeight: 1.72, margin: 0, maxWidth: 720,
              }}>
                {plan.overview.summary}
              </p>
            </div>

            {/* Stats strip */}
            <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, marginTop: 24 }}>
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="stat-cell"
                  style={s.accent ? {
                    background: "linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(22,163,74,0.01) 100%)",
                  } : undefined}
                >
                  <p style={{
                    fontSize: 30, fontWeight: 800,
                    color: s.accent ? C.accent : C.text,
                    margin: "0 0 4px", letterSpacing: "-0.05em", lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {s.value}
                  </p>
                  <p style={{
                    fontSize: 10.5, fontWeight: 700,
                    color: s.accent ? C.accent : C.muted,
                    margin: 0, letterSpacing: "0.09em", textTransform: "uppercase",
                  }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ═════ ORÇAMENTO ═════ */}
          <section className="rise d-1" style={{ marginBottom: 32 }}>
            <SectionTitle
              eyebrow="Investimento"
              title="Distribuição de Orçamento"
              subtitle="Como o valor total é alocado entre as plataformas selecionadas"
            />
            <div className="budget-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {plan.budgetDistribution.map((b, i) => {
                const c = pc(b.platform);
                const relW = (b.percentage / maxBudgetPct) * 100;
                return (
                  <div key={i} className="card card-hover" style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
                      <div style={{
                        width: 42, height: 42, background: C.surface, borderRadius: 11,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, border: `1px solid ${C.border}`,
                        boxShadow: "0 1px 3px rgba(13,17,23,0.05)",
                      }}>
                        <PlatformLogo platform={b.platform} size={24} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 700, color: C.text, margin: 0,
                          letterSpacing: "-0.015em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {b.platform}
                        </p>
                        <p style={{ fontSize: 11.5, color: C.muted, margin: "2px 0 0" }}>
                          {b.percentage}% do orçamento total
                        </p>
                      </div>
                      <p style={{
                        fontSize: 20, fontWeight: 800, color: c.color,
                        margin: 0, flexShrink: 0, letterSpacing: "-0.04em",
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {b.amount}
                      </p>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${relW}%`, color: c.color }} />
                    </div>
                    {b.allocation && (
                      <p style={{ fontSize: 12, color: C.subtext, lineHeight: 1.6, margin: "12px 0 0" }}>
                        {b.allocation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═════ ESTRUTURA DE CAMPANHAS ═════ */}
          <section className="rise d-2" style={{ marginBottom: 32 }}>
            <SectionTitle
              eyebrow="Organização"
              title="Estrutura de Campanhas"
              subtitle="Hierarquia completa: campanhas → conjuntos → anúncios"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Google Ads Config card */}
              {plan.googleAdsConfig && (() => {
                const g = plan.googleAdsConfig!;
                const gcolor = "#EA4335";
                const rows: { label: string; value?: string }[] = [
                  { label: "Idioma",              value: g.language },
                  { label: "Palavras-chave",      value: g.keywords },
                  { label: "Kw negativas",        value: g.negativeKeywords },
                  { label: "URL destino",         value: g.finalUrl },
                  { label: "Sinais de público",   value: g.audienceSignals },
                  { label: "Categorias",          value: g.shoppingCategories },
                  { label: "Vídeo YouTube",       value: g.youtubeVideoUrl },
                  { label: "Formato vídeo",       value: g.videoFormat },
                  { label: "Formato Demand Gen",  value: g.demandGenFormat },
                ].filter(r => !!r.value);
                return (
                  <div className="card" style={{ overflow: "hidden", borderLeft: `3px solid ${gcolor}` }}>
                    <div style={{
                      padding: "14px 22px",
                      background: `${gcolor}08`,
                      borderBottom: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${gcolor}16`,
                        border: `1px solid ${gcolor}26`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, fontWeight: 800, color: gcolor,
                      }}>
                        G
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em",
                          color: gcolor, textTransform: "uppercase",
                        }}>
                          Configuração Google Ads
                        </div>
                        <div style={{
                          fontSize: 15, fontWeight: 700, color: C.text,
                          marginTop: 3, letterSpacing: "-0.018em",
                        }}>
                          {g.campaignType}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 11 }}>
                      {rows.map((row, i) => (
                        <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: C.muted,
                            letterSpacing: "0.09em", width: 140, flexShrink: 0,
                            textTransform: "uppercase", paddingTop: 3,
                          }}>
                            {row.label}
                          </span>
                          <span style={{
                            fontSize: 13, color: C.text, flex: 1, lineHeight: 1.6, wordBreak: "break-word",
                          }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Campaigns */}
              {plan.campaigns.map((campaign, ci) => {
                const c = pc(campaign.platform);
                const campaignLabels = getHierarchyLabels(campaign.platform, campaign.googleCampaignType);
                return (
                  <div key={ci} className="card" style={{ overflow: "hidden" }}>

                    {/* Header campanha */}
                    <div style={{
                      padding: "18px 24px",
                      borderBottom: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${c.color}`,
                      background: `linear-gradient(90deg, ${c.color}08 0%, transparent 55%)`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 16, flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.01em",
                            color: c.color, background: c.bg,
                            padding: "3px 10px", borderRadius: 5,
                            border: `1px solid ${c.color}22`,
                            whiteSpace: "nowrap", flexShrink: 0,
                          }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              {platformsToDisplay(campaign.platform, plan.overview.platforms).map(plt => (
                                <PlatformLogo key={plt} platform={plt} size={12} />
                              ))}
                            </span>
                            {platformLabel(campaign.platform, plan.overview.platforms)}
                          </span>
                          {campaign.googleCampaignType && (
                            <Chip label={campaign.googleCampaignType} color={c.color} bg={c.bg} />
                          )}
                          {campaign.objective && (
                            <span style={{ fontSize: 12, color: C.muted }}>· {campaign.objective}</span>
                          )}
                        </div>
                        <h3 style={{
                          fontSize: 16, fontWeight: 700, color: C.text,
                          margin: 0, letterSpacing: "-0.02em", lineHeight: 1.3,
                        }}>
                          {campaign.name}
                        </h3>
                      </div>
                      {campaign.totalBudget && campaign.totalBudget !== "A definir" && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 2px", letterSpacing: "0.09em", textTransform: "uppercase" }}>
                            Orçamento
                          </p>
                          <p style={{
                            fontSize: 19, fontWeight: 800, color: c.color,
                            margin: 0, letterSpacing: "-0.035em", lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {campaign.totalBudget}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* AdSets */}
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {campaign.adSets.map((adSet, j) => (
                        <div key={j} className="adset-card">

                          {/* Header adset */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: 12, padding: "12px 16px",
                            borderBottom: `1px solid ${C.borderMid}`, background: C.surface,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: c.color, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 800, color: "white",
                                fontVariantNumeric: "tabular-nums",
                              }}>
                                {j + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: 13.5, fontWeight: 700, color: C.text,
                                  margin: 0, letterSpacing: "-0.015em",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {adSet.name || `${campaignLabels.adSet} ${j + 1}`}
                                </p>
                                <p style={{ fontSize: 11.5, color: C.muted, margin: "2px 0 0" }}>
                                  {campaignLabels.hasManualAds
                                    ? `${adSet.ads.length} ${(adSet.ads.length === 1 ? campaignLabels.ad : campaignLabels.adPlural).toLowerCase()}${adSet.ads.length > 0 ? ` · ${[...new Set(adSet.ads.map(a => a.format))].join(", ")}` : ""}`
                                    : "Filtro de feed · sem anúncios manuais"}
                                </p>
                              </div>
                            </div>
                            {adSet.budget && (
                              <span style={{
                                fontSize: 12, fontWeight: 700, color: c.color,
                                background: c.bg, padding: "5px 12px", borderRadius: 7,
                                border: `1px solid ${c.color}22`, flexShrink: 0,
                              }}>
                                {adSet.budget}/dia
                              </span>
                            )}
                          </div>

                          {/* Body adset */}
                          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                            {adSet.audience && (
                              <AudienceBlock audience={adSet.audience} color={c.color} label={campaignLabels.audienceLabel} />
                            )}

                            {campaignLabels.hasManualAds && adSet.ads.map((ad, k) => (
                              <div key={k} className="ad-item">
                                <div style={{
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  marginBottom: (ad.copy || ad.fileDataUrl || ad.fileName) ? 10 : 0,
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, color: c.color,
                                      background: c.bg, padding: "2.5px 8px", borderRadius: 4,
                                      letterSpacing: "0.02em",
                                    }}>
                                      {ad.format}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.subtext }}>
                                      {ad.name || `${campaignLabels.ad} ${k + 1}`}
                                    </span>
                                  </div>
                                  {ad.copy && <CopyBtn text={cleanCopy(ad.copy)} />}
                                </div>

                                {/* Imagem + copy */}
                                {((ad.fileDataUrl && ad.fileType === "image") || ad.copy) && (
                                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                                    {ad.fileDataUrl && ad.fileType === "image" && (
                                      <div style={{
                                        flex: "0 1 50%", minWidth: 140,
                                        maxWidth: ad.copy ? "50%" : "100%",
                                      }}>
                                        <img
                                          src={ad.fileDataUrl}
                                          alt={ad.fileName ?? ad.name}
                                          style={{
                                            width: "100%", height: "auto",
                                            borderRadius: 8, display: "block",
                                            border: `1px solid ${C.border}`,
                                          }}
                                        />
                                      </div>
                                    )}
                                    {ad.copy && (
                                      <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <p style={{
                                          fontSize: 13, color: C.subtext,
                                          lineHeight: 1.72, margin: 0, whiteSpace: "pre-wrap",
                                        }}>
                                          {cleanCopy(ad.copy)}
                                        </p>
                                        {extractPostDate(ad.copy) && (
                                          <span style={{
                                            alignSelf: "flex-start",
                                            fontSize: 11, fontWeight: 500, color: C.muted,
                                            background: C.bg, border: `1px solid ${C.border}`,
                                            padding: "3px 10px", borderRadius: 999,
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
                                    background: C.bg, borderRadius: 7, padding: "8px 11px",
                                    border: `1px solid ${C.border}`,
                                  }}>
                                    <span style={{ fontSize: 16 }}>🎬</span>
                                    <span style={{ fontSize: 12, color: C.muted }}>{ad.fileName}</span>
                                  </div>
                                )}
                              </div>
                            ))}

                            {!campaignLabels.hasManualAds && (
                              <div style={{
                                background: "rgba(234,67,53,0.05)", borderRadius: 8,
                                border: "1px dashed rgba(234,67,53,0.25)",
                                padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start",
                              }}>
                                <span style={{ fontSize: 16 }}>
                                  {campaign.googleCampaignType === "Performance Max" ? "⚡" : "🛍️"}
                                </span>
                                <p style={{ fontSize: 12.5, color: C.subtext, margin: 0, lineHeight: 1.6 }}>
                                  {campaign.googleCampaignType === "Performance Max"
                                    ? "Grupo de Recursos — contém títulos, descrições, imagens, vídeos e sinais de público. O Google monta os criativos automaticamente."
                                    : "Sem anúncios manuais — criativos gerados a partir do feed do Merchant Center, filtrados por este grupo."}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═════ CRONOGRAMA ═════ */}
          {plan.timeline && plan.timeline.length > 0 && (
          <section className="rise d-3" style={{ marginBottom: 32 }}>
            <SectionTitle
              eyebrow="Timeline"
              title="Cronograma de Implementação"
              subtitle="Fases ordenadas de execução, do briefing ao otimização"
            />
            <div className="card" style={{ padding: "32px 36px" }}>
              <div style={{ position: "relative", paddingLeft: 54 }}>
                {/* Linha vertical gradiente */}
                <div style={{
                  position: "absolute", left: 14, top: 16, bottom: 16,
                  width: 2, borderRadius: 2,
                  background: `linear-gradient(to bottom, ${C.brand}, ${C.accent})`,
                  opacity: 0.22,
                }} />

                {plan.timeline.map((phase, i) => {
                  const isFirst = i === 0;
                  const isLast  = i === plan.timeline.length - 1;
                  const accent  = isFirst ? C.brand : isLast ? C.accent : C.soft;
                  const nodeBg  = isFirst ? C.brand : isLast ? C.accent : C.surface;
                  const nodeClr = isFirst || isLast ? "white" : C.muted;
                  const pillBg  = isFirst ? C.brandSoft : isLast ? C.accentBg : C.bg;
                  const pillClr = isFirst ? C.brand : isLast ? C.accent : C.subtext;

                  return (
                    <div key={i} style={{ position: "relative", marginBottom: i < plan.timeline.length - 1 ? 30 : 0 }}>
                      <div className="tl-node" style={{
                        background: nodeBg, color: nodeClr,
                        border: `2px solid ${accent}`,
                        boxShadow: isFirst || isLast ? `0 0 0 4px ${accent}20` : "none",
                      }}>
                        {i + 1}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.022em" }}>
                          {phase.phase}
                        </h3>
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, color: pillClr,
                          background: pillBg, padding: "3px 11px", borderRadius: 7,
                          border: `1px solid ${pillClr}22`,
                        }}>
                          {phase.duration}
                        </span>
                      </div>

                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                        {phase.actions.map((action, j) => (
                          <li key={j} style={{
                            display: "flex", alignItems: "flex-start", gap: 9,
                            fontSize: 13.5, color: C.subtext, lineHeight: 1.65,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: accent, flexShrink: 0,
                              marginTop: 8, opacity: 0.65, display: "inline-block",
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
          )}

          {/* ═════ RECOMENDAÇÕES ═════ */}
          {plan.recommendations && plan.recommendations.length > 0 && (
            <section className="rise d-4">
              <SectionTitle
                eyebrow="Best Practices"
                title="Recomendações Estratégicas"
                subtitle="Boas práticas para potencializar resultados e maximizar ROAS"
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.recommendations.map((rec, i) => (
                  <div key={i} className="rec-card">
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: C.brandSoft,
                      border: `1px solid ${C.brand}26`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 800, color: C.brand,
                        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em",
                      }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, color: C.text, margin: 0, lineHeight: 1.65, flex: 1 }}>
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>
    </>
  );
}
