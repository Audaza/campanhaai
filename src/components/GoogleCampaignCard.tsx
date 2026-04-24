"use client";

import { useRef, useEffect } from "react";
import type {
  CampaignInput, AdSetInput, AdInput, BudgetLevel, GoogleCampaignType,
} from "@/types/campaign";
import { getHierarchyLabels } from "@/lib/hierarchy";

const RED        = "#EA4335";
const RED_DIM    = "rgba(234,67,53,0.08)";
const RED_BORDER = "rgba(234,67,53,0.22)";

function uid() { return Math.random().toString(36).slice(2, 9); }

function defaultFormatFor(gType: GoogleCampaignType): string {
  if (gType === "Pesquisa")        return "Responsivo de Pesquisa";
  if (gType === "Display")         return "Display Responsivo";
  if (gType === "Vídeo/YouTube")   return "Vídeo";
  if (gType === "Shopping")        return "Display Responsivo";
  if (gType === "Performance Max") return "Imagem";
  if (gType === "Demand Gen")      return "Imagem";
  return "Responsivo de Pesquisa";
}

function makeGroup(gType: GoogleCampaignType, index: number): AdSetInput {
  const labels = getHierarchyLabels("Google Ads", gType);
  const ad: AdInput = {
    id:     uid(),
    name:   `${labels.adPrefix} #1`,
    format: defaultFormatFor(gType) as AdInput["format"],
    copy:   "",
  };
  return {
    id:          uid(),
    name:        `${labels.adSetPrefix} #${index + 1}`,
    audience:    "",
    dailyBudget: "",
    /* Shopping e PMax não usam "ads" individualmente — mantemos 1 slot "fantasma" pra armazenar dados do asset group (PMax) ou vazio (Shopping) */
    ads:         [ad],
  };
}

/* ═══════════════════════════════════════════════════════
   Auto-growing textarea (reutilizável)
═══════════════════════════════════════════════════════ */
function AutoTextarea({ value, placeholder, rows = 3, onChange }: {
  value: string; placeholder?: string; rows?: number; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 4}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
        border: "1.5px solid rgba(0,0,0,0.14)", background: "var(--surface)",
        color: "var(--text)", fontFamily: "inherit", outline: "none",
        resize: "none", overflow: "hidden", lineHeight: 1.55,
      }}
      onFocus={e => { e.target.style.borderColor = RED; e.target.style.boxShadow = `0 0 0 3px ${RED_DIM}`; }}
      onBlur={e  => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
    />
  );
}

function TextInput({ value, placeholder, onChange }: {
  value: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
        border: "1.5px solid rgba(0,0,0,0.14)", background: "var(--surface)",
        color: "var(--text)", fontFamily: "inherit", outline: "none",
      }}
      onFocus={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.boxShadow = `0 0 0 3px ${RED_DIM}`; }}
      onBlur={e  => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function BudgetInput({ value, placeholder, onChange }: {
  value: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
        fontSize: 12, fontWeight: 700, color: RED, pointerEvents: "none",
      }}>R$</span>
      <input
        type="number" min="0" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "9px 9px 9px 28px", borderRadius: 8, fontSize: 13,
          border: "1.5px solid rgba(0,0,0,0.14)", background: "var(--surface)",
          color: "var(--text)", fontFamily: "inherit", outline: "none",
        }}
      />
    </div>
  );
}

function FieldLabel({ icon, children, hint }: { icon?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        <span style={{
          fontSize: 11, fontWeight: 700, color: "var(--text-sub)",
          letterSpacing: "0.03em", textTransform: "uppercase" as const,
        }}>
          {children}
        </span>
      </div>
      {hint && <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{hint}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Conteúdo específico por tipo
═══════════════════════════════════════════════════════ */

function SearchGroupFields({ group, onChange }: {
  group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  const ad = group.ads[0];
  const setCopy = (v: string) => onChange({ ads: [{ ...ad, copy: v }] });
  return (
    <>
      <div>
        <FieldLabel icon="🔑" hint="Termos que devem acionar seus anúncios — um por linha ou separados por vírgula.">
          Palavras-chave
        </FieldLabel>
        <AutoTextarea
          value={group.audience}
          placeholder="plano de saúde empresarial&#10;convênio médico PME&#10;cotação plano de saúde"
          rows={3}
          onChange={v => onChange({ audience: v })}
        />
      </div>
      <div>
        <FieldLabel icon="📝" hint="Até 15 títulos (máx 30 caracteres) e 4 descrições (máx 90). Separe por '|' ou quebra de linha.">
          Anúncio responsivo (RSA)
        </FieldLabel>
        <AutoTextarea
          value={ad?.copy ?? ""}
          placeholder={"Títulos:\n- Plano de Saúde para Empresa\n- Cotação em 2 minutos\n- Economize até 30%\n\nDescrições:\n- Atendimento em todo Brasil, cobertura nacional.\n- Consulte cotação personalizada para sua equipe."}
          rows={4}
          onChange={setCopy}
        />
      </div>
    </>
  );
}

function DisplayGroupFields({ group, onChange }: {
  group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  const ad = group.ads[0];
  const setCopy = (v: string) => onChange({ ads: [{ ...ad, copy: v }] });
  return (
    <>
      <div>
        <FieldLabel icon="🎯" hint="Interesses, segmentos no mercado, dados demográficos, públicos similares.">
          Segmentos de público
        </FieldLabel>
        <AutoTextarea
          value={group.audience}
          placeholder="Pessoas interessadas em saúde corporativa&#10;Gestores de RH em PMEs&#10;Lookalike de clientes"
          rows={3}
          onChange={v => onChange({ audience: v })}
        />
      </div>
      <div>
        <FieldLabel icon="🖼️" hint="Texto base para o Anúncio Display Responsivo. Imagens são enviadas diretamente no Google Ads.">
          RDA — headlines + descrições
        </FieldLabel>
        <AutoTextarea
          value={ad?.copy ?? ""}
          placeholder={"Headlines:\n- Plano de Saúde Corporativo\n- Cobertura Nacional\n\nDescrições:\n- Proteja sua equipe com o melhor atendimento."}
          rows={3}
          onChange={setCopy}
        />
      </div>
    </>
  );
}

function VideoGroupFields({ group, onChange }: {
  group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  const ad = group.ads[0];
  const setCopy = (v: string) => onChange({ ads: [{ ...ad, copy: v }] });
  const setLink = (v: string) => onChange({ ads: [{ ...ad, link: v }] });
  return (
    <>
      <div>
        <FieldLabel icon="🎯" hint="Canais, palavras-chave, públicos ou vídeos específicos que devem ser alvo.">
          Segmentação / posicionamentos
        </FieldLabel>
        <AutoTextarea
          value={group.audience}
          placeholder="Canais de saúde e bem-estar&#10;Lookalike de visitantes do site&#10;Palavras: plano de saúde, convênio"
          rows={3}
          onChange={v => onChange({ audience: v })}
        />
      </div>
      <div>
        <FieldLabel icon="▶️" hint="URL público do vídeo que vai rodar neste grupo (pode ser diferente por grupo).">
          Link do vídeo no YouTube
        </FieldLabel>
        <TextInput
          value={ad?.link ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          onChange={setLink}
        />
      </div>
      <div>
        <FieldLabel icon="💬" hint="Headline que aparece ao lado do vídeo + chamada pra ação.">
          Headline e CTA
        </FieldLabel>
        <AutoTextarea
          value={ad?.copy ?? ""}
          placeholder={"Headline: Descubra planos de saúde corporativos\nCTA: Saber mais"}
          rows={2}
          onChange={setCopy}
        />
      </div>
    </>
  );
}

function ShoppingGroupFields({ group, onChange }: {
  group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  return (
    <div>
      <FieldLabel icon="🛍️" hint="Filtre quais produtos do feed farão parte deste grupo — categoria, marca, faixa de preço, etiqueta.">
        Filtros do feed de produtos
      </FieldLabel>
      <AutoTextarea
        value={group.audience}
        placeholder="Categoria: Tênis Esportivos&#10;Preço: > R$ 200&#10;Marca: Nike, Adidas&#10;Etiqueta customizada: 'linha premium'"
        rows={3}
        onChange={v => onChange({ audience: v })}
      />
    </div>
  );
}

function PMaxGroupFields({ group, onChange }: {
  group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  const ad = group.ads[0];
  const setCopy = (v: string) => onChange({ ads: [{ ...ad, copy: v }] });
  return (
    <>
      <div>
        <FieldLabel icon="📡" hint="Público que o Google usa como ponto de partida pra encontrar conversões similares.">
          Sinais de público
        </FieldLabel>
        <AutoTextarea
          value={group.audience}
          placeholder="Clientes atuais&#10;Visitantes do site últimos 90 dias&#10;Interessados em benefícios corporativos"
          rows={3}
          onChange={v => onChange({ audience: v })}
        />
      </div>
      <div>
        <FieldLabel icon="🧩" hint="Descreva os ativos que compõem o grupo — Google combina automaticamente.">
          Ativos do grupo (títulos, descrições, mídias, URLs)
        </FieldLabel>
        <AutoTextarea
          value={ad?.copy ?? ""}
          placeholder={"Títulos (até 15):\n- Plano de Saúde Corporativo\n- Cotação Online Rápida\n\nDescrições (até 5):\n- Atendimento nacional para PMEs\n\nMídias disponíveis:\n- 5 imagens horizontais, 3 quadradas\n- 2 vídeos 15s\n- Logo oficial\n\nURL final: https://..."}
          rows={6}
          onChange={setCopy}
        />
      </div>
    </>
  );
}

function DemandGenGroupFields({ group, onChange }: {
  group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  const ad = group.ads[0];
  const setCopy = (v: string) => onChange({ ads: [{ ...ad, copy: v }] });
  return (
    <>
      <div>
        <FieldLabel icon="🎯" hint="Interesses, lookalikes, remarketing, dados demográficos.">
          Segmentação de público
        </FieldLabel>
        <AutoTextarea
          value={group.audience}
          placeholder="Lookalike de clientes existentes&#10;Interessados em saúde corporativa&#10;Visitantes do site"
          rows={3}
          onChange={v => onChange({ audience: v })}
        />
      </div>
      <div>
        <FieldLabel icon="💬" hint="Copy curta e direta — Google monta anúncios em Imagem/Carrossel/Vídeo automaticamente.">
          Copy do anúncio
        </FieldLabel>
        <AutoTextarea
          value={ad?.copy ?? ""}
          placeholder={"Headline: Proteja sua equipe com saúde corporativa\nDescrição: Cotação em minutos, cobertura nacional\nCTA: Solicitar cotação"}
          rows={3}
          onChange={setCopy}
        />
      </div>
    </>
  );
}

function GroupFieldsFor({ gType, group, onChange }: {
  gType: GoogleCampaignType; group: AdSetInput; onChange: (u: Partial<AdSetInput>) => void;
}) {
  switch (gType) {
    case "Pesquisa":        return <SearchGroupFields     group={group} onChange={onChange} />;
    case "Display":         return <DisplayGroupFields    group={group} onChange={onChange} />;
    case "Vídeo/YouTube":   return <VideoGroupFields      group={group} onChange={onChange} />;
    case "Shopping":        return <ShoppingGroupFields   group={group} onChange={onChange} />;
    case "Performance Max": return <PMaxGroupFields       group={group} onChange={onChange} />;
    case "Demand Gen":      return <DemandGenGroupFields  group={group} onChange={onChange} />;
  }
}

/* ═══════════════════════════════════════════════════════
   Componente principal
═══════════════════════════════════════════════════════ */

interface Props {
  campaign:    CampaignInput;
  budgetLevel: BudgetLevel;
  onChange:    (c: CampaignInput) => void;
}

export default function GoogleCampaignCard({ campaign, budgetLevel, onChange }: Props) {
  const maybeGType = campaign.googleCampaignType;
  if (!maybeGType) {
    return (
      <div style={{
        padding: "20px 22px", background: "var(--surface-2)",
        borderRadius: 12, border: "1px solid var(--border-mid)",
        color: "var(--muted)", fontSize: 13,
      }}>
        Tipo de campanha Google não definido. Volte ao passo 2.
      </div>
    );
  }
  const gType: GoogleCampaignType = maybeGType;
  const labels = getHierarchyLabels("Google Ads", gType);

  function updateGroup(gIdx: number, u: Partial<AdSetInput>) {
    onChange({
      ...campaign,
      adSets: campaign.adSets.map((g, i) => i === gIdx ? { ...g, ...u } : g),
    });
  }
  function addGroup() {
    onChange({
      ...campaign,
      adSets: [...campaign.adSets, makeGroup(gType, campaign.adSets.length)],
    });
  }
  function removeGroup(gIdx: number) {
    if (campaign.adSets.length <= 1) return;
    onChange({
      ...campaign,
      adSets: campaign.adSets.filter((_, i) => i !== gIdx),
    });
  }

  return (
    <div style={{
      background: "var(--surface-2)", borderRadius: 14,
      border: "1px solid var(--border-mid)", overflow: "hidden",
    }}>
      {/* Header da campanha */}
      <div style={{
        background: `linear-gradient(135deg, ${RED}12, ${RED}04)`,
        borderBottom: `1px solid ${RED}20`,
        padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" as const }}>
          <div style={{
            background: RED, borderRadius: 7, padding: "3px 10px",
            fontSize: 10, fontWeight: 800, color: "white", letterSpacing: "0.04em",
          }}>
            GOOGLE ADS
          </div>
          <div style={{
            background: "white", borderRadius: 7, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, color: RED,
            border: `1px solid ${RED}33`, letterSpacing: "0.01em",
          }}>
            {gType}
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
            {campaign.adSets.length} {(campaign.adSets.length === 1 ? labels.adSet : labels.adSetPlural).toLowerCase()}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Nome da campanha</FieldLabel>
            <TextInput
              value={campaign.name}
              placeholder={`Campanha Google ${gType}`}
              onChange={v => onChange({ ...campaign, name: v })}
            />
          </div>
          {budgetLevel === "campaign" && (
            <div style={{ width: 150 }}>
              <FieldLabel>Orçamento total</FieldLabel>
              <BudgetInput
                value={campaign.totalBudget}
                placeholder="5.000"
                onChange={v => onChange({ ...campaign, totalBudget: v })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Grupos */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {campaign.adSets.map((group, gIdx) => (
          <div key={group.id} style={{
            background: "var(--surface)", borderRadius: 12,
            border: "1px solid var(--border-mid)", overflow: "hidden",
          }}>
            {/* Header do grupo */}
            <div style={{
              padding: "11px 14px", borderBottom: "1px solid var(--border-mid)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, background: `${RED}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: RED, flexShrink: 0,
              }}>
                {gIdx + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", letterSpacing: "0.02em" }}>
                {labels.adSet.toUpperCase()}
              </span>
              {campaign.adSets.length > 1 && (
                <button type="button" onClick={() => removeGroup(gIdx)} style={{
                  marginLeft: "auto", fontSize: 11, color: "var(--danger)",
                  background: "var(--danger-dim)", border: "none", cursor: "pointer",
                  fontFamily: "inherit", padding: "3px 9px", borderRadius: 6,
                }}>
                  Remover
                </button>
              )}
            </div>

            {/* Corpo do grupo */}
            <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Nome do grupo + orçamento */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel>Nome do {labels.adSet.toLowerCase()}</FieldLabel>
                  <TextInput
                    value={group.name}
                    placeholder={`${labels.adSet} ${gIdx + 1}`}
                    onChange={v => updateGroup(gIdx, { name: v })}
                  />
                </div>
                {budgetLevel === "adset" && (
                  <div style={{ width: 120 }}>
                    <FieldLabel>Budget/dia</FieldLabel>
                    <BudgetInput
                      value={group.dailyBudget}
                      placeholder="200"
                      onChange={v => updateGroup(gIdx, { dailyBudget: v })}
                    />
                  </div>
                )}
              </div>

              {/* Campos específicos do tipo */}
              <GroupFieldsFor
                gType={gType}
                group={group}
                onChange={u => updateGroup(gIdx, u)}
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={addGroup} className="add-dashed"
          style={{ borderRadius: 10, padding: "11px" }}>
          + Adicionar {labels.adSet.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
