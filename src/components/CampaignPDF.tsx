import {
  Document, Page, Text, View, Image,
  Svg, Defs, LinearGradient, Stop, Rect, Line,
} from "@react-pdf/renderer";
import { CampaignPlan } from "@/types/campaign";
import { getHierarchyLabels } from "@/lib/hierarchy";

/* ═══════════════════════════════════════════════════════
   TOKENS — idênticos ao resultado page
═══════════════════════════════════════════════════════ */
const BG      = "#f3f5f8";   // fundo geral
const WHITE   = "#ffffff";
const BORDER  = "#e4e8ef";
const BORDMID = "#eaecf2";
const TEXT    = "#0d1117";
const SUB     = "#5a6478";
const MUTED   = "#9ba8bb";
const BLUE    = "#0071E3";
const SUCCESS = "#16a34a";

/* ═══════════════════════════════════════════════════════
   PLATFORM — exatas do resultado page
═══════════════════════════════════════════════════════ */
function platColor(p: string): string {
  if (p.includes("Facebook") || p === "Meta Ads") return "#1877F2";
  if (p.includes("Instagram") && !p.includes("Facebook")) return "#E1306C";
  if (p === "Google Ads")  return "#EA4335";
  if (p === "TikTok Ads")  return "#444cf7";   // indigo — evita o preto ilegível
  if (p === "YouTube Ads") return "#FF0000";
  return BLUE;
}

/* Gera o bg claro a partir da cor hex (hex8 — ~9% opacity) */
function platBg(color: string): string {
  return color + "16";  // hex alpha ≈ 9%
}

function platGlyph(p: string): string {
  if (p.includes("Facebook") || p === "Meta Ads") return "f";
  if (p === "Instagram")   return "I";
  if (p === "Google Ads")  return "G";
  if (p === "TikTok Ads")  return "T";
  if (p === "YouTube Ads") return "Y";
  return "C";
}

function trunc(s: string, n: number): string {
  return s && s.length > n ? s.substring(0, n) + "…" : (s || "");
}

function cleanCopy(text: string): string {
  if (!text) return "";
  return text
    .replace(/^[0-9][0-9,.\sKkMm]*likes?,\s*[0-9][0-9,.\sKkMm]*comments?\s*-\s*[^:]+:\s*/i, "")
    .trim();
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
   COMPONENTES COMPARTILHADOS
═══════════════════════════════════════════════════════ */

/** Header limpo para páginas internas — sem navy/preto */
function PageHeader({ client, section }: { client: string; section: string }) {
  return (
    <View style={{ backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER }}>
      {/* Linha azul gradiente no topo */}
      <View style={{ height: 3, backgroundColor: BLUE }} />
      <View style={{
        paddingHorizontal: 32, paddingVertical: 12,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo + nome */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View style={{
            width: 22, height: 22, borderRadius: 6, backgroundColor: BLUE,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE }}>C</Text>
          </View>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: TEXT }}>
            Campanha Tráfego | Audaza
          </Text>
        </View>
        {/* Título da seção + cliente */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: TEXT }}>{section}</Text>
          <Text style={{ fontSize: 9, color: MUTED }}>{trunc(client, 38)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Badge de plataforma */
function PlatBadge({ platform }: { platform: string }) {
  const color = platColor(platform);
  return (
    <View style={{
      backgroundColor: platBg(color), borderRadius: 5,
      paddingVertical: 3, paddingHorizontal: 9,
      borderWidth: 1, borderColor: color + "22",
    }}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color }}>{platform}</Text>
    </View>
  );
}

/** Linha label + valor para a configuração Google Ads */
function GoogleConfigRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text style={{
        fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED,
        letterSpacing: 0.9, width: 110, paddingTop: 2,
      }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 9.5, color: TEXT, flex: 1, lineHeight: 1.55 }}>
        {value}
      </Text>
    </View>
  );
}

/** Card com a configuração Google Ads (tipo + campos específicos) */
function GoogleAdsConfigCard({ config }: { config: NonNullable<CampaignPlan["googleAdsConfig"]> }) {
  const color = "#EA4335";
  return (
    <View style={{
      backgroundColor: WHITE, borderRadius: 13,
      borderWidth: 1, borderColor: BORDER,
      borderLeftWidth: 4, borderLeftColor: color,
      marginBottom: 14, overflow: "hidden",
    }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 22, paddingVertical: 14,
        backgroundColor: color + "08",
        borderBottomWidth: 1, borderBottomColor: BORDER,
        flexDirection: "row", alignItems: "center", gap: 10,
      }}>
        <View style={{
          width: 30, height: 30, borderRadius: 8,
          backgroundColor: color + "16",
          borderWidth: 1, borderColor: color + "22",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color }}>G</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 7.5, fontFamily: "Helvetica-Bold", color, letterSpacing: 1.1,
          }}>
            CONFIGURAÇÃO GOOGLE ADS
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: TEXT, marginTop: 2, letterSpacing: -0.2 }}>
            {config.campaignType}
          </Text>
        </View>
      </View>

      {/* Content — campos por tipo */}
      <View style={{ paddingHorizontal: 22, paddingVertical: 14, gap: 10 }}>
        <GoogleConfigRow label="Idioma"               value={config.language} />
        <GoogleConfigRow label="Palavras-chave"       value={config.keywords} />
        <GoogleConfigRow label="Kw negativas"         value={config.negativeKeywords} />
        <GoogleConfigRow label="URL destino"          value={config.finalUrl} />
        <GoogleConfigRow label="Sinais de público"    value={config.audienceSignals} />
        <GoogleConfigRow label="Categorias"           value={config.shoppingCategories} />
        <GoogleConfigRow label="Vídeo YouTube"        value={config.youtubeVideoUrl} />
        <GoogleConfigRow label="Formato vídeo"        value={config.videoFormat} />
        <GoogleConfigRow label="Formato Demand Gen"   value={config.demandGenFormat} />
      </View>
    </View>
  );
}

/** Linha de público-alvo com chips (divide por " · ") */
function AudienceBlock({ audience, color }: { audience: string; color: string }) {
  const parts = audience.includes(" · ") ? audience.split(" · ").filter(Boolean) : [audience];
  const isChips = parts.length > 1;
  return (
    <View style={{
      paddingHorizontal: 12, paddingVertical: 10,
      borderLeftWidth: 3, borderLeftColor: color,
      backgroundColor: platBg(color),
    }}>
      <Text style={{
        fontSize: 7.5, fontFamily: "Helvetica-Bold", color,
        letterSpacing: 0.9, marginBottom: isChips ? 6 : 0,
      }}>
        PÚBLICO-ALVO
      </Text>
      {isChips ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {parts.map((part, i) => (
            <View key={i} style={{
              backgroundColor: WHITE, borderRadius: 20,
              borderWidth: 1, borderColor: color + "25",
              paddingVertical: 2, paddingHorizontal: 8,
            }}>
              <Text style={{ fontSize: 8, color: TEXT }}>{part}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 9, color: TEXT, lineHeight: 1.5 }}>{audience}</Text>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   DOCUMENTO
═══════════════════════════════════════════════════════ */
export default function CampaignPDF({ plan }: { plan: CampaignPlan }) {
  const today       = new Date().toLocaleDateString("pt-BR");
  const totalAdSets = plan.campaigns.reduce((s, c) => s + c.adSets.length, 0);
  const totalAds    = plan.campaigns.reduce((s, c) => s + (getHierarchyLabels(c.platform, c.googleCampaignType).hasManualAds ? c.adSets.reduce((ss, as) => ss + as.ads.length, 0) : 0), 0);
  const totalFiles  = plan.campaigns.reduce((s, c) =>
    s + c.adSets.reduce((ss, as) => ss + as.ads.filter(a => a.fileDataUrl || a.fileName).length, 0), 0);

  /* Labels agregados */
  const allLabelsPdf = plan.campaigns.map(c => getHierarchyLabels(c.platform, c.googleCampaignType));
  const uniqueAdSet  = [...new Set(allLabelsPdf.map(l => l.adSetPlural))];
  const uniqueAd     = [...new Set(allLabelsPdf.map(l => l.adPlural))];
  const adSetStatLabel = uniqueAdSet.length === 1 ? uniqueAdSet[0] : "Conjuntos / Grupos";
  const adStatLabel    = uniqueAd.length    === 1 ? uniqueAd[0]    : "Anúncios";

  const stats = [
    { label: "Campanhas",    value: plan.campaigns.length },
    { label: adSetStatLabel, value: totalAdSets },
    ...(totalAds > 0 ? [{ label: adStatLabel, value: totalAds }] : []),
    ...(totalFiles > 0 ? [{ label: "Criativos", value: totalFiles }] : []),
  ];

  /* Agrupa budget em pares para 2 colunas */
  const budgetPairs: (typeof plan.budgetDistribution)[] = [];
  for (let i = 0; i < plan.budgetDistribution.length; i += 2) {
    budgetPairs.push(plan.budgetDistribution.slice(i, i + 2));
  }

  return (
    <Document>

      {/* ══════════════════════════════════════════════════════
          PÁGINA 1 — OVERVIEW + ORÇAMENTO
          Espelha: hero gradiente azul + stats + budget cards
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: BG, padding: 0 }}>

        {/* ── Hero gradiente azul (idêntico ao resultado page) ── */}
        <View style={{ overflow: "hidden", position: "relative" }}>
          <Svg width={595} height={178} style={{ position: "absolute", top: 0, left: 0 }}>
            <Defs>
              <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%"   stopColor="#0057c2" stopOpacity={1} />
                <Stop offset="35%"  stopColor={BLUE}    stopOpacity={1} />
                <Stop offset="70%"  stopColor="#1a8aff" stopOpacity={1} />
                <Stop offset="100%" stopColor="#34aadc" stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={595} height={178} fill="url(#hero)" />
            {/* Círculos decorativos suaves */}
            <Rect x={420} y={-80} width={260} height={260} rx={130} fill={WHITE} fillOpacity={0.05} />
            <Rect x={480} y={80}  width={160} height={160} rx={80}  fill={WHITE} fillOpacity={0.04} />
            <Rect x={330} y={20}  width={80}  height={80}  rx={40}  fill={WHITE} fillOpacity={0.06} />
          </Svg>

          <View style={{ paddingHorizontal: 32, paddingTop: 30, paddingBottom: 26 }}>
            {/* Label topo */}
            <Text style={{
              fontSize: 8, fontFamily: "Helvetica-Bold",
              color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, marginBottom: 16,
            }}>
              {"PLANEJAMENTO ESTRATÉGICO · " + today}
            </Text>

            {/* Cliente + Orçamento */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 26, fontFamily: "Helvetica-Bold", color: WHITE,
                  marginBottom: 4, letterSpacing: -0.5, lineHeight: 1.1,
                }}>
                  {trunc(plan.overview.clientName, 36)}
                </Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                  {plan.overview.product}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", flexShrink: 0, marginLeft: 20 }}>
                <Text style={{
                  fontSize: 8, fontFamily: "Helvetica-Bold",
                  color: "rgba(255,255,255,0.55)", letterSpacing: 0.8, marginBottom: 5,
                }}>
                  {plan.overview.dailyBudget ? "INVEST. DIÁRIO" : "ORÇAMENTO TOTAL"}
                </Text>
                <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: -0.5 }}>
                  {plan.overview.dailyBudget || plan.overview.totalBudget}
                </Text>
              </View>
            </View>

            {/* Pills */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 18 }}>
              {[
                "🎯 " + plan.overview.objective,
                "📅 " + plan.overview.duration,
                ...plan.overview.platforms,
              ].map((tag, i) => (
                <View key={i} style={{
                  backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 6,
                  paddingVertical: 4, paddingHorizontal: 12,
                }}>
                  <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.92)" }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Resumo + Stats (card branco) ── */}
        <View style={{
          backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
          paddingHorizontal: 32, paddingTop: 20, paddingBottom: 0,
        }}>
          <Text style={{ fontSize: 11, color: SUB, lineHeight: 1.75, marginBottom: 18 }}>
            {plan.overview.summary}
          </Text>

          {/* Stats strip */}
          <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER }}>
            {stats.map((s, i) => (
              <View key={i} style={{
                flex: 1, paddingVertical: 14, alignItems: "center",
                borderRightWidth: i < stats.length - 1 ? 1 : 0,
                borderRightColor: BORDER,
              }}>
                <Text style={{
                  fontSize: 24, fontFamily: "Helvetica-Bold", color: TEXT,
                  marginBottom: 3, letterSpacing: -0.5,
                }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 8.5, color: MUTED }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Distribuição de Orçamento ── */}
        <View style={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 }}>
          {/* Label da seção */}
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1.1, marginBottom: 4 }}>
            INVESTIMENTO
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: TEXT, marginBottom: 12, letterSpacing: -0.3 }}>
            Distribuição de Orçamento
          </Text>

          {budgetPairs.map((pair, pi) => (
            <View key={pi} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              {pair.map((b, bi) => {
                const color  = platColor(b.platform);
                const bg     = platBg(color);
                const glyph  = platGlyph(b.platform);
                const barW   = Math.min(206, Math.round(206 * b.percentage / 100));
                return (
                  <View key={bi} style={{
                    flex: 1, backgroundColor: WHITE, borderRadius: 12,
                    borderWidth: 1, borderColor: BORDER,
                    paddingHorizontal: 16, paddingVertical: 14,
                  }}>
                    {/* Ícone + plataforma + valor */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 9,
                        backgroundColor: bg,
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                        borderWidth: 1, borderColor: color + "22",
                      }}>
                        <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color }}>{glyph}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", color: TEXT, marginBottom: 2 }}>
                          {b.platform}
                        </Text>
                        <Text style={{ fontSize: 8.5, color: MUTED }}>{b.percentage}% do orçamento</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color, letterSpacing: -0.3 }}>
                        {b.amount}
                      </Text>
                    </View>
                    {/* Barra de progresso */}
                    <Svg width={206} height={4}>
                      <Rect x={0} y={0} width={206} height={4} rx={2} fill={BG} />
                      <Rect x={0} y={0} width={barW} height={4} rx={2} fill={color} />
                    </Svg>
                    {/* Alocação */}
                    <Text style={{ fontSize: 8, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
                      {b.allocation}
                    </Text>
                  </View>
                );
              })}
              {pair.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════
          PÁGINA 2 — ESTRUTURA DE CAMPANHAS
          Espelha: cards brancos, border esquerda colorida
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: BG, padding: 0 }}>
        <PageHeader client={plan.overview.clientName} section="Estrutura de Campanhas" />

        <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20 }}>
          {plan.googleAdsConfig && <GoogleAdsConfigCard config={plan.googleAdsConfig} />}
          {plan.campaigns.map((campaign, ci) => {
            const color  = platColor(campaign.platform);
            const bg     = platBg(color);
            const labels = getHierarchyLabels(campaign.platform, campaign.googleCampaignType);
            return (
              <View key={ci} style={{
                backgroundColor: WHITE, borderRadius: 13,
                borderWidth: 1, borderColor: BORDER,
                marginBottom: 12, overflow: "hidden",
              }}>

                {/* Header da campanha */}
                <View style={{
                  paddingHorizontal: 22, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: BORDER,
                  borderLeftWidth: 4, borderLeftColor: color,
                  backgroundColor: bg.replace("16", "08"),  // ainda mais sutil
                  flexDirection: "row", alignItems: "center",
                  justifyContent: "space-between", gap: 14,
                }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <PlatBadge platform={campaign.platform} />
                      {campaign.objective ? (
                        <Text style={{ fontSize: 9, color: MUTED }}>{campaign.objective}</Text>
                      ) : null}
                    </View>
                    <Text style={{
                      fontSize: 12, fontFamily: "Helvetica-Bold", color: TEXT, letterSpacing: -0.2,
                    }}>
                      {trunc(campaign.name, 54)}
                    </Text>
                  </View>
                  {campaign.totalBudget && campaign.totalBudget !== "A definir" ? (
                    <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color, flexShrink: 0 }}>
                      {campaign.totalBudget}
                    </Text>
                  ) : null}
                </View>

                {/* Conjuntos */}
                <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 9 }}>
                  {campaign.adSets.map((adSet, j) => (
                    <View key={j} style={{
                      backgroundColor: BG, borderRadius: 10,
                      borderWidth: 1, borderColor: BORDMID,
                      overflow: "hidden",
                    }} wrap={false}>

                      {/* Header do conjunto */}
                      <View style={{
                        paddingHorizontal: 14, paddingVertical: 11,
                        borderBottomWidth: 1, borderBottomColor: BORDMID,
                        flexDirection: "row", alignItems: "center",
                        justifyContent: "space-between", gap: 10,
                        backgroundColor: WHITE,
                      }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 9, flex: 1 }}>
                          {/* Badge colorido sólido */}
                          <View style={{
                            width: 24, height: 24, borderRadius: 7,
                            backgroundColor: color,
                            alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE }}>
                              {j + 1}
                            </Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: TEXT }}>
                              {adSet.name}
                            </Text>
                            <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 2 }}>
                              {labels.hasManualAds
                                ? `${adSet.ads.length} ${(adSet.ads.length === 1 ? labels.ad : labels.adPlural).toLowerCase()}${adSet.ads.length > 0 ? " · " + [...new Set(adSet.ads.map(a => a.format))].join(", ") : ""}`
                                : "Filtro de feed · sem anúncios manuais"}
                            </Text>
                          </View>
                        </View>
                        {adSet.budget && adSet.budget !== "" ? (
                          <View style={{
                            backgroundColor: bg, borderRadius: 6,
                            paddingVertical: 4, paddingHorizontal: 10,
                            borderWidth: 1, borderColor: color + "22", flexShrink: 0,
                          }}>
                            <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color }}>
                              {adSet.budget}/dia
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Corpo do conjunto */}
                      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 7 }}>
                        {/* Público-alvo */}
                        {adSet.audience ? (
                          <AudienceBlock audience={adSet.audience} color={color} />
                        ) : null}

                        {/* Feed note — Shopping/PMax não tem anúncios manuais */}
                        {!labels.hasManualAds && (
                          <View style={{
                            backgroundColor: "#EA433509", borderRadius: 8,
                            borderWidth: 1, borderColor: "#EA433522", borderStyle: "dashed",
                            paddingHorizontal: 12, paddingVertical: 9,
                            flexDirection: "row", gap: 8,
                          }}>
                            <Text style={{ fontSize: 11 }}>{campaign.googleCampaignType === "Performance Max" ? "⚡" : "🛍️"}</Text>
                            <Text style={{ fontSize: 8.5, color: SUB, flex: 1, lineHeight: 1.55 }}>
                              {campaign.googleCampaignType === "Performance Max"
                                ? "Grupo de Recursos — contém títulos, descrições, imagens, vídeos e sinais de público. O Google monta os criativos automaticamente."
                                : "Sem anúncios manuais — criativos gerados automaticamente pelo feed do Merchant Center, filtrados por este grupo."}
                            </Text>
                          </View>
                        )}

                        {/* Anúncios */}
                        {labels.hasManualAds && adSet.ads.map((ad, k) => (
                          <View key={k} style={{
                            backgroundColor: WHITE, borderRadius: 9,
                            borderWidth: 1, borderColor: BORDMID,
                            paddingHorizontal: 11, paddingVertical: 10,
                          }}>
                            {/* Header do anúncio */}
                            <View style={{
                              flexDirection: "row", alignItems: "center", gap: 7,
                              marginBottom: (ad.copy || ad.fileDataUrl) ? 8 : 0,
                            }}>
                              <View style={{ backgroundColor: bg, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 7 }}>
                                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color }}>{ad.format}</Text>
                              </View>
                              <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: SUB }}>{ad.name}</Text>
                            </View>

                            {/* Imagem (47%) + copy + data do post */}
                            {ad.fileDataUrl && ad.fileType === "image" ? (
                              <View style={{ flexDirection: "row", gap: 10 }}>
                                <Image src={ad.fileDataUrl} style={{ width: "47%", borderRadius: 6 }} />
                                {ad.copy ? (
                                  <View style={{ flex: 1, flexDirection: "column", gap: 5 }}>
                                    <Text style={{ fontSize: 8.5, color: SUB, lineHeight: 1.65 }}>
                                      {cleanCopy(ad.copy)}
                                    </Text>
                                    {extractPostDate(ad.copy) ? (
                                      <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 2 }}>
                                        Publicado em {extractPostDate(ad.copy)}
                                      </Text>
                                    ) : null}
                                  </View>
                                ) : null}
                              </View>
                            ) : (
                              ad.copy ? (
                                <View style={{ flexDirection: "column", gap: 5 }}>
                                  <Text style={{ fontSize: 9, color: SUB, lineHeight: 1.65 }}>
                                    {cleanCopy(ad.copy)}
                                  </Text>
                                  {extractPostDate(ad.copy) ? (
                                    <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 2 }}>
                                      Publicado em {extractPostDate(ad.copy)}
                                    </Text>
                                  ) : null}
                                </View>
                              ) : null
                            )}

                            {ad.fileName && ad.fileType === "video" ? (
                              <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>
                                {"🎬 " + ad.fileName}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════
          PÁGINA 3 — CRONOGRAMA
          Espelha: timeline com linha gradiente, cards limpos
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: BG, padding: 0 }}>
        <PageHeader client={plan.overview.clientName} section="Cronograma de Implementação" />

        <View style={{ paddingHorizontal: 32, paddingTop: 22, paddingBottom: 80 }}>
          {/* Timeline */}
          <View style={{ position: "relative", paddingLeft: 52 }}>

            {/* Linha vertical gradiente */}
            <Svg
              width={30}
              height={plan.timeline.length * 116}
              style={{ position: "absolute", left: 0, top: 0 }}
            >
              <Defs>
                <LinearGradient id="tlLine" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%"   stopColor={BLUE}    stopOpacity={1} />
                  <Stop offset="100%" stopColor={SUCCESS} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Line
                x1={14} y1={14}
                x2={14} y2={plan.timeline.length * 116 - 14}
                stroke="url(#tlLine)"
                strokeWidth={1.5}
                strokeOpacity={0.22}
              />
            </Svg>

            {plan.timeline.map((phase, i) => {
              const isFirst  = i === 0;
              const isLast   = i === plan.timeline.length - 1;
              const accent   = isFirst ? BLUE : isLast ? SUCCESS : "#c8d0db";
              const nodeBg   = isFirst ? BLUE : isLast ? SUCCESS : WHITE;
              const nodeClr  = isFirst || isLast ? WHITE : MUTED;
              const pillBg   = isFirst ? "#EBF5FF" : isLast ? "#dcfce7" : WHITE;
              const pillClr  = isFirst ? BLUE     : isLast ? SUCCESS   : SUB;
              const hasShadow = isFirst || isLast;

              return (
                <View key={i} style={{
                  flexDirection: "row",
                  marginBottom: i < plan.timeline.length - 1 ? 16 : 0,
                  position: "relative",
                }} wrap={false}>

                  {/* Nó circular */}
                  <View style={{
                    position: "absolute", left: -52, top: 0,
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: nodeBg,
                    borderWidth: hasShadow ? 2 : 1.5,
                    borderColor: hasShadow ? accent : BORDER,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", color: nodeClr }}>
                      {i + 1}
                    </Text>
                  </View>

                  {/* Card da fase */}
                  <View style={{
                    flex: 1, backgroundColor: WHITE, borderRadius: 9,
                    borderWidth: 1, borderColor: BORDER,
                    borderLeftWidth: 3, borderLeftColor: accent,
                    paddingHorizontal: 14, paddingVertical: 12,
                  }}>
                    {/* Fase + duração */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: TEXT }}>
                        {phase.phase}
                      </Text>
                      <View style={{
                        backgroundColor: pillBg, borderRadius: 6,
                        paddingVertical: 3, paddingHorizontal: 10,
                        borderWidth: 1, borderColor: pillClr + "28",
                      }}>
                        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: pillClr }}>
                          {phase.duration}
                        </Text>
                      </View>
                    </View>
                    {/* Ações */}
                    <View style={{ gap: 5 }}>
                      {phase.actions.map((action, j) => (
                        <View key={j} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                          <View style={{
                            width: 4, height: 4, borderRadius: 2,
                            backgroundColor: accent, marginTop: 5, flexShrink: 0, opacity: 0.6,
                          }} />
                          <Text style={{ fontSize: 9, color: SUB, flex: 1, lineHeight: 1.6 }}>
                            {action}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ height: 3, backgroundColor: BLUE }} />
          <View style={{
            backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER,
            paddingHorizontal: 32, paddingVertical: 12,
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          }}>
            <Text style={{ fontSize: 8.5, color: BLUE, fontFamily: "Helvetica-Bold" }}>
              Campanha Tráfego | Audaza
            </Text>
            <Text style={{ fontSize: 8.5, color: MUTED }}>{today}</Text>
          </View>
        </View>
      </Page>

    </Document>
  );
}
