import {
  Document, Page, Text, View, Image,
  Svg, Defs, LinearGradient, Stop, Rect,
} from "@react-pdf/renderer";
import { CampaignPlan } from "@/types/campaign";
import { getHierarchyLabels } from "@/lib/hierarchy";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — sistema único e consistente
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
  warning:   "#f59e0b",
  warningBg: "#fef3c7",
} as const;

const PAGE_W = 595;
const PAGE_MARGIN_X = 34;
const CONTENT_W = PAGE_W - PAGE_MARGIN_X * 2;

/* Escala tipográfica (pontos) */
const T = {
  d1: 30, d2: 24, h1: 18, h2: 14, h3: 12, h4: 11,
  body: 10, small: 9, tiny: 8, micro: 7.5,
} as const;

/* Cor por plataforma */
function platColor(p: string): string {
  if (p.includes("Facebook") || p === "Meta Ads") return "#1877F2";
  if (p.includes("Instagram") && !p.includes("Facebook")) return "#E1306C";
  if (p === "Google Ads")  return "#EA4335";
  if (p === "TikTok Ads")  return "#444cf7";
  if (p === "YouTube Ads") return "#FF0000";
  return C.brand;
}
function platSoft(color: string): string { return color + "14"; }
function platGlyph(p: string): string {
  if (p.includes("Facebook") || p === "Meta Ads") return "f";
  if (p === "Instagram")   return "◈";
  if (p === "Google Ads")  return "G";
  if (p === "TikTok Ads")  return "T";
  if (p === "YouTube Ads") return "▶";
  return "●";
}

function trunc(s: string, n: number): string {
  return s && s.length > n ? s.substring(0, n) + "…" : (s || "");
}
function cleanCopy(text: string): string {
  if (!text) return "";
  return text.replace(/^[0-9][0-9,.\sKkMm]*likes?,\s*[0-9][0-9,.\sKkMm]*comments?\s*-\s*[^:]+:\s*/i, "").trim();
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

/* ═══════════════════════════════════════════════════════
   COMPONENTES BASE
═══════════════════════════════════════════════════════ */

/** Header fixo idêntico em todas as páginas internas */
function PageHeader({ client, section }: { client: string; section: string }) {
  return (
    <View fixed style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ height: 3, backgroundColor: C.brand }} />
      <View style={{
        paddingHorizontal: PAGE_MARGIN_X, paddingVertical: 11,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{
            width: 20, height: 20, borderRadius: 5, backgroundColor: C.brand,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.surface }}>C</Text>
          </View>
          <Text style={{ fontSize: T.tiny, fontFamily: "Helvetica-Bold", color: C.brand, letterSpacing: 0.9 }}>
            {section.toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontSize: T.tiny, color: C.muted }}>{trunc(client, 48)}</Text>
      </View>
    </View>
  );
}

/** Rodapé fixo com número de página */
function PageFooter({ date }: { date: string }) {
  return (
    <View fixed style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
      <View style={{
        backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
        paddingHorizontal: PAGE_MARGIN_X, paddingVertical: 10,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      }}>
        <Text style={{ fontSize: T.micro, color: C.muted, letterSpacing: 0.3 }}>
          AUDAZA · {date}
        </Text>
        <Text
          style={{ fontSize: T.micro, color: C.muted }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </View>
  );
}

/** Título de seção com eyebrow + título */
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      <Text style={{
        fontSize: T.micro, fontFamily: "Helvetica-Bold", color: C.brand,
        letterSpacing: 1.2, marginBottom: 3,
      }}>
        {eyebrow.toUpperCase()}
      </Text>
      <Text style={{
        fontSize: T.h1, fontFamily: "Helvetica-Bold", color: C.text, letterSpacing: -0.4,
      }}>
        {title}
      </Text>
      <View style={{ height: 2, width: 28, backgroundColor: C.brand, marginTop: 6, borderRadius: 1 }} />
    </View>
  );
}

/** Badge de plataforma — pill sutil */
function PlatBadge({ platform }: { platform: string }) {
  const color = platColor(platform);
  return (
    <View style={{
      backgroundColor: platSoft(color), borderRadius: 4,
      paddingVertical: 2.5, paddingHorizontal: 8,
      borderWidth: 1, borderColor: color + "22",
      flexDirection: "row", alignItems: "center", gap: 5,
    }}>
      <View style={{
        width: 12, height: 12, borderRadius: 3, backgroundColor: color,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.surface }}>
          {platGlyph(platform)}
        </Text>
      </View>
      <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color, letterSpacing: 0.2 }}>
        {platform}
      </Text>
    </View>
  );
}

/** Chip genérico */
function Chip({ label, color = C.muted, bg = C.borderMid }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{
      backgroundColor: bg, borderRadius: 4,
      paddingVertical: 2.5, paddingHorizontal: 8,
      borderWidth: 1, borderColor: color + "24",
    }}>
      <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}

/** Bloco de público-alvo com chips */
function AudienceBlock({ audience, color, label }: { audience: string; color: string; label?: string }) {
  const parts = audience.includes(" · ") ? audience.split(" · ").filter(Boolean) : [audience];
  const isChips = parts.length > 1;
  return (
    <View style={{
      paddingHorizontal: 11, paddingVertical: 9,
      borderLeftWidth: 3, borderLeftColor: color,
      backgroundColor: platSoft(color),
      borderTopRightRadius: 6, borderBottomRightRadius: 6,
    }}>
      <Text style={{
        fontSize: T.micro, fontFamily: "Helvetica-Bold", color,
        letterSpacing: 0.9, marginBottom: isChips ? 5 : 3,
      }}>
        {(label ?? "PÚBLICO-ALVO").toUpperCase()}
      </Text>
      {isChips ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
          {parts.map((part, i) => (
            <View key={i} style={{
              backgroundColor: C.surface, borderRadius: 20,
              borderWidth: 1, borderColor: color + "22",
              paddingVertical: 1.5, paddingHorizontal: 7,
            }}>
              <Text style={{ fontSize: T.micro, color: C.text }}>{part}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: T.tiny, color: C.text, lineHeight: 1.5 }}>{audience}</Text>
      )}
    </View>
  );
}

/** Linha label+valor vertical */
function KeyValue({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Text style={{
        fontSize: T.micro, fontFamily: "Helvetica-Bold", color: C.muted,
        letterSpacing: 0.8, width: 96, paddingTop: 1,
      }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: T.small, color: C.text, flex: 1, lineHeight: 1.5 }}>
        {value}
      </Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   CARDS DE CONTEÚDO (cada um = bloco modular wrap={false})
═══════════════════════════════════════════════════════ */

/** Card de distribuição de orçamento por plataforma */
function BudgetCard({ b, maxPct }: { b: CampaignPlan["budgetDistribution"][number]; maxPct: number }) {
  const color = platColor(b.platform);
  const barW = Math.max(6, Math.round((CONTENT_W / 2 - 32) * (b.percentage / maxPct)));
  return (
    <View wrap={false} style={{
      flex: 1, backgroundColor: C.surface, borderRadius: 10,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: 13,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <View style={{
          width: 30, height: 30, borderRadius: 7,
          backgroundColor: platSoft(color),
          borderWidth: 1, borderColor: color + "22",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color }}>
            {platGlyph(b.platform)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.text }}>
            {b.platform}
          </Text>
          <Text style={{ fontSize: T.micro, color: C.muted, marginTop: 1 }}>
            {b.percentage}% do orçamento
          </Text>
        </View>
        <Text style={{ fontSize: T.h2, fontFamily: "Helvetica-Bold", color, letterSpacing: -0.3 }}>
          {b.amount}
        </Text>
      </View>
      {/* Barra proporcional ao maior valor (não ao 100%) */}
      <View style={{ height: 4, backgroundColor: C.bg, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ height: 4, width: barW, backgroundColor: color, borderRadius: 2 }} />
      </View>
      {b.allocation ? (
        <Text style={{ fontSize: T.tiny, color: C.subtext, marginTop: 8, lineHeight: 1.5 }}>
          {b.allocation}
        </Text>
      ) : null}
    </View>
  );
}

/** Card de Configuração Google Ads — bloco único wrap={false} */
function GoogleConfigCard({ config }: { config: NonNullable<CampaignPlan["googleAdsConfig"]> }) {
  const color = "#EA4335";
  return (
    <View wrap={false} style={{
      backgroundColor: C.surface, borderRadius: 10,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, borderLeftColor: color,
      marginBottom: 10, overflow: "hidden",
    }}>
      <View style={{
        paddingHorizontal: 16, paddingVertical: 11,
        backgroundColor: color + "08",
        borderBottomWidth: 1, borderBottomColor: C.border,
        flexDirection: "row", alignItems: "center", gap: 10,
      }}>
        <View style={{
          width: 28, height: 28, borderRadius: 7,
          backgroundColor: color + "16", borderWidth: 1, borderColor: color + "24",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color }}>G</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color, letterSpacing: 1.1 }}>
            CONFIGURAÇÃO GOOGLE ADS
          </Text>
          <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color: C.text, marginTop: 1, letterSpacing: -0.2 }}>
            {config.campaignType}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 11, gap: 7 }}>
        <KeyValue label="Idioma"              value={config.language} />
        <KeyValue label="Palavras-chave"      value={config.keywords} />
        <KeyValue label="Kw negativas"        value={config.negativeKeywords} />
        <KeyValue label="URL destino"         value={config.finalUrl} />
        <KeyValue label="Sinais de público"   value={config.audienceSignals} />
        <KeyValue label="Categorias"          value={config.shoppingCategories} />
        <KeyValue label="Vídeo YouTube"       value={config.youtubeVideoUrl} />
        <KeyValue label="Formato vídeo"       value={config.videoFormat} />
        <KeyValue label="Formato Demand Gen"  value={config.demandGenFormat} />
      </View>
    </View>
  );
}

/** Card de um Anúncio — wrap={false} para nunca cortar */
function AdCard({
  ad, color, hideName,
}: {
  ad: CampaignPlan["campaigns"][number]["adSets"][number]["ads"][number];
  color: string;
  hideName?: boolean;
}) {
  const hasImage = !!(ad.fileDataUrl && ad.fileType === "image");
  const hasCopy  = !!ad.copy;
  return (
    <View wrap={false} style={{
      backgroundColor: C.surface, borderRadius: 7,
      borderWidth: 1, borderColor: C.borderMid,
      paddingHorizontal: 10, paddingVertical: 9,
    }}>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 6,
        marginBottom: (hasImage || hasCopy || ad.fileName) ? 7 : 0,
      }}>
        <View style={{ backgroundColor: platSoft(color), borderRadius: 3, paddingVertical: 1.5, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color, letterSpacing: 0.3 }}>
            {ad.format}
          </Text>
        </View>
        {!hideName && (
          <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.subtext }}>
            {ad.name}
          </Text>
        )}
      </View>

      {hasImage ? (
        <View style={{ flexDirection: "row", gap: 9 }}>
          <Image src={ad.fileDataUrl!} style={{ width: "47%", borderRadius: 5 }} />
          {hasCopy && (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: T.tiny, color: C.subtext, lineHeight: 1.6 }}>
                {cleanCopy(ad.copy)}
              </Text>
              {extractPostDate(ad.copy) && (
                <Text style={{ fontSize: T.micro, color: C.muted, marginTop: 5 }}>
                  Publicado em {extractPostDate(ad.copy)}
                </Text>
              )}
            </View>
          )}
        </View>
      ) : hasCopy ? (
        <View>
          <Text style={{ fontSize: T.small, color: C.subtext, lineHeight: 1.6 }}>
            {cleanCopy(ad.copy)}
          </Text>
          {extractPostDate(ad.copy) && (
            <Text style={{ fontSize: T.micro, color: C.muted, marginTop: 5 }}>
              Publicado em {extractPostDate(ad.copy)}
            </Text>
          )}
        </View>
      ) : null}

      {ad.fileName && ad.fileType === "video" && (
        <Text style={{ fontSize: T.micro, color: C.muted, marginTop: 4 }}>
          {"▶  " + ad.fileName}
        </Text>
      )}
    </View>
  );
}

/** Card de AdSet — wrap={false} para manter inteiro em uma página */
function AdSetCard({
  adSet, color, index, labels, isGoogleFeedLike, googleType,
}: {
  adSet: CampaignPlan["campaigns"][number]["adSets"][number];
  color: string;
  index: number;
  labels: ReturnType<typeof getHierarchyLabels>;
  isGoogleFeedLike: boolean;
  googleType?: string;
}) {
  const adsCount = adSet.ads.length;
  const fmts = [...new Set(adSet.ads.map(a => a.format))].join(" · ");

  return (
    <View wrap={false} style={{
      backgroundColor: C.bg, borderRadius: 9,
      borderWidth: 1, borderColor: C.borderMid,
      overflow: "hidden", marginBottom: 8,
    }}>
      {/* Header adset */}
      <View style={{
        paddingHorizontal: 13, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: C.borderMid,
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: C.surface,
      }}>
        <View style={{
          width: 24, height: 24, borderRadius: 6,
          backgroundColor: color, alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.surface }}>
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: T.h4, fontFamily: "Helvetica-Bold", color: C.text, letterSpacing: -0.15 }}>
            {adSet.name || `${labels.adSet} ${index + 1}`}
          </Text>
          <Text style={{ fontSize: T.micro, color: C.muted, marginTop: 1 }}>
            {labels.hasManualAds
              ? `${adsCount} ${(adsCount === 1 ? labels.ad : labels.adPlural).toLowerCase()}${fmts ? " · " + fmts : ""}`
              : "Filtro de feed · sem anúncios manuais"}
          </Text>
        </View>
        {adSet.budget ? (
          <View style={{
            backgroundColor: platSoft(color), borderRadius: 5,
            paddingVertical: 3, paddingHorizontal: 9,
            borderWidth: 1, borderColor: color + "22",
          }}>
            <Text style={{ fontSize: T.tiny, fontFamily: "Helvetica-Bold", color, letterSpacing: -0.1 }}>
              {adSet.budget}/dia
            </Text>
          </View>
        ) : null}
      </View>

      {/* Body adset */}
      <View style={{ paddingHorizontal: 10, paddingVertical: 10, gap: 6 }}>
        {adSet.audience ? (
          <AudienceBlock audience={adSet.audience} color={color} label={labels.audienceLabel} />
        ) : null}

        {isGoogleFeedLike && (
          <View style={{
            backgroundColor: "#EA43350A", borderRadius: 6,
            borderWidth: 1, borderColor: "#EA433522", borderStyle: "dashed",
            paddingHorizontal: 10, paddingVertical: 8,
            flexDirection: "row", gap: 7, alignItems: "flex-start",
          }}>
            <Text style={{ fontSize: T.small }}>
              {googleType === "Performance Max" ? "⚡" : "🛍️"}
            </Text>
            <Text style={{ fontSize: T.tiny, color: C.subtext, flex: 1, lineHeight: 1.5 }}>
              {googleType === "Performance Max"
                ? "Grupo de Recursos — contém títulos, descrições, imagens, vídeos e sinais de público. O Google monta os criativos automaticamente."
                : "Sem anúncios manuais — criativos gerados pelo feed do Merchant Center, filtrados por este grupo."}
            </Text>
          </View>
        )}

        {labels.hasManualAds && adSet.ads.map((ad, k) => (
          <AdCard key={k} ad={ad} color={color} />
        ))}
      </View>
    </View>
  );
}

/** Card de Fase do cronograma — wrap={false} */
function TimelinePhaseCard({
  phase, index, isFirst, isLast,
}: {
  phase: CampaignPlan["timeline"][number];
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const accent = isFirst || isLast ? C.brand : C.soft;
  const nodeBg = isFirst || isLast ? C.brand : C.surface;
  const nodeClr = isFirst || isLast ? C.surface : C.muted;
  const pillBg = isFirst || isLast ? C.brandSoft : C.surface;
  const pillClr = isFirst || isLast ? C.brand : C.subtext;

  return (
    <View wrap={false} style={{
      flexDirection: "row", gap: 14, marginBottom: 10,
    }}>
      {/* Coluna do nó */}
      <View style={{ width: 28, alignItems: "center" }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: nodeBg,
          borderWidth: 2, borderColor: accent,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: nodeClr }}>
            {index + 1}
          </Text>
        </View>
      </View>

      {/* Card da fase */}
      <View style={{
        flex: 1, backgroundColor: C.surface, borderRadius: 9,
        borderWidth: 1, borderColor: C.border,
        borderLeftWidth: 3, borderLeftColor: accent,
        paddingHorizontal: 13, paddingVertical: 11,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: T.h4, fontFamily: "Helvetica-Bold", color: C.text, letterSpacing: -0.15 }}>
            {phase.phase}
          </Text>
          <View style={{
            backgroundColor: pillBg, borderRadius: 5,
            paddingVertical: 2.5, paddingHorizontal: 8,
            borderWidth: 1, borderColor: pillClr + "30",
          }}>
            <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color: pillClr, letterSpacing: 0.2 }}>
              {phase.duration}
            </Text>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          {phase.actions.map((action, j) => (
            <View key={j} style={{ flexDirection: "row", gap: 7, alignItems: "flex-start" }}>
              <View style={{
                width: 3.5, height: 3.5, borderRadius: 2,
                backgroundColor: accent, marginTop: 5.5, opacity: 0.7,
              }} />
              <Text style={{ fontSize: T.small, color: C.subtext, flex: 1, lineHeight: 1.55 }}>
                {action}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Card de Recomendação — wrap={false} */
function RecommendationCard({ text, index }: { text: string; index: number }) {
  return (
    <View wrap={false} style={{
      flexDirection: "row", gap: 12,
      backgroundColor: C.surface, borderRadius: 9,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: 12,
      marginBottom: 8,
    }}>
      <View style={{
        width: 26, height: 26, borderRadius: 6,
        backgroundColor: C.brandSoft,
        borderWidth: 1, borderColor: C.brand + "22",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.brand }}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      </View>
      <Text style={{ fontSize: T.small, color: C.text, flex: 1, lineHeight: 1.6 }}>
        {text}
      </Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   DOCUMENTO
═══════════════════════════════════════════════════════ */
export default function CampaignPDF({ plan }: { plan: CampaignPlan }) {
  const today = new Date().toLocaleDateString("pt-BR");
  const totalAdSets = plan.campaigns.reduce((s, c) => s + c.adSets.length, 0);
  const totalAds = plan.campaigns.reduce(
    (s, c) => s + (getHierarchyLabels(c.platform, c.googleCampaignType).hasManualAds
      ? c.adSets.reduce((ss, as) => ss + as.ads.length, 0) : 0), 0);
  const totalFiles = plan.campaigns.reduce((s, c) =>
    s + c.adSets.reduce((ss, as) => ss + as.ads.filter(a => a.fileDataUrl || a.fileName).length, 0), 0);

  const allLabelsPdf = plan.campaigns.map(c => getHierarchyLabels(c.platform, c.googleCampaignType));
  const uniqueAdSet = [...new Set(allLabelsPdf.map(l => l.adSetPlural))];
  const uniqueAd = [...new Set(allLabelsPdf.map(l => l.adPlural))];
  const adSetStatLabel = uniqueAdSet.length === 1 ? uniqueAdSet[0] : "Conjuntos";
  const adStatLabel = uniqueAd.length === 1 ? uniqueAd[0] : "Anúncios";

  const stats = [
    { label: "Campanhas", value: plan.campaigns.length },
    { label: adSetStatLabel, value: totalAdSets },
    ...(totalAds > 0 ? [{ label: adStatLabel, value: totalAds }] : []),
    ...(totalFiles > 0 ? [{ label: "Criativos", value: totalFiles }] : []),
  ];

  const maxBudgetPct = Math.max(...plan.budgetDistribution.map(b => b.percentage), 1);

  return (
    <Document>

      {/* ═════════════════════════════════════════════
          PÁGINA 1 — CAPA
      ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: C.surface, padding: 0 }}>
        {/* Fundo gradiente full-bleed */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Svg width={PAGE_W} height={842}>
            <Defs>
              <LinearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#002d6b" stopOpacity={1} />
                <Stop offset="40%" stopColor={C.brandDark} stopOpacity={1} />
                <Stop offset="75%" stopColor={C.brand} stopOpacity={1} />
                <Stop offset="100%" stopColor="#34aadc" stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={PAGE_W} height={842} fill="url(#cover)" />
            {/* Círculos decorativos */}
            <Rect x={380} y={-140} width={400} height={400} rx={200} fill={C.surface} fillOpacity={0.04} />
            <Rect x={-80} y={620}  width={320} height={320} rx={160} fill={C.surface} fillOpacity={0.05} />
            <Rect x={440} y={520}  width={180} height={180} rx={90}  fill={C.surface} fillOpacity={0.06} />
            <Rect x={60}  y={100}  width={60}  height={60}  rx={30}  fill={C.surface} fillOpacity={0.07} />
          </Svg>
        </View>

        {/* Conteúdo da capa */}
        <View style={{ flex: 1, paddingHorizontal: 48, paddingTop: 60, paddingBottom: 60 }}>
          {/* Topo: logo + marca */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 17, fontFamily: "Helvetica-Bold", color: C.brand, letterSpacing: -0.5 }}>C</Text>
            </View>
            <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.3 }}>
              Campanha Tráfego · Audaza
            </Text>
          </View>

          {/* Centro: título grande */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{
              fontSize: T.tiny, fontFamily: "Helvetica-Bold",
              color: "rgba(255,255,255,0.65)", letterSpacing: 2, marginBottom: 14,
            }}>
              PLANEJAMENTO ESTRATÉGICO DE TRÁFEGO PAGO
            </Text>
            <Text style={{
              fontSize: 44, fontFamily: "Helvetica-Bold", color: C.surface,
              letterSpacing: -1.5, lineHeight: 1.05, marginBottom: 10,
            }}>
              {trunc(plan.overview.clientName, 34)}
            </Text>
            <Text style={{
              fontSize: T.h2, color: "rgba(255,255,255,0.85)",
              letterSpacing: -0.2, lineHeight: 1.4, maxWidth: 420,
            }}>
              {plan.overview.product}
            </Text>

            {/* Divisor fino */}
            <View style={{ height: 1, width: 72, backgroundColor: "rgba(255,255,255,0.35)", marginTop: 32, marginBottom: 28 }} />

            {/* Grid de dados da capa */}
            <View style={{ flexDirection: "row", gap: 28 }}>
              <View>
                <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.6)", letterSpacing: 1.2, marginBottom: 5 }}>
                  OBJETIVO
                </Text>
                <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.2 }}>
                  {plan.overview.objective}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.6)", letterSpacing: 1.2, marginBottom: 5 }}>
                  PERÍODO
                </Text>
                <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.2 }}>
                  {plan.overview.duration}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.6)", letterSpacing: 1.2, marginBottom: 5 }}>
                  {plan.overview.dailyBudget ? "INVEST. DIÁRIO" : "ORÇAMENTO"}
                </Text>
                <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.2 }}>
                  {plan.overview.dailyBudget || plan.overview.totalBudget}
                </Text>
              </View>
            </View>

            {/* Plataformas */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 24 }}>
              {plan.overview.platforms.map((p, i) => (
                <View key={i} style={{
                  backgroundColor: "rgba(255,255,255,0.16)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
                  borderRadius: 16, paddingVertical: 5, paddingHorizontal: 11,
                }}>
                  <Text style={{ fontSize: T.tiny, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: 0.2 }}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rodapé da capa */}
          <View style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
            paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)",
          }}>
            <View>
              <Text style={{ fontSize: T.micro, color: "rgba(255,255,255,0.6)", letterSpacing: 1.1, marginBottom: 3 }}>
                EMITIDO EM
              </Text>
              <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.1 }}>
                {today}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: T.micro, color: "rgba(255,255,255,0.6)", letterSpacing: 1.1, marginBottom: 3 }}>
                DOCUMENTO
              </Text>
              <Text style={{ fontSize: T.small, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.1 }}>
                Planejamento de Campanha
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 2 — VISÃO GERAL + ORÇAMENTO
      ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: C.bg, padding: 0, paddingBottom: 38 }}>
        <PageHeader client={plan.overview.clientName} section="Visão Geral" />

        <View style={{ paddingHorizontal: PAGE_MARGIN_X, paddingTop: 20 }}>

          {/* HERO MINI */}
          <View wrap={false} style={{
            backgroundColor: C.surface, borderRadius: 12,
            borderWidth: 1, borderColor: C.border, overflow: "hidden",
            marginBottom: 18,
          }}>
            {/* Faixa gradiente superior */}
            <View style={{ height: 92, position: "relative", overflow: "hidden" }}>
              <Svg width={CONTENT_W} height={92} style={{ position: "absolute", top: 0, left: 0 }}>
                <Defs>
                  <LinearGradient id="heroMini" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor={C.brandDark} stopOpacity={1} />
                    <Stop offset="60%" stopColor={C.brand} stopOpacity={1} />
                    <Stop offset="100%" stopColor="#34aadc" stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={CONTENT_W} height={92} fill="url(#heroMini)" />
                <Rect x={CONTENT_W - 120} y={-50} width={200} height={200} rx={100} fill={C.surface} fillOpacity={0.06} />
              </Svg>
              <View style={{ padding: 16, flex: 1, justifyContent: "center" }}>
                <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.7)", letterSpacing: 1.2, marginBottom: 3 }}>
                  CLIENTE
                </Text>
                <Text style={{ fontSize: T.h1, fontFamily: "Helvetica-Bold", color: C.surface, letterSpacing: -0.4 }}>
                  {trunc(plan.overview.clientName, 40)}
                </Text>
                <Text style={{ fontSize: T.small, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                  {trunc(plan.overview.product, 70)}
                </Text>
              </View>
            </View>

            {/* Resumo */}
            <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14 }}>
              <Text style={{ fontSize: T.small, color: C.subtext, lineHeight: 1.7 }}>
                {plan.overview.summary}
              </Text>
            </View>

            {/* Stats strip */}
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
              {stats.map((s, i) => (
                <View key={i} style={{
                  flex: 1, paddingVertical: 13, alignItems: "center",
                  borderRightWidth: i < stats.length - 1 ? 1 : 0,
                  borderRightColor: C.border,
                }}>
                  <Text style={{
                    fontSize: T.d2, fontFamily: "Helvetica-Bold", color: C.text,
                    letterSpacing: -0.5, marginBottom: 2,
                  }}>
                    {s.value}
                  </Text>
                  <Text style={{
                    fontSize: T.micro, fontFamily: "Helvetica-Bold", color: C.muted,
                    letterSpacing: 0.5, textTransform: "uppercase",
                  }}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tags da campanha */}
          <View wrap={false} style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: T.micro, fontFamily: "Helvetica-Bold", color: C.muted, letterSpacing: 0.9, marginBottom: 7 }}>
              CONFIGURAÇÃO DA CAMPANHA
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              <Chip label={plan.overview.objective} color={C.brand} bg={C.brandSoft} />
              <Chip label={plan.overview.duration} />
              {plan.overview.platforms.map((p, i) => {
                const cc = platColor(p);
                return <Chip key={i} label={p} color={cc} bg={platSoft(cc)} />;
              })}
            </View>
          </View>

          {/* SEÇÃO — Distribuição de Orçamento */}
          <SectionTitle eyebrow="Investimento" title="Distribuição de Orçamento" />

          {/* Budget em pares (2 colunas) */}
          {(() => {
            const pairs: (typeof plan.budgetDistribution)[] = [];
            for (let i = 0; i < plan.budgetDistribution.length; i += 2) {
              pairs.push(plan.budgetDistribution.slice(i, i + 2));
            }
            return pairs.map((pair, pi) => (
              <View key={pi} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }} wrap={false}>
                {pair.map((b, bi) => (
                  <BudgetCard key={bi} b={b} maxPct={maxBudgetPct} />
                ))}
                {pair.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ));
          })()}

        </View>

        <PageFooter date={today} />
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 3 — ESTRUTURA DE CAMPANHAS
      ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: C.bg, padding: 0, paddingBottom: 38 }}>
        <PageHeader client={plan.overview.clientName} section="Estrutura de Campanhas" />

        <View style={{ paddingHorizontal: PAGE_MARGIN_X, paddingTop: 20 }}>
          <SectionTitle eyebrow="Organização" title="Estrutura de Campanhas" />

          {plan.googleAdsConfig && <GoogleConfigCard config={plan.googleAdsConfig} />}

          {plan.campaigns.map((campaign, ci) => {
            const color = platColor(campaign.platform);
            const labels = getHierarchyLabels(campaign.platform, campaign.googleCampaignType);
            const isGoogleFeedLike = !labels.hasManualAds && campaign.platform === "Google Ads";

            return (
              <View key={ci} style={{ marginBottom: 12 }}>
                {/* Header da campanha (wrap={false} garante que não corte) */}
                <View wrap={false} style={{
                  backgroundColor: C.surface, borderRadius: 10,
                  borderWidth: 1, borderColor: C.border,
                  borderLeftWidth: 3, borderLeftColor: color,
                  paddingHorizontal: 16, paddingVertical: 13,
                  marginBottom: 8,
                  flexDirection: "row", alignItems: "center", gap: 12,
                }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                      <PlatBadge platform={campaign.platform} />
                      {campaign.googleCampaignType && (
                        <Chip label={campaign.googleCampaignType} color={color} bg={platSoft(color)} />
                      )}
                      {campaign.objective && (
                        <Text style={{ fontSize: T.micro, color: C.muted }}>· {campaign.objective}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: T.h3, fontFamily: "Helvetica-Bold", color: C.text, letterSpacing: -0.2 }}>
                      {trunc(campaign.name, 58)}
                    </Text>
                  </View>
                  {campaign.totalBudget && campaign.totalBudget !== "A definir" && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: T.micro, color: C.muted, letterSpacing: 0.4 }}>ORÇAMENTO</Text>
                      <Text style={{ fontSize: T.h2, fontFamily: "Helvetica-Bold", color, letterSpacing: -0.4, marginTop: 1 }}>
                        {campaign.totalBudget}
                      </Text>
                    </View>
                  )}
                </View>

                {/* AdSets: cada um é um bloco modular wrap={false} */}
                {campaign.adSets.map((adSet, j) => (
                  <AdSetCard
                    key={j}
                    adSet={adSet}
                    color={color}
                    index={j}
                    labels={labels}
                    isGoogleFeedLike={isGoogleFeedLike}
                    googleType={campaign.googleCampaignType}
                  />
                ))}
              </View>
            );
          })}
        </View>

        <PageFooter date={today} />
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 4 — CRONOGRAMA (só se houver fases)
      ═════════════════════════════════════════════ */}
      {plan.timeline && plan.timeline.length > 0 && (
        <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: C.bg, padding: 0, paddingBottom: 38 }}>
          <PageHeader client={plan.overview.clientName} section="Cronograma" />

          <View style={{ paddingHorizontal: PAGE_MARGIN_X, paddingTop: 20 }}>
            <SectionTitle eyebrow="Timeline" title="Cronograma de Implementação" />

            {plan.timeline.map((phase, i) => (
              <TimelinePhaseCard
                key={i}
                phase={phase}
                index={i}
                isFirst={i === 0}
                isLast={i === plan.timeline.length - 1}
              />
            ))}
          </View>

          <PageFooter date={today} />
        </Page>
      )}

      {/* ═════════════════════════════════════════════
          PÁGINA 5 — RECOMENDAÇÕES (se existirem)
      ═════════════════════════════════════════════ */}
      {plan.recommendations && plan.recommendations.length > 0 && (
        <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: C.bg, padding: 0, paddingBottom: 38 }}>
          <PageHeader client={plan.overview.clientName} section="Recomendações" />

          <View style={{ paddingHorizontal: PAGE_MARGIN_X, paddingTop: 20 }}>
            <SectionTitle eyebrow="Best Practices" title="Recomendações Estratégicas" />

            <View style={{ marginBottom: 16 }} wrap={false}>
              <Text style={{ fontSize: T.small, color: C.subtext, lineHeight: 1.65 }}>
                Práticas recomendadas para potencializar os resultados desta campanha e
                maximizar o retorno sobre o investimento (ROAS).
              </Text>
            </View>

            {plan.recommendations.map((rec, i) => (
              <RecommendationCard key={i} text={rec} index={i} />
            ))}
          </View>

          <PageFooter date={today} />
        </Page>
      )}

    </Document>
  );
}
