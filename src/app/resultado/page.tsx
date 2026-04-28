"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CampaignPlan } from "@/types/campaign";
import { ArrowLeft, Download, Check, Save, RotateCw, AlertCircle, DollarSign, Target, Layers, FileText, Calendar, MapPin, Activity } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import CampaignPDF from "@/components/CampaignPDF";
import { PlatformLogo } from "@/components/PlatformLogo";
import { savePlan } from "@/lib/savedPlans";
import { getHierarchyLabels } from "@/lib/hierarchy";
import BrandHeader from "@/components/BrandHeader";
import ThemeToggle from "@/components/ThemeToggle";
import { parseRSA, extractDomain } from "@/lib/rsaFormat";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — referenciam variáveis CSS para adaptar
   automaticamente entre tema dark/light.
═══════════════════════════════════════════════════════ */
const C = {
  bg:        "var(--bg)",
  surface:   "var(--surface)",
  surface2:  "var(--surface-2)",
  border:    "var(--border)",
  borderMid: "var(--border-mid)",
  text:      "var(--text)",
  subtext:   "var(--text-dim)",
  muted:     "var(--muted)",
  soft:      "var(--muted-2)",
  brand:     "var(--primary)",
  brandDark: "var(--primary-dark)",
  brandCool: "var(--primary-cool)",
  brandSoft: "var(--primary-dim)",
  accent:    "var(--success)",
  accentBg:  "var(--success-dim)",
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
        border: ok ? "1px solid rgba(91,227,138,0.35)" : `1px solid ${C.border}`,
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

/** Título de seção: eyebrow + h2 + barra (estilo /apps) */
function SectionTitle({
  eyebrow, title, subtitle, style,
}: { eyebrow: string; title: string; subtitle?: string; style?: CSSProperties }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 4, height: 14, background: C.brand, borderRadius: 2 }} />
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
          textTransform: "uppercase", color: C.brand, margin: 0,
        }}>
          {eyebrow}
        </p>
      </div>
      <h2 className="font-display" style={{
        fontSize: 26, fontWeight: 500, color: C.text,
        margin: 0, letterSpacing: "-0.035em", lineHeight: 1.1,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0", lineHeight: 1.55, fontWeight: 300 }}>
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
   RSA estruturado — títulos + descrições organizados
═══════════════════════════════════════════════════════ */
function RSAStructured({ copy, color }: { copy: string; color: string }) {
  const { titles, descriptions } = parseRSA(copy);
  if (!titles.length && !descriptions.length) {
    return (
      <p style={{ fontSize: 13, color: C.subtext, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
        {copy}
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* ─── Títulos ─── */}
      {titles.length > 0 && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              background: `${color}1f`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>T</span>
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 700, color,
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Títulos
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: C.muted,
              fontVariantNumeric: "tabular-nums",
            }}>
              {titles.length}/15
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {titles.map((t, i) => {
              const over = t.length > 30;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 10px",
                  background: C.surface,
                  border: `1px solid ${over ? "#dc262640" : C.border}`,
                  borderRadius: 7,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: C.surface2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9.5, fontWeight: 700, color: C.muted,
                    flexShrink: 0, fontVariantNumeric: "tabular-nums",
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 13, color: C.text, lineHeight: 1.4,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t}
                  </span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600,
                    color: over ? "#dc2626" : t.length > 25 ? "#d97706" : C.muted,
                    fontVariantNumeric: "tabular-nums", flexShrink: 0,
                  }}>
                    {t.length}/30
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Divisor visual entre Títulos e Descrições ─── */}
      {titles.length > 0 && descriptions.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "16px 0 14px",
        }}>
          <div style={{
            flex: 1, height: 1,
            background: `linear-gradient(90deg, transparent, ${C.borderMid}, transparent)`,
          }} />
          <span style={{
            fontSize: 9.5, fontWeight: 700, color: C.muted,
            letterSpacing: "0.16em", textTransform: "uppercase",
            padding: "3px 9px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 99,
          }}>
            ↓ Descrições ↓
          </span>
          <div style={{
            flex: 1, height: 1,
            background: `linear-gradient(90deg, transparent, ${C.borderMid}, transparent)`,
          }} />
        </div>
      )}

      {/* ─── Descrições ─── */}
      {descriptions.length > 0 && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              background: `${color}1f`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>D</span>
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 700, color,
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Descrições
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: C.muted,
              fontVariantNumeric: "tabular-nums",
            }}>
              {descriptions.length}/4
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {descriptions.map((d, i) => {
              const over = d.length > 90;
              return (
                <div key={i} style={{
                  padding: "9px 12px",
                  background: C.surface,
                  border: `1px solid ${over ? "#dc262640" : C.border}`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 7,
                  position: "relative",
                }}>
                  <p style={{
                    fontSize: 13, color: C.text, lineHeight: 1.55,
                    margin: 0, paddingRight: 50,
                  }}>
                    {d}
                  </p>
                  <span style={{
                    position: "absolute", top: 9, right: 12,
                    fontSize: 10.5, fontWeight: 600,
                    color: over ? "#dc2626" : d.length > 80 ? "#d97706" : C.muted,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {d.length}/90
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRÉ-VISUALIZAÇÕES — mockups de como o anúncio vai aparecer
═══════════════════════════════════════════════════════ */

/** Resultado patrocinado na pesquisa do Google */
function SearchAdPreview({
  copy, finalUrl, clientName,
}: { copy: string; finalUrl?: string; clientName: string }) {
  const { titles, descriptions } = parseRSA(copy);
  if (!titles.length && !descriptions.length) return null;

  const top3 = titles.slice(0, 3);
  const headline = top3.length > 0 ? top3.join(" | ") : clientName;
  const desc = descriptions.slice(0, 2).join(" ").trim() || "Saiba mais sobre nossos serviços.";
  const host = extractDomain(finalUrl) || "seusite.com.br";
  const initial = (clientName || "S")[0].toUpperCase();

  return (
    <div className="card" style={{
      padding: 22, marginBottom: 12,
    }}>
      {/* Browser bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingBottom: 12, marginBottom: 16,
        borderBottom: `1px solid ${C.borderMid}`,
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fc625d" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fdbc40" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#34c84a" }} />
        </div>
        <div style={{
          flex: 1, marginLeft: 8,
          fontSize: 11, color: C.muted,
          padding: "4px 10px", borderRadius: 6,
          background: C.surface, border: `1px solid ${C.border}`,
        }}>
          🔍&nbsp; google.com/search?q={(clientName || "").toLowerCase().split(" ")[0] || "audaza"}
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 600, color: C.muted,
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Pré-visualização
        </span>
      </div>

      {/* Sponsored row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: C.text,
        }}>
          Patrocinado
        </span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.muted }} />
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: C.surface2, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: C.subtext,
        }}>
          {initial}
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.2 }}>
            {clientName.length > 28 ? clientName.substring(0, 28) + "…" : clientName}
          </p>
          <p style={{ fontSize: 11, color: C.subtext, margin: "1px 0 0", lineHeight: 1 }}>
            {host}
          </p>
        </div>
      </div>

      {/* Headline (azul Google) */}
      <h4 style={{
        fontSize: 19,
        color: "#1a0dab",
        fontWeight: 400,
        letterSpacing: "-0.005em",
        margin: "8px 0 4px",
        lineHeight: 1.3,
      }}>
        {headline.length > 110 ? headline.substring(0, 108) + "…" : headline}
      </h4>

      {/* Descrição */}
      <p style={{
        fontSize: 13.5, color: C.subtext,
        lineHeight: 1.55, margin: 0,
      }}>
        {desc.length > 200 ? desc.substring(0, 197) + "…" : desc}
      </p>
    </div>
  );
}

/** Cartão patrocinado do Google Maps / Meu Negócio */
function LocalAdPreview({
  clientName, product, finalUrl, location,
}: { clientName: string; product: string; finalUrl?: string; location?: string }) {
  const host = extractDomain(finalUrl);
  const initial = (clientName || "?")[0].toUpperCase();

  return (
    <div className="card" style={{
      padding: 22, marginBottom: 12,
    }}>
      {/* Maps bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingBottom: 12, marginBottom: 16,
        borderBottom: `1px solid ${C.borderMid}`,
      }}>
        <span style={{ fontSize: 14 }}>📍</span>
        <div style={{
          flex: 1,
          fontSize: 11, color: C.muted,
          padding: "4px 10px", borderRadius: 6,
          background: C.surface, border: `1px solid ${C.border}`,
        }}>
          google.com/maps · próximo a você
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 600, color: C.muted,
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Pré-visualização local
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Thumb */}
        <div style={{
          width: 96, height: 96, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.brand}22, ${C.brand}05)`,
          border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 38, fontWeight: 700, color: C.brand,
          fontFamily: "var(--font-display)",
        }}>
          {initial}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <h4 className="font-display" style={{
              fontSize: 16, fontWeight: 500, color: C.text,
              margin: 0, letterSpacing: "-0.022em", lineHeight: 1.25,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              flex: 1,
            }}>
              {clientName}
            </h4>
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: "#92400e",
              background: "#fef3c7", border: "1px solid #fbbf24",
              padding: "2px 7px", borderRadius: 4,
              letterSpacing: "0.05em", flexShrink: 0,
            }}>
              PATROCINADO
            </span>
          </div>

          {/* Estrelas + categoria */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, color: "#f59e0b",
            }}>
              4,8
            </span>
            <div style={{ display: "flex", gap: 1 }}>
              {[0,1,2,3,4].map(i => (
                <svg key={i} width={11} height={11} viewBox="0 0 10 10">
                  <path d="M5 0.5L6.4 3.3L9.5 3.7L7.2 5.9L7.7 9L5 7.5L2.3 9L2.8 5.9L0.5 3.7L3.6 3.3z" fill="#f59e0b" />
                </svg>
              ))}
            </div>
            <span style={{ fontSize: 11.5, color: C.muted }}>(142 avaliações)</span>
          </div>

          <p style={{
            fontSize: 13, color: C.subtext, margin: "6px 0 0", lineHeight: 1.5,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {product}
          </p>

          {location && (
            <p style={{
              fontSize: 12, color: C.muted, margin: "3px 0 0",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span>📍</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {location}
              </span>
            </p>
          )}

          {/* Botões mock */}
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {host && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "5px 11px", borderRadius: 6,
                background: C.brand, color: "white",
                fontSize: 11.5, fontWeight: 600,
              }}>
                Site
              </span>
            )}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 11px", borderRadius: 6,
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.subtext, fontSize: 11.5, fontWeight: 600,
            }}>
              Como chegar
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 11px", borderRadius: 6,
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.subtext, fontSize: 11.5, fontWeight: 600,
            }}>
              Ligar
            </span>
          </div>
        </div>
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
        *, *::before, *::after { box-sizing: border-box; }

        .res-root { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .display { font-family: 'Space Grotesk', 'Inter', sans-serif; letter-spacing: -0.02em; }

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
          transition: border-color 0.25s, background 0.25s, transform 0.25s;
        }
        .card-hover:hover {
          border-color: ${C.borderMid};
          background: ${C.surface2};
          transform: translateY(-1px);
        }

        .topbar-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid transparent;
          cursor: pointer; font-size: 13px; font-weight: 500;
          color: ${C.muted}; font-family: inherit;
          padding: 7px 12px; border-radius: 8px;
          transition: all 0.18s; letter-spacing: -0.01em;
        }
        .topbar-btn:hover { background: ${C.surface}; color: ${C.text}; border-color: ${C.border}; }

        .export-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 10px; border: none;
          font-size: 13px; font-weight: 600; font-family: inherit;
          background: linear-gradient(135deg, ${C.brand}, ${C.brandDark});
          color: white;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(91,158,255,0.35);
          letter-spacing: -0.01em;
        }
        .export-btn:hover {
          filter: brightness(1.08); transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(91,158,255,0.45);
        }
        .export-btn:disabled {
          background: ${C.surface2}; color: ${C.muted}; cursor: not-allowed;
          transform: none; box-shadow: none; filter: none;
        }

        .stat-cell {
          flex: 1; padding: 18px 16px; text-align: center;
          border-right: 1px solid ${C.border};
          transition: background 0.15s;
        }
        .stat-cell:last-child { border-right: none; }
        .stat-cell:hover { background: ${C.surface2}; }

        .bar-track { background: ${C.borderMid}; border-radius: 99px; height: 5px; overflow: hidden; }
        .bar-fill {
          height: 100%; border-radius: 99px;
          background-image: linear-gradient(90deg, currentColor 0%, currentColor 100%);
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .adset-card {
          background: rgba(255,255,255,0.02); border-radius: 11px;
          border: 1px solid ${C.border}; overflow: hidden;
          transition: border-color 0.2s, background 0.2s;
        }
        .adset-card:hover { border-color: ${C.borderMid}; background: ${C.surface}; }

        .ad-item {
          background: ${C.surface2}; border-radius: 9px;
          border: 1px solid ${C.border}; padding: 12px 14px;
          transition: all 0.2s;
        }
        .ad-item:hover {
          background: rgba(255,255,255,0.10);
          border-color: ${C.borderMid};
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
          border-color: rgba(91,158,255,0.35);
          box-shadow: 0 4px 16px rgba(0,113,227,0.08);
          transform: translateY(-1px);
        }

        /* ── Dashboard layout (Audaza Digital style) ── */
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .dash-stat {
          background: ${C.surface};
          border: 1px solid ${C.border};
          border-radius: 14px;
          padding: 22px 22px 24px;
          display: flex; flex-direction: column;
          transition: border-color 0.2s, transform 0.2s, background 0.2s;
          position: relative;
          overflow: hidden;
        }
        .dash-stat:hover {
          transform: translateY(-2px);
          border-color: var(--border-mid);
          background: var(--surface-2);
        }
        .dash-stat::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: 0;
          height: 3px; opacity: 0.85;
        }
        .dash-stat--blue::after   { background: linear-gradient(90deg, transparent, #5b9eff, transparent); }
        .dash-stat--mint::after   { background: linear-gradient(90deg, transparent, #5be3c2, transparent); }
        .dash-stat--amber::after  { background: linear-gradient(90deg, transparent, #f5c45b, transparent); }
        .dash-stat--purple::after { background: linear-gradient(90deg, transparent, #b78fff, transparent); }

        .dash-stat__icon {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .dash-stat--blue   .dash-stat__icon { background: rgba(91,158,255,0.15);  color: #5b9eff; }
        .dash-stat--mint   .dash-stat__icon { background: rgba(91,227,194,0.16);  color: #5be3c2; }
        .dash-stat--amber  .dash-stat__icon { background: rgba(245,196,91,0.16);  color: #f5c45b; }
        .dash-stat--purple .dash-stat__icon { background: rgba(183,143,255,0.16); color: #b78fff; }

        :root[data-theme="light"] .dash-stat--blue   .dash-stat__icon { background: rgba(91,158,255,0.10); }
        :root[data-theme="light"] .dash-stat--mint   .dash-stat__icon { background: rgba(91,227,194,0.14); }
        :root[data-theme="light"] .dash-stat--amber  .dash-stat__icon { background: rgba(245,196,91,0.14); }
        :root[data-theme="light"] .dash-stat--purple .dash-stat__icon { background: rgba(183,143,255,0.14); }

        .dash-stat__label {
          font-size: 13px; color: ${C.muted};
          margin: 0 0 8px; font-weight: 400;
        }
        .dash-stat__value {
          font-size: 30px; font-weight: 500; color: ${C.text};
          margin: 0; letter-spacing: -0.04em; line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .dash-stat__sub {
          font-size: 12px; color: ${C.muted};
          margin: 8px 0 0; font-weight: 400;
        }

        /* Mini metrics strip */
        .dash-mini {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0;
          background: ${C.surface};
          border: 1px solid ${C.border};
          border-radius: 14px;
          overflow: hidden;
        }
        .dash-mini__cell {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px;
          border-right: 1px solid ${C.border};
        }
        .dash-mini__cell:last-child { border-right: none; }
        .dash-mini__icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dash-mini__label {
          font-size: 11px; color: ${C.muted}; margin: 0;
          letter-spacing: 0.04em; font-weight: 500;
        }
        .dash-mini__value {
          font-size: 15px; font-weight: 500; color: ${C.text};
          margin: 2px 0 0; letter-spacing: -0.015em; line-height: 1.2;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        @media (max-width: 720px) {
          .dash-mini__cell { border-right: none; border-bottom: 1px solid ${C.border}; }
          .dash-mini__cell:last-child { border-bottom: none; }
        }

        /* Table */
        .dash-table__head {
          display: flex; gap: 14px;
          padding: 14px 22px;
          background: var(--surface-2);
          border-bottom: 1px solid ${C.border};
          font-size: 10.5px; font-weight: 600; color: ${C.muted};
          letter-spacing: 0.08em;
        }
        .dash-table__row {
          display: flex; gap: 14px; align-items: center;
          padding: 14px 22px;
          border-bottom: 1px solid ${C.border};
          transition: background 0.15s;
        }
        .dash-table__row:last-child { border-bottom: none; }
        .dash-table__row:hover { background: var(--surface-2); }

        @media (max-width: 720px) {
          .budget-grid { grid-template-columns: 1fr !important; }
          .hero-row { flex-direction: column !important; align-items: flex-start !important; }
          .hero-budget { text-align: left !important; }
          .stat-cell { padding: 14px 10px; }
          .dash-table__head, .dash-table__row { font-size: 11px; padding: 10px 14px; gap: 8px; }
        }
      `}</style>

      <div className="res-root" style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

        {/* ═════ TOPBAR ═════ */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--topbar-bg)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          borderBottom: "1px solid var(--topbar-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 58,
        }}>
          <button className="topbar-btn" onClick={() => router.push("/")}>
            <ArrowLeft size={14} />
            Menu
          </button>

          <BrandHeader />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isClient && (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className="topbar-btn"
                  style={{
                    background: saveBtnConfig.bg,
                    color: saveBtnConfig.color,
                    border: saveState === "saved" ? "1px solid rgba(91,227,138,0.30)" : `1px solid ${C.border}`,
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
              </>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 120px" }}>

          {/* ═════ IDENTITY STRIP ═════ */}
          <section className="rise d-0" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{
                  fontSize: 10, fontWeight: 600, color: C.brand,
                  letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 8px",
                }}>
                  Planejamento · {new Date().toLocaleDateString("pt-BR")}
                </p>
                <h1 className="font-display" style={{
                  fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, color: C.text,
                  margin: 0, letterSpacing: "-0.04em", lineHeight: 1.05,
                }}>
                  {plan.overview.clientName}
                </h1>
                <p style={{
                  fontSize: 14, color: C.subtext, margin: "8px 0 0", lineHeight: 1.5, fontWeight: 300,
                }}>
                  {plan.overview.product}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                {plan.overview.platforms.map((p, i) => {
                  const c = pc(p);
                  return (
                    <span key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12, fontWeight: 500, color: c.color,
                      background: c.bg, border: `1px solid ${c.color}26`,
                      padding: "5px 11px", borderRadius: 8,
                    }}>
                      <PlatformLogo platform={p} size={13} />
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ═════ HERO STATS — 4 cards ═════ */}
          <section className="rise d-1" style={{ marginBottom: 18 }}>
            <div className="dash-grid">
              {(() => {
                const items = [
                  {
                    icon: DollarSign, color: "blue",
                    label: plan.overview.dailyBudget ? "Investimento diário" : "Investimento total",
                    value: plan.overview.dailyBudget || plan.overview.totalBudget,
                    sub: plan.overview.dailyBudget ? `× ${plan.overview.duration}` : `${plan.overview.duration}`,
                  },
                  {
                    icon: Target, color: "mint",
                    label: "Campanhas",
                    value: String(plan.campaigns.length),
                    sub: `${plan.overview.platforms.length} ${plan.overview.platforms.length === 1 ? "plataforma" : "plataformas"}`,
                  },
                  {
                    icon: Layers, color: "amber",
                    label: adSetStatLabel,
                    value: String(totalAdSets),
                    sub: `por campanha: ${(totalAdSets / Math.max(plan.campaigns.length, 1)).toFixed(0)}`,
                  },
                  ...(totalAds > 0 ? [{
                    icon: FileText, color: "purple",
                    label: adStatLabel,
                    value: String(totalAds),
                    sub: `por grupo: ${(totalAds / Math.max(totalAdSets, 1)).toFixed(0)}`,
                  }] : []),
                ];
                return items.map((s, i) => (
                  <div key={i} className={`dash-stat dash-stat--${s.color}`}>
                    <div className="dash-stat__icon">
                      <s.icon size={18} strokeWidth={1.8} />
                    </div>
                    <p className="dash-stat__label">{s.label}</p>
                    <p className="dash-stat__value font-display">{s.value}</p>
                    <p className="dash-stat__sub">{s.sub}</p>
                  </div>
                ));
              })()}
            </div>
          </section>

          {/* ═════ SECONDARY STRIP — 4 small ═════ */}
          <section className="rise d-2" style={{ marginBottom: 28 }}>
            <div className="dash-mini">
              {[
                { icon: Calendar, label: "Período",     value: plan.overview.duration,                color: C.brand },
                { icon: MapPin,   label: "Localização", value: plan.overview.location || "Não definida", color: "#5be3c2" },
                { icon: Target,   label: "Objetivo",    value: plan.overview.objective,               color: "#f5c45b" },
                { icon: Activity, label: "Plataformas", value: `${plan.overview.platforms.length}`,   color: "#b78fff" },
              ].map((m, i) => (
                <div key={i} className="dash-mini__cell">
                  <div className="dash-mini__icon" style={{ background: `${m.color}1a`, color: m.color }}>
                    <m.icon size={15} strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="dash-mini__label">{m.label}</p>
                    <p className="dash-mini__value font-display">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═════ RESUMO ESTRATÉGICO ═════ */}
          <section className="rise d-2" style={{ marginBottom: 28 }}>
            <div className="card" style={{ padding: "20px 24px" }}>
              <p style={{
                fontSize: 10, fontWeight: 600, color: C.brand,
                letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 8px",
              }}>
                Resumo Estratégico
              </p>
              <p style={{
                fontSize: 14.5, color: C.subtext, lineHeight: 1.7, margin: 0, fontWeight: 300,
                maxWidth: 780,
              }}>
                {plan.overview.summary}
              </p>
            </div>
          </section>

          {/* ═════ TABELA — Detalhamento por plataforma ═════ */}
          <section className="rise d-3" style={{ marginBottom: 32 }}>
            <SectionTitle
              eyebrow="Investimento"
              title="Detalhamento por plataforma"
              subtitle="Como o orçamento e a estrutura se distribuem"
            />
            <div className="card" style={{ overflow: "hidden" }}>
              {/* Table header */}
              <div className="dash-table__head">
                <div style={{ flex: "2" }}>PLATAFORMA</div>
                <div style={{ flex: "1.2", textAlign: "right" }}>INVESTIMENTO</div>
                <div style={{ flex: "0.8", textAlign: "right" }}>%</div>
                <div style={{ flex: "0.8", textAlign: "right" }}>CAMPANHAS</div>
                <div style={{ flex: "0.8", textAlign: "right" }}>{adSetStatLabel.toUpperCase()}</div>
                <div style={{ flex: "1.4" }}>DISTRIBUIÇÃO</div>
              </div>

              {plan.budgetDistribution.map((b, i) => {
                const c = pc(b.platform);
                const platformCampaigns = plan.campaigns.filter(cp => cp.platform === b.platform);
                const platformAdSets    = platformCampaigns.reduce((s, cp) => s + cp.adSets.length, 0);
                const relW = (b.percentage / maxBudgetPct) * 100;
                return (
                  <div key={i} className="dash-table__row">
                    <div style={{ flex: "2", display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: c.bg, border: `1px solid ${c.color}26`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <PlatformLogo platform={b.platform} size={17} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 13.5, fontWeight: 500, color: C.text, margin: 0,
                          letterSpacing: "-0.012em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {b.platform}
                        </p>
                        {b.allocation && (
                          <p style={{
                            fontSize: 11.5, color: C.muted, margin: "2px 0 0",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            maxWidth: 220,
                          }}>
                            {b.allocation}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="font-display" style={{
                      flex: "1.2", textAlign: "right", fontVariantNumeric: "tabular-nums",
                      fontSize: 15, fontWeight: 500, color: C.text, letterSpacing: "-0.02em",
                    }}>
                      {b.amount}
                    </div>
                    <div style={{
                      flex: "0.8", textAlign: "right", fontVariantNumeric: "tabular-nums",
                      fontSize: 13, color: C.subtext,
                    }}>
                      {b.percentage}%
                    </div>
                    <div className="font-display" style={{
                      flex: "0.8", textAlign: "right", fontVariantNumeric: "tabular-nums",
                      fontSize: 14, fontWeight: 500, color: C.text,
                    }}>
                      {platformCampaigns.length}
                    </div>
                    <div className="font-display" style={{
                      flex: "0.8", textAlign: "right", fontVariantNumeric: "tabular-nums",
                      fontSize: 14, fontWeight: 500, color: C.text,
                    }}>
                      {platformAdSets}
                    </div>
                    <div style={{ flex: "1.4", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        flex: 1, height: 4, background: C.borderMid, borderRadius: 2, overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", width: `${relW}%`,
                          background: `linear-gradient(90deg, ${c.color}, ${c.color}cc)`,
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>
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
                        <h3 className="font-display" style={{
                          fontSize: 17, fontWeight: 500, color: C.text,
                          margin: 0, letterSpacing: "-0.025em", lineHeight: 1.25,
                        }}>
                          {campaign.name}
                        </h3>
                      </div>
                      {campaign.totalBudget && campaign.totalBudget !== "A definir" && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, margin: "0 0 2px", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                            Orçamento
                          </p>
                          <p className="font-display" style={{
                            fontSize: 20, fontWeight: 500, color: c.color,
                            margin: 0, letterSpacing: "-0.04em", lineHeight: 1,
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
                                <p className="font-display" style={{
                                  fontSize: 14, fontWeight: 500, color: C.text,
                                  margin: 0, letterSpacing: "-0.02em",
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

                                {/* Imagem + copy (RSA estruturado quando for Responsivo de Pesquisa) */}
                                {ad.format === "Responsivo de Pesquisa" && ad.copy ? (
                                  <RSAStructured copy={ad.copy} color={c.color} />
                                ) : (
                                  ((ad.fileDataUrl && ad.fileType === "image") || ad.copy) && (
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
                                  )
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

          {/* ═════ PRÉ-VISUALIZAÇÃO DO ANÚNCIO ═════ */}
          {(() => {
            const pesquisaCampaigns = plan.campaigns.filter(
              c => c.platform === "Google Ads" && c.googleCampaignType === "Pesquisa"
            );
            if (pesquisaCampaigns.length === 0) return null;
            const firstAd = pesquisaCampaigns[0]?.adSets[0]?.ads[0];
            if (!firstAd?.copy) return null;

            return (
              <section className="rise d-3" style={{ marginBottom: 32 }}>
                <SectionTitle
                  eyebrow="Como vai aparecer"
                  title="Pré-visualização do Anúncio"
                  subtitle="Simulação de como o anúncio aparece no Google. As combinações exatas de títulos e descrições são montadas dinamicamente pelo algoritmo."
                />

                {/* Search Ad */}
                <div style={{ marginBottom: 18 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 600, color: C.muted,
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}>
                    Mecanismo de Pesquisa · google.com
                  </p>
                  <SearchAdPreview
                    copy={firstAd.copy}
                    finalUrl={plan.googleAdsConfig?.finalUrl}
                    clientName={plan.overview.clientName}
                  />
                </div>

                {/* Local Ad / GMB */}
                <div>
                  <p style={{
                    fontSize: 10, fontWeight: 600, color: C.muted,
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}>
                    Google Meu Negócio · Anúncio Local
                  </p>
                  <LocalAdPreview
                    clientName={plan.overview.clientName}
                    product={plan.overview.product}
                    finalUrl={plan.googleAdsConfig?.finalUrl}
                    location={plan.overview.location}
                  />
                </div>
              </section>
            );
          })()}

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
                        <h3 className="font-display" style={{
                          fontSize: 16, fontWeight: 500, color: C.text,
                          margin: 0, letterSpacing: "-0.025em",
                        }}>
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

        </main>
      </div>
    </>
  );
}
