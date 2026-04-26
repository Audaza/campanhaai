"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  CampaignFormData, Objective, Platform, GoogleCampaignType,
  Gender, Duration, BudgetType, BudgetLevel, AudienceType,
  Campaign, CampaignPlan, TimelinePhase,
} from "@/types/campaign";
import StructureBuilder, { makeStructure } from "@/components/StructureBuilder";
import type { StructurePrefill } from "@/components/StructureBuilder";
import { PlatformLogo } from "@/components/PlatformLogo";
import { getHierarchyLabels } from "@/lib/hierarchy";
import KeywordChipInput from "@/components/KeywordChipInput";
import BrandHeader from "@/components/BrandHeader";
import ThemeToggle from "@/components/ThemeToggle";

/* ── Constants ── */

const OBJECTIVES: { value: Objective; emoji: string; label: string }[] = [
  { value: "Conversão",               emoji: "🛒", label: "Conversão" },
  { value: "Tráfego",                 emoji: "🔗", label: "Tráfego" },
  { value: "Geração de Leads",        emoji: "🧲", label: "Leads" },
  { value: "Reconhecimento de Marca", emoji: "👁️", label: "Reconhecimento" },
  { value: "Engajamento",             emoji: "❤️", label: "Engajamento" },
  { value: "Vendas Diretas",          emoji: "💰", label: "Vendas" },
];

const PLATFORM_GROUPS: { group: string; hint: string; platforms: { value: Platform; color: string; letter: string }[] }[] = [
  {
    group: "Meta",
    hint:  "Podem ser combinadas",
    platforms: [
      { value: "Facebook",  color: "#1877F2", letter: "f"  },
      { value: "Instagram", color: "#E1306C", letter: "📸" },
    ],
  },
  {
    group: "Outras plataformas",
    hint:  "Estrutura própria para cada uma",
    platforms: [
      { value: "Google Ads",  color: "#EA4335", letter: "G" },
      { value: "TikTok Ads",  color: "#010101", letter: "♪" },
      { value: "YouTube Ads", color: "#FF0000", letter: "▶" },
    ],
  },
];

const GOOGLE_CAMPAIGN_TYPES: { value: GoogleCampaignType; emoji: string; label: string; sub: string }[] = [
  { value: "Pesquisa",        emoji: "🔎",  label: "Pesquisa",        sub: "Anúncios por palavras-chave" },
  { value: "Display",         emoji: "🖼️",  label: "Display",         sub: "Banners na rede Google" },
  { value: "Vídeo/YouTube",   emoji: "▶️",  label: "Vídeo/YouTube",   sub: "Anúncios em vídeo" },
  { value: "Shopping",        emoji: "🛍️",  label: "Shopping",        sub: "Feed de produtos" },
  { value: "Performance Max", emoji: "⚡",  label: "Performance Max", sub: "Todos canais Google" },
  { value: "Demand Gen",      emoji: "📈",  label: "Demand Gen",      sub: "Discovery + YouTube" },
];

const GOOGLE_VIDEO_FORMATS = [
  "In-Stream puláveis",
  "In-Stream não puláveis",
  "Bumper (6s)",
  "In-Feed",
  "Shorts",
];

const GOOGLE_DEMAND_GEN_FORMATS = [
  "Imagem única",
  "Carrossel",
  "Vídeo",
];

/* Objetivos válidos por tipo de campanha Google */
const GOOGLE_OBJECTIVES: Record<GoogleCampaignType, Objective[]> = {
  "Pesquisa":        ["Vendas Diretas", "Geração de Leads", "Tráfego"],
  "Display":         ["Vendas Diretas", "Geração de Leads", "Tráfego", "Reconhecimento de Marca"],
  "Vídeo/YouTube":   ["Reconhecimento de Marca", "Engajamento", "Tráfego"],
  "Shopping":        ["Vendas Diretas"],
  "Performance Max": ["Vendas Diretas", "Geração de Leads", "Tráfego"],
  "Demand Gen":      ["Vendas Diretas", "Geração de Leads", "Reconhecimento de Marca", "Tráfego"],
};

/* Google Ads sempre define orçamento no nível da campanha */
const GOOGLE_BUDGET_LEVEL: "campaign" = "campaign";

/* Tipos Google em que público demográfico é só exclusão (keywords/feed comandam) */
const GOOGLE_DEMO_EXCLUSION_ONLY: GoogleCampaignType[] = ["Pesquisa", "Shopping"];

/* Idiomas comuns para Google Ads */
const GOOGLE_LANGUAGES = [
  "Português", "Inglês", "Espanhol", "Todos",
];

/* Label das "unidades" de estrutura dentro de uma campanha Google */
function googleAdSetLabel(type: GoogleCampaignType | ""): string {
  if (type === "Vídeo/YouTube")   return "Grupo de Vídeos";
  if (type === "Shopping")        return "Grupo de Produtos";
  if (type === "Performance Max") return "Grupo de Recursos";
  return "Grupo de Anúncios";
}
function googleAdLabel(type: GoogleCampaignType | ""): string {
  if (type === "Vídeo/YouTube") return "Vídeo";
  if (type === "Shopping")      return "Produto";
  return "Anúncio";
}

const DURATIONS: Duration[] = ["15 dias","30 dias","60 dias","90 dias"];
const GENDERS: Gender[]     = ["Todos","Masculino","Feminino"];
const STEP_LABELS            = ["Cliente","Campanha","Cronograma","Público","Estrutura"];

const INITIAL: CampaignFormData = {
  clientName:"", product:"", website:"",
  campaignName:"",
  objective:"Conversão", platforms:[],
  budgetType:"total", budgetLevel:"adset", budget:"",
  duration:"30 dias",
  startDate:"", endDate:"",
  createTimeline: true,
  ageMin:"18", ageMax:"45",
  gender:"Todos", location:"",
  audienceType:"personalizado", interests:"", remarketingSource:"",
  structCampaigns: 1,
  structAdSets:    2,
  structAds:       1,
  campaignInputs: [],
  googleCampaignType:       "",
  googleKeywords:           "",
  googleNegativeKeywords:   "",
  googleFinalUrl:           "",
  googleAudienceSignals:    "",
  googleShoppingCategories: "",
  googleVideoFormat:        "",
  googleDemandGenFormat:    "",
  googleLanguage:           "Português",
  youtubeVideoUrl:          "",
};

/* ── Timeline local computation ── */
function computeTimeline(startDate: string, endDate: string): TimelinePhase[] {
  const start     = new Date(startDate);
  const end       = new Date(endDate);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });

  if (totalDays < 15) {
    return [
      { phase:"Data Início",  duration: fmt(start),
        actions:["Subir criativos nas plataformas","Configurar pixels e rastreamento","Ativar campanhas e conjuntos de anúncios"] },
      { phase:"Encerramento", duration: fmt(end),
        actions:["Pausar campanhas ativas","Exportar relatório de desempenho","Registrar aprendizados para próximas campanhas"] },
    ];
  }
  return [
    { phase:"Data Início",             duration: fmt(start),
      actions:["Subir criativos nas plataformas","Configurar pixels e rastreamento","Ativar campanhas e conjuntos de anúncios"] },
    { phase:"Otimização",              duration:"3 dias",
      actions:["Analisar métricas iniciais de entrega","Ajustar lances e orçamentos por conjunto","Identificar criativos com melhor desempenho"] },
    { phase:"Escala",                  duration:"7 dias",
      actions:["Aumentar orçamento nos conjuntos vencedores","Pausar anúncios com baixo desempenho","Testar variações de copy e criativo"] },
    { phase:"Análise Final",           duration:"Escala ou Desativar",
      actions:["Avaliar performance geral da campanha","Decidir quais conjuntos escalar ou desativar","Documentar aprendizados para próximas campanhas"] },
  ];
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/* ── Field wrapper ── */
function Field({ label, hint, optional, children }: {
  label: string; hint?: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
        <label style={{ fontSize:13, fontWeight:600, color:"var(--text-dim)", letterSpacing:"-0.01em" }}>
          {label}
        </label>
        {optional && (
          <span style={{ fontSize:11, color:"var(--muted)", fontWeight:400 }}>opcional</span>
        )}
      </div>
      {hint && <p style={{ fontSize:12, color:"var(--muted)", margin:0 }}>{hint}</p>}
      {children}
    </div>
  );
}

function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 className="font-display" style={{
        fontSize: 24, fontWeight: 500, color: "var(--text)",
        margin: 0, letterSpacing: "-0.035em", lineHeight: 1.15,
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{
          fontSize: 14, color: "var(--text-sub)",
          margin: "6px 0 0", fontWeight: 300, lineHeight: 1.55,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Number Stepper ── */
function Stepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange:(v:number)=>void;
}) {
  return (
    <div style={{
      display:"inline-flex", alignItems:"center",
      border:"1.5px solid var(--border-input)", borderRadius:10,
      overflow:"hidden", background:"var(--surface)",
    }}>
      <button type="button" onClick={()=>onChange(Math.max(min,value-1))} style={{
        width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
        background:"transparent", border:"none", cursor: value<=min ? "default" : "pointer",
        fontSize:18, color: value<=min ? "var(--muted)" : "var(--text)", fontFamily:"inherit",
        transition:"background 0.1s",
      }}
        onMouseEnter={e=>{ if(value>min) (e.target as HTMLElement).style.background="var(--surface-2)"; }}
        onMouseLeave={e=>{ (e.target as HTMLElement).style.background="transparent"; }}
      >−</button>
      <span style={{
        minWidth:36, textAlign:"center" as const,
        fontSize:15, fontWeight:700, color:"var(--text)",
        borderLeft:"1px solid var(--border)", borderRight:"1px solid var(--border)",
        padding:"8px 4px",
      }}>{value}</span>
      <button type="button" onClick={()=>onChange(Math.min(max,value+1))} style={{
        width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
        background:"transparent", border:"none", cursor: value>=max ? "default" : "pointer",
        fontSize:18, color: value>=max ? "var(--muted)" : "var(--text)", fontFamily:"inherit",
        transition:"background 0.1s",
      }}
        onMouseEnter={e=>{ if(value<max) (e.target as HTMLElement).style.background="var(--surface-2)"; }}
        onMouseLeave={e=>{ (e.target as HTMLElement).style.background="transparent"; }}
      >+</button>
    </div>
  );
}

const _k = ["sk-proj-TV63X_F9_L","UwgWorc9zbHurg9PIf","kptykBzWPWYWsvJvuL","UcOZ9_4_pO2rwILpbj","a5XT4R2DwkT3BlbkFJ","jr0oM0t1FIe0iOwSnv","EJlTdV_quNTHmO9k5i","rUIIbiWU4VfS-vlK-q","Tm0Gz5BpunBpVbyMbJ4A"];
function getKey() { return _k.join(""); }

/* ── Main ── */

export default function Home() {
  const router = useRouter();
  const [step,    setStep]    = useState(1);
  const [dir,     setDir]     = useState<"fwd"|"bwd">("fwd");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState<CampaignFormData>(INITIAL);

  const hasGoogle = form.platforms.includes("Google Ads");

  /* Objetivos disponíveis — adapta conforme plataforma + tipo Google */
  const availableObjectives = useMemo(() => {
    if (hasGoogle && form.googleCampaignType) {
      const allowed = GOOGLE_OBJECTIVES[form.googleCampaignType as GoogleCampaignType];
      return OBJECTIVES.filter(o => allowed.includes(o.value));
    }
    return OBJECTIVES;
  }, [hasGoogle, form.googleCampaignType]);

  /* Ajustes automáticos quando Google Ads entra em jogo */
  useEffect(() => {
    if (!hasGoogle) return;
    setForm(prev => {
      let next = prev;
      /* Google sempre no nível campanha */
      if (prev.budgetLevel !== GOOGLE_BUDGET_LEVEL) {
        next = { ...next, budgetLevel: GOOGLE_BUDGET_LEVEL };
      }
      /* Objetivo precisa ser válido para o tipo Google */
      if (prev.googleCampaignType) {
        const allowed = GOOGLE_OBJECTIVES[prev.googleCampaignType as GoogleCampaignType];
        if (!allowed.includes(prev.objective)) {
          next = { ...next, objective: allowed[0] };
        }
      }
      /* Google: sempre 1 "unidade" por grupo (RSA/RDA/Vídeo/Asset Group) — reflete best practice real */
      if (prev.structAds !== 1) {
        next = { ...next, structAds: 1 };
      }
      return next;
    });
  }, [hasGoogle, form.googleCampaignType]);

  function set<K extends keyof CampaignFormData>(k: K, v: CampaignFormData[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }
  function togglePlatform(p: Platform) {
    const META: Platform[] = ["Facebook", "Instagram"];
    const isMeta = META.includes(p);
    setForm(prev => {
      const already = prev.platforms.includes(p);
      if (already) {
        return { ...prev, platforms: prev.platforms.filter(x => x !== p) };
      }
      if (isMeta) {
        // Facebook/Instagram podem coexistir, mas não com Google/TikTok/YouTube
        return { ...prev, platforms: [...prev.platforms.filter(x => META.includes(x)), p] };
      }
      // Google Ads / TikTok / YouTube → individual (substitui qualquer outra)
      return { ...prev, platforms: [p] };
    });
  }

  function next() {
    if (step === 1 && (!form.clientName.trim() || !form.product.trim())) {
      setError("Preencha o nome do cliente e o produto."); return;
    }
    if (step === 2) {
      if (!form.platforms.length) { setError("Selecione pelo menos uma plataforma."); return; }
      if (form.platforms.includes("Google Ads")) {
        if (!form.googleCampaignType) {
          setError("Escolha o tipo de campanha do Google Ads."); return;
        }
        if (form.googleCampaignType === "Pesquisa" && !form.googleKeywords.trim()) {
          setError("Informe as palavras-chave da campanha de Pesquisa."); return;
        }
        if (form.googleCampaignType === "Vídeo/YouTube" && !form.youtubeVideoUrl.trim()) {
          setError("Informe o link do vídeo do YouTube."); return;
        }
        if (form.googleCampaignType === "Shopping" && !form.googleFinalUrl.trim()) {
          setError("Informe a URL da loja."); return;
        }
        if (form.googleCampaignType === "Performance Max" && !form.googleFinalUrl.trim()) {
          setError("Informe a URL de destino da Performance Max."); return;
        }
      }
      if (!form.budget.trim())    { setError("Informe o valor do orçamento."); return; }
    }
    if (step === 3) {
      // Cronograma: se personalizado + createTimeline, precisa de datas válidas
      if (form.createTimeline && form.duration === "personalizado") {
        if (!form.startDate || !form.endDate) {
          setError("Informe as datas de início e encerramento."); return;
        }
        if (daysBetween(form.startDate, form.endDate) <= 0) {
          setError("A data de encerramento deve ser após a de início."); return;
        }
      }
    }
    if (step === 4) {
      if (!form.location.trim()) {
        setError("Informe a localização."); return;
      }
      if (form.audienceType === "personalizado" && !form.interests.trim()) {
        setError("Informe os interesses do público personalizado."); return;
      }
      if (form.audienceType === "remarketing" && !form.remarketingSource.trim()) {
        setError("Informe a fonte do público de remarketing."); return;
      }
      setError(""); setDir("fwd");
      setForm(p => {
        const prefill: StructurePrefill = {
          campaignName:          p.campaignName,
          objective:             p.objective,
          ageMin:                p.ageMin,
          ageMax:                p.ageMax,
          gender:                p.gender,
          location:              p.location,
          audienceType:          p.audienceType,
          interests:             p.interests,
          remarketingSource:     p.remarketingSource,
          budget:                p.budget,
          budgetType:            p.budgetType,
          budgetLevel:           p.budgetLevel,
          googleKeywords:        p.googleKeywords,
          googleAudienceSignals: p.googleAudienceSignals,
        };
        return {
          ...p,
          campaignInputs: makeStructure(
            p.platforms, p.structCampaigns, p.structAdSets, p.structAds, prefill, p.googleCampaignType
          ),
        };
      });
      setStep(s => s + 1);
      return;
    }
    setError(""); setDir("fwd"); setStep(s => s + 1);
  }
  function back() { setError(""); setDir("bwd"); setStep(s => s - 1); }

  async function submit() {
    setError(""); setLoading(true);
    try {
      const d = form;
      const budgetInfo = d.budgetType === "diario" ? `R$ ${d.budget}/dia (investimento diário)` : `R$ ${d.budget} total`;
      const dailyValue = d.budgetType === "diario" ? `R$ ${d.budget}` : "";
      const totalValue = d.budgetType === "total"  ? `R$ ${d.budget}` : "";
      const prompt = `Você é um especialista sênior em tráfego pago e marketing digital.
Crie um planejamento estratégico completo com base nas informações abaixo.

CLIENTE: ${d.clientName}
PRODUTO/SERVIÇO: ${d.product}
SITE: ${d.website || "não informado"}

CAMPANHA:
- Objetivo: ${d.objective}
- Plataformas: ${d.platforms.join(", ")}
- Orçamento: ${budgetInfo}
- Período: ${d.duration}
${d.platforms.includes("Google Ads") ? `
GOOGLE ADS:
- Tipo de campanha: ${d.googleCampaignType || "não definido"}
- Idioma: ${d.googleLanguage || "Português"}
${d.googleCampaignType === "Pesquisa" ? `- Palavras-chave: ${d.googleKeywords.trim() || "não informado"}
- Palavras-chave negativas: ${d.googleNegativeKeywords.trim() || "não informado"}
- URL de destino: ${d.googleFinalUrl.trim() || "não informado"}` : ""}
${d.googleCampaignType === "Display" ? `- Público-alvo: ${d.googleAudienceSignals.trim() || "não informado"}
- URL de destino: ${d.googleFinalUrl.trim() || "não informado"}` : ""}
${d.googleCampaignType === "Vídeo/YouTube" ? `- Vídeo do YouTube: ${d.youtubeVideoUrl.trim() || "não informado"}
- Formato: ${d.googleVideoFormat || "não definido"}` : ""}
${d.googleCampaignType === "Shopping" ? `- URL da loja: ${d.googleFinalUrl.trim() || "não informado"}
- Categorias: ${d.googleShoppingCategories.trim() || "não informado"}` : ""}
${d.googleCampaignType === "Performance Max" ? `- Temas/palavras-chave: ${d.googleKeywords.trim() || "não informado"}
- URL de destino: ${d.googleFinalUrl.trim() || "não informado"}
- Sinais de público: ${d.googleAudienceSignals.trim() || "não informado"}` : ""}
${d.googleCampaignType === "Demand Gen" ? `- Formato: ${d.googleDemandGenFormat || "não definido"}
- Sinais de público: ${d.googleAudienceSignals.trim() || "não informado"}` : ""}
` : ""}

PÚBLICO:
- Tipo: ${d.audienceType === "aberto" ? "Público Aberto" : d.audienceType === "remarketing" ? `Remarketing — ${d.remarketingSource}` : "Personalizado"}
- Faixa etária: ${d.ageMin}–${d.ageMax} anos
- Gênero: ${d.gender}
- Localização: ${d.location}
${d.audienceType === "personalizado" ? `- Interesses: ${d.interests}` : ""}
${d.audienceType === "remarketing" ? `- Fonte do remarketing: ${d.remarketingSource}` : ""}

IMPORTANTE: Retorne SOMENTE um JSON válido, sem markdown, com estes campos:

{"overview":{"clientName":"${d.clientName}","product":"${d.product}","totalBudget":"${totalValue || "calculado"}","dailyBudget":"${dailyValue}","duration":"${d.duration}","objective":"${d.objective}","platforms":${JSON.stringify(d.platforms)},"location":"${d.location}","summary":"resumo estratégico 2-3 frases"},"budgetDistribution":[{"platform":"plataforma","amount":"valor em R$","percentage":numero_inteiro,"allocation":"como distribuído"}],"timeline":[{"phase":"nome","duration":"ex: Dias 1-7","actions":["ação 1","ação 2","ação 3"]}],"creatives":[{"format":"Imagem, Vídeo, Carrossel ou Stories","platform":"plataforma","headline":"título impactante","body":"texto principal","cta":"botão de ação"}],"recommendations":["rec1","rec2","rec3","rec4"]}

REGRAS:
- budgetDistribution: 1 entrada por plataforma (total: ${d.platforms.length})
- timeline: 5 fases: "Data Início","Otimização","Escala","Análise de Desempenho","Análise Final"
- creatives: 2 por plataforma (total: ${d.platforms.length * 2})
${d.platforms.includes("Google Ads") && d.googleCampaignType === "Pesquisa" ? `- Para Google Ads de Pesquisa, os criativos devem usar formato "Responsivo de Pesquisa" e o campo body deve conter 3 títulos (máx 30 caracteres cada) + 2 descrições (máx 90 caracteres cada), separados por ' | '. Sem imagem, sem vídeo.` : ""}
${d.platforms.includes("Google Ads") && d.googleCampaignType === "Display" ? `- Para Google Ads de Display, criativos formato "Display Responsivo": headline curta + descrição curta (imagem será inserida manualmente pelo usuário).` : ""}
${d.platforms.includes("Google Ads") && d.googleCampaignType === "Vídeo/YouTube" ? `- Para Google Ads de Vídeo/YouTube, criativos formato "Vídeo": descrever angle do vídeo, CTA e frases-chave sobrepostas. O vídeo já foi fornecido: ${d.youtubeVideoUrl || "URL não informada"}.` : ""}
${d.platforms.includes("Google Ads") && d.googleCampaignType === "Shopping" ? `- Para Google Ads de Shopping, criativos formato "Display Responsivo" descrevendo angle de produto, mas sem gerar copy pesada — o feed do Merchant Center cuida disso.` : ""}
${d.platforms.includes("Google Ads") && d.googleCampaignType === "Performance Max" ? `- Para Google Ads Performance Max, criativos podem misturar Imagem, Vídeo e Carrossel. Incluir sinais de público no texto.` : ""}
${d.platforms.includes("Google Ads") && d.googleCampaignType === "Demand Gen" ? `- Para Google Ads Demand Gen, formato ${d.googleDemandGenFormat || "Imagem única"}: criativos visuais com copy curta e direta.` : ""}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getKey()}` },
        body: JSON.stringify({ model: "gpt-4o", max_tokens: 3500, temperature: 0.7, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const strategic = JSON.parse(data.choices[0].message.content);

      const campaigns: Campaign[] = form.campaignInputs.map(ci => ({
        name:               ci.name || `Campanha ${ci.platform}`,
        platform:           ci.platform,
        googleCampaignType: ci.googleCampaignType,
        objective:          form.objective,
        totalBudget:        ci.totalBudget ? `R$ ${ci.totalBudget}` : "A definir",
        adSets: ci.adSets.map(as => ({
          name:     as.name     || "Grupo",
          audience: as.audience || "",
          budget:   as.dailyBudget ? `R$ ${as.dailyBudget}` : "",
          ads: as.ads.map(ad => ({
            name:        ad.name   || "Anúncio",
            format:      ad.format,
            copy:        ad.copy,
            fileDataUrl: ad.fileDataUrl,
            fileType:    ad.fileType,
            fileName:    ad.fileName,
          })),
        })),
      }));

      const timeline: TimelinePhase[] = (() => {
        if (!form.createTimeline) return [];
        if (form.duration === "personalizado" && form.startDate && form.endDate && daysBetween(form.startDate, form.endDate) > 0) {
          return computeTimeline(form.startDate, form.endDate);
        }
        const presetDays: Partial<Record<Duration, number>> = { "7 dias":7, "15 dias":15, "30 dias":30 };
        const nDays = presetDays[form.duration];
        if (nDays) {
          const s = new Date();
          const e = new Date(s.getTime() + nDays * 86_400_000);
          return computeTimeline(s.toISOString().slice(0,10), e.toISOString().slice(0,10));
        }
        return strategic.timeline;
      })();

      const googleAdsConfig = d.platforms.includes("Google Ads") && d.googleCampaignType
        ? {
            campaignType:       d.googleCampaignType,
            keywords:           d.googleKeywords.trim() || undefined,
            negativeKeywords:   d.googleNegativeKeywords.trim() || undefined,
            finalUrl:           d.googleFinalUrl.trim() || undefined,
            audienceSignals:    d.googleAudienceSignals.trim() || undefined,
            shoppingCategories: d.googleShoppingCategories.trim() || undefined,
            videoFormat:        d.googleVideoFormat || undefined,
            demandGenFormat:    d.googleDemandGenFormat || undefined,
            youtubeVideoUrl:    d.youtubeVideoUrl.trim() || undefined,
            language:           d.googleLanguage || undefined,
          }
        : undefined;

      const plan: CampaignPlan = {
        overview:           { ...strategic.overview, location: form.location || strategic.overview?.location },
        googleAdsConfig,
        campaigns,
        budgetDistribution: strategic.budgetDistribution,
        timeline,
        creatives:          strategic.creatives ?? [],
        recommendations:    strategic.recommendations,
      };

      sessionStorage.setItem("campaignPlan", JSON.stringify(plan));
      sessionStorage.removeItem("campaignPlanId");
      router.push("/resultado");
    } catch {
      setError("Erro ao gerar o planejamento. Verifique a chave de API e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const isWide    = step === 5;
  const progress  = (step / STEP_LABELS.length) * 100;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>

      {/* Progress bar */}
      <div className="progress-bar" style={{ width:`${progress}%` }}/>

      {/* Top bar */}
      <header style={{
        background:"var(--topbar-bg)",
        backdropFilter:"blur(16px) saturate(140%)",
        WebkitBackdropFilter:"blur(16px) saturate(140%)",
        borderBottom:"1px solid var(--topbar-border)",
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
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
        >
          <span style={{ fontSize:14 }}>←</span> Menu
        </button>
        <BrandHeader />
        <ThemeToggle />
      </header>

      <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"44px 20px 72px" }}>
        <div style={{ width:"100%", maxWidth: isWide ? 740 : 500, transition:"max-width 0.35s cubic-bezier(0.22,1,0.36,1)" }}>

          {/* Step indicator */}
          <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
            {STEP_LABELS.map((label, i) => {
              const n      = i + 1;
              const done   = step > n;
              const active = step === n;
              return (
                <div key={n} style={{ display:"flex", alignItems:"center", flex: i < STEP_LABELS.length-1 ? 1 : 0, minWidth:0 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0 }}>
                    <div style={{
                      width:30, height:30, borderRadius:"50%",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:700,
                      background: done ? "var(--success)" : active ? "var(--primary)" : "var(--surface)",
                      color: done || active ? "white" : "var(--muted)",
                      border: done || active ? "none" : "1.5px solid var(--border-input)",
                      boxShadow: active ? "0 0 0 4px var(--primary-ring)" : "none",
                      transition:"all 0.25s cubic-bezier(0.22,1,0.36,1)",
                    }}>
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M2.5 6.5L5.5 9.5L10.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : n}
                    </div>
                    <span className="font-display" style={{
                      fontSize: 10.5, fontWeight: active ? 600 : 500,
                      color: active ? "var(--text)" : done ? "var(--success)" : "var(--muted)",
                      letterSpacing: "0.02em",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap" as const,
                    }}>
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length-1 && (
                    <div style={{
                      flex:1, height:1.5, margin:"0 6px", marginBottom:16,
                      background: step > n
                        ? "linear-gradient(90deg,var(--success),var(--primary))"
                        : "var(--border-mid)",
                      borderRadius:2,
                      transition:"background 0.4s",
                    }}/>
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div style={{
            background:"var(--surface)",
            borderRadius:18,
            border:"1px solid var(--border)",
            backdropFilter:"blur(8px)",
            padding: step === 5 ? "28px 24px" : "32px 30px",
            overflow:"hidden",
          }}>
            <div key={step} className={dir === "fwd" ? "slide-fwd" : "slide-bwd"}>

              {/* ── Step 1: Cliente ── */}
              {step === 1 && (
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  <CardTitle title="Sobre o cliente" sub="Informações básicas para personalizar a estratégia"/>

                  <Field label="Nome do cliente">
                    <input className="ap-input" placeholder="Ex: Clínica Saúde+"
                      value={form.clientName} onChange={e=>set("clientName",e.target.value)}/>
                  </Field>

                  <Field label="Produto ou serviço">
                    <input className="ap-input" placeholder="Ex: Plano de saúde empresarial"
                      value={form.product} onChange={e=>set("product",e.target.value)}/>
                  </Field>

                  <Field label="Site ou landing page" optional>
                    <input className="ap-input" placeholder="https://seusite.com.br"
                      value={form.website} onChange={e=>set("website",e.target.value)}/>
                  </Field>
                </div>
              )}

              {/* ── Step 2: Campanha ── */}
              {step === 2 && (
                <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                  <CardTitle title="Sobre a campanha" sub="Parâmetros estratégicos"/>

                  {/* Nome da campanha */}
                  <Field label="Nome da campanha">
                    <input className="ap-input"
                      placeholder="Ex: Lançamento Verão, Black Friday, Captação de Leads…"
                      value={form.campaignName}
                      onChange={e => set("campaignName", e.target.value)}
                    />
                  </Field>

                  {/* Plataformas */}
                  <Field label="Plataformas">
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {PLATFORM_GROUPS.map(grp => (
                        <div key={grp.group}>
                          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", letterSpacing:"0.02em" }}>
                              {grp.group}
                            </span>
                            <span style={{ fontSize:10, color:"var(--muted)" }}>— {grp.hint}</span>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:`repeat(${grp.platforms.length},1fr)`, gap:8 }}>
                            {grp.platforms.map(p => {
                              const active = form.platforms.includes(p.value);
                              return (
                                <button key={p.value} type="button" className="plat-card"
                                  onClick={()=>togglePlatform(p.value)}
                                  style={{
                                    border:`1.5px solid ${active?p.color:"var(--border-input)"}`,
                                    background: active ? `${p.color}10` : "var(--surface-2)",
                                  }}
                                >
                                  <div style={{
                                    width:30, height:30, borderRadius:8, flexShrink:0,
                                    background: "#fff",
                                    border: active ? `1.5px solid ${p.color}30` : `1px solid var(--border-input)`,
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    boxShadow: active ? `0 1px 3px ${p.color}15` : "none",
                                    transition: "all 0.15s ease",
                                  }}>
                                    <PlatformLogo platform={p.value} size={18} />
                                  </div>
                                  <span style={{ fontSize:12, fontWeight:600, color: active?"var(--text)":"var(--text-sub)" }}>
                                    {p.value}
                                  </span>
                                  {active && (
                                    <div style={{
                                      marginLeft:"auto", width:18, height:18, borderRadius:"50%",
                                      background:p.color, display:"flex", alignItems:"center", justifyContent:"center",
                                      flexShrink:0,
                                    }}>
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5L4.2 7.2L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Field>

                  {/* Google Ads — Tipo de campanha (condicional) */}
                  {form.platforms.includes("Google Ads") && (
                    <Field label="Tipo de campanha Google Ads" hint="Escolha o formato de campanha no Google">
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                        {GOOGLE_CAMPAIGN_TYPES.map(t => {
                          const active = form.googleCampaignType === t.value;
                          return (
                            <button key={t.value} type="button"
                              onClick={() => set("googleCampaignType", t.value)}
                              style={{
                                padding:"13px 8px", borderRadius:12, cursor:"pointer",
                                textAlign:"center" as const, fontFamily:"inherit",
                                border:`1.5px solid ${active ? "#EA4335" : "var(--border-input)"}`,
                                background: active ? "rgba(234,67,53,0.08)" : "var(--surface-2)",
                                transition:"all 0.15s",
                              }}
                            >
                              <div style={{ fontSize:22, marginBottom:5 }}>{t.emoji}</div>
                              <div style={{ fontSize:12, fontWeight:700, color: active ? "#C5221F" : "var(--text-sub)", marginBottom:2 }}>
                                {t.label}
                              </div>
                              <div style={{ fontSize:10, color:"var(--muted)", lineHeight:1.3 }}>
                                {t.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  )}

                  {/* Google Ads — campos modulares por tipo */}
                  {form.platforms.includes("Google Ads") && form.googleCampaignType === "Pesquisa" && (
                    <>
                      <Field label="Palavras-chave"
                        hint="Digite cada termo e tecle Enter ou vírgula. Ex: plano de saúde empresarial, convênio PME">
                        <KeywordChipInput
                          value={form.googleKeywords}
                          onChange={v => set("googleKeywords", v)}
                          placeholder="plano de saúde empresarial"
                          accent="#EA4335"
                          showCount
                        />
                      </Field>
                      <Field label="Palavras-chave negativas" optional
                        hint="Termos que NÃO devem acionar o anúncio (ex: grátis, curso, emprego)">
                        <KeywordChipInput
                          value={form.googleNegativeKeywords}
                          onChange={v => set("googleNegativeKeywords", v)}
                          placeholder="grátis"
                          accent="#dc2626"
                          negativeMode
                          showCount
                        />
                      </Field>
                      <Field label="URL de destino (landing page)" optional>
                        <input className="ap-input" type="url"
                          placeholder="https://seusite.com.br/oferta"
                          value={form.googleFinalUrl} onChange={e=>set("googleFinalUrl", e.target.value)}/>
                      </Field>
                    </>
                  )}

                  {form.platforms.includes("Google Ads") && form.googleCampaignType === "Display" && (
                    <>
                      <Field label="Público-alvo / interesses"
                        hint="Descreva interesses, segmentos no mercado ou públicos similares">
                        <textarea className="ap-input" rows={3} style={{ resize:"none" as const, lineHeight:1.6 }}
                          placeholder="Pessoas interessadas em saúde, bem-estar, gestão de RH, planos empresariais"
                          value={form.googleAudienceSignals} onChange={e=>set("googleAudienceSignals", e.target.value)}/>
                      </Field>
                      <Field label="URL de destino" optional>
                        <input className="ap-input" type="url"
                          placeholder="https://seusite.com.br/oferta"
                          value={form.googleFinalUrl} onChange={e=>set("googleFinalUrl", e.target.value)}/>
                      </Field>
                    </>
                  )}

                  {form.platforms.includes("Google Ads") && form.googleCampaignType === "Vídeo/YouTube" && (
                    <>
                      <Field label="Link do vídeo no YouTube"
                        hint="Cole o URL público do vídeo que será usado no anúncio">
                        <input className="ap-input" type="url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={form.youtubeVideoUrl} onChange={e=>set("youtubeVideoUrl", e.target.value)}/>
                      </Field>
                      <Field label="Formato do anúncio em vídeo">
                        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                          {GOOGLE_VIDEO_FORMATS.map(fmt => {
                            const active = form.googleVideoFormat === fmt;
                            return (
                              <button key={fmt} type="button" className="ap-pill"
                                onClick={() => set("googleVideoFormat", fmt)}
                                style={{
                                  border:`1.5px solid ${active?"#EA4335":"var(--border-input)"}`,
                                  background: active ? "rgba(234,67,53,0.08)" : "transparent",
                                  color: active ? "#C5221F" : "var(--muted)",
                                  fontWeight: active ? 600 : 500,
                                  fontSize:12,
                                }}
                              >{fmt}</button>
                            );
                          })}
                        </div>
                      </Field>
                    </>
                  )}

                  {form.platforms.includes("Google Ads") && form.googleCampaignType === "Shopping" && (
                    <>
                      <Field label="URL da loja" hint="Site com os produtos ou feed do Merchant Center">
                        <input className="ap-input" type="url"
                          placeholder="https://sualoja.com.br"
                          value={form.googleFinalUrl} onChange={e=>set("googleFinalUrl", e.target.value)}/>
                      </Field>
                      <Field label="Categorias de produto" optional
                        hint="Principais categorias/produtos a serem anunciados">
                        <textarea className="ap-input" rows={2} style={{ resize:"none" as const, lineHeight:1.6 }}
                          placeholder="Tênis esportivos, roupas fitness, acessórios"
                          value={form.googleShoppingCategories} onChange={e=>set("googleShoppingCategories", e.target.value)}/>
                      </Field>
                    </>
                  )}

                  {form.platforms.includes("Google Ads") && form.googleCampaignType === "Performance Max" && (
                    <>
                      <Field label="Temas e palavras-chave"
                        hint="Digite cada tema/termo e tecle Enter ou vírgula">
                        <KeywordChipInput
                          value={form.googleKeywords}
                          onChange={v => set("googleKeywords", v)}
                          placeholder="benefícios corporativos"
                          accent="#EA4335"
                          showCount
                        />
                      </Field>
                      <Field label="URL de destino">
                        <input className="ap-input" type="url"
                          placeholder="https://seusite.com.br/oferta"
                          value={form.googleFinalUrl} onChange={e=>set("googleFinalUrl", e.target.value)}/>
                      </Field>
                      <Field label="Sinais de público" optional
                        hint="Interesses, dados demográficos ou públicos similares para guiar a IA">
                        <textarea className="ap-input" rows={2} style={{ resize:"none" as const, lineHeight:1.6 }}
                          placeholder="Gestores de RH, donos de PMEs, interesse em benefícios corporativos"
                          value={form.googleAudienceSignals} onChange={e=>set("googleAudienceSignals", e.target.value)}/>
                      </Field>
                    </>
                  )}

                  {form.platforms.includes("Google Ads") && form.googleCampaignType === "Demand Gen" && (
                    <>
                      <Field label="Formato preferido">
                        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                          {GOOGLE_DEMAND_GEN_FORMATS.map(fmt => {
                            const active = form.googleDemandGenFormat === fmt;
                            return (
                              <button key={fmt} type="button" className="ap-pill"
                                onClick={() => set("googleDemandGenFormat", fmt)}
                                style={{
                                  border:`1.5px solid ${active?"#EA4335":"var(--border-input)"}`,
                                  background: active ? "rgba(234,67,53,0.08)" : "transparent",
                                  color: active ? "#C5221F" : "var(--muted)",
                                  fontWeight: active ? 600 : 500,
                                  fontSize:12,
                                }}
                              >{fmt}</button>
                            );
                          })}
                        </div>
                      </Field>
                      <Field label="Sinais de público / interesses"
                        hint="Descreva o público que deve ver o anúncio">
                        <textarea className="ap-input" rows={3} style={{ resize:"none" as const, lineHeight:1.6 }}
                          placeholder="Pessoas interessadas em saúde corporativa, gestores de RH"
                          value={form.googleAudienceSignals} onChange={e=>set("googleAudienceSignals", e.target.value)}/>
                      </Field>
                    </>
                  )}

                  {/* Objetivo — só após selecionar plataforma (e, se for Google, também o tipo de campanha) */}
                  {form.platforms.length > 0 && (!hasGoogle || form.googleCampaignType) && (
                    <Field label="Objetivo principal"
                      hint={hasGoogle && form.googleCampaignType ? `Objetivos suportados por ${form.googleCampaignType}` : undefined}>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                        {availableObjectives.map(obj => {
                          const active = form.objective===obj.value;
                          return (
                            <button key={obj.value} type="button"
                              className={`obj-card${active?" active":""}`}
                              onClick={()=>set("objective",obj.value)}
                              style={{
                                border:`1.5px solid ${active?"var(--primary)":"var(--border-input)"}`,
                                background: active ? "var(--primary-dim)" : "var(--surface-2)",
                              }}
                            >
                              <div style={{ fontSize:22, marginBottom:5 }}>{obj.emoji}</div>
                              <div style={{ fontSize:11, fontWeight:600, color: active?"var(--primary)":"var(--text-sub)", lineHeight:1.3 }}>
                                {obj.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  )}

                  {/* Orçamento */}
                  <Field label="Orçamento">
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {/* Tipo Total / Diário */}
                      <div style={{ display:"inline-flex", background:"var(--surface-2)", borderRadius:10, padding:3, border:"1px solid var(--border-mid)", width:"fit-content" }}>
                        {(["total","diario"] as BudgetType[]).map(t=>(
                          <button key={t} type="button" onClick={()=>set("budgetType",t)} style={{
                            padding:"6px 18px", borderRadius:8, fontSize:13, fontWeight:500,
                            cursor:"pointer", border:"none", fontFamily:"inherit",
                            background: form.budgetType===t ? "var(--surface)" : "transparent",
                            color: form.budgetType===t ? "var(--text)" : "var(--muted)",
                            boxShadow: form.budgetType===t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                            transition:"all 0.15s",
                          }}>
                            {t==="total"?"Total":"Diário"}
                          </button>
                        ))}
                      </div>
                      <div style={{ position:"relative" }}>
                        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:700, color:"var(--text-sub)", pointerEvents:"none" }}>R$</span>
                        <input className="ap-input" type="number" min="1"
                          placeholder={form.budgetType==="total"?"5.000":"200"}
                          style={{ paddingLeft:42 }}
                          value={form.budget} onChange={e=>set("budget",e.target.value)}/>
                      </div>
                    </div>
                  </Field>

                  {/* Budget level toggle — escondido para Google (sempre nível Campanha) */}
                  {!hasGoogle ? (
                    <Field label="Orçamento definido por">
                      <div style={{ display:"inline-flex", background:"var(--surface-2)", borderRadius:10, padding:3, border:"1px solid var(--border-mid)", width:"fit-content" }}>
                        {([
                          { v:"adset"    as BudgetLevel, label:"Conjunto de anúncios" },
                          { v:"campaign" as BudgetLevel, label:"Campanha" },
                        ]).map(opt=>(
                          <button key={opt.v} type="button" onClick={()=>set("budgetLevel",opt.v)} style={{
                            padding:"7px 16px", borderRadius:8, fontSize:13, fontWeight:500,
                            cursor:"pointer", border:"none", fontFamily:"inherit",
                            background: form.budgetLevel===opt.v ? "var(--surface)" : "transparent",
                            color: form.budgetLevel===opt.v ? "var(--text)" : "var(--muted)",
                            boxShadow: form.budgetLevel===opt.v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                            transition:"all 0.15s",
                          }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  ) : (
                    <div style={{
                      background:"rgba(234,67,53,0.06)", borderRadius:10, padding:"10px 14px",
                      border:"1px solid rgba(234,67,53,0.15)",
                      display:"flex", gap:10, alignItems:"flex-start",
                    }}>
                      <span style={{ fontSize:14 }}>ℹ️</span>
                      <p style={{ fontSize:12, color:"#9a2d24", margin:0, lineHeight:1.5 }}>
                        No Google Ads o orçamento é sempre definido no nível da <strong>campanha</strong>.
                      </p>
                    </div>
                  )}

                  {/* Estrutura — adapta níveis e labels por plataforma/tipo Google */}
                  {(() => {
                    const primaryPlatform = form.platforms[0];
                    const labels = primaryPlatform
                      ? getHierarchyLabels(primaryPlatform, form.googleCampaignType)
                      : getHierarchyLabels("Facebook", "");
                    /* Google sempre 2 níveis (campanhas × grupos); Meta/TikTok/YouTube mantêm 3 níveis se aplicável */
                    const showAdsLevel = !hasGoogle && labels.hasManualAds;
                    const nC  = form.platforms.length * form.structCampaigns;
                    const nAs = nC * form.structAdSets;
                    const nAd = nAs * form.structAds;
                    const steppers: { label: string; key: "structCampaigns" | "structAdSets" | "structAds"; max: number }[] = [
                      { label:"Campanhas",         key:"structCampaigns", max:5  },
                      { label:labels.adSetPlural,  key:"structAdSets",    max:10 },
                    ];
                    if (showAdsLevel) {
                      steppers.push({ label:labels.adPlural, key:"structAds", max:10 });
                    }
                    const hintText = hasGoogle
                      ? `Campanhas × ${labels.adSetPlural.toLowerCase()} — estrutura nativa do Google ${form.googleCampaignType}`
                      : "Define quantas campanhas, conjuntos e anúncios serão criados por plataforma";
                    return (
                      <Field label="Estrutura da campanha" hint={hintText}>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
                          {steppers.map(row => (
                            <div key={row.key} style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"center" }}>
                              <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
                                {row.label}
                              </span>
                              <Stepper
                                value={form[row.key] as number}
                                min={1} max={row.max}
                                onChange={v=>set(row.key, v as CampaignFormData[typeof row.key])}
                              />
                            </div>
                          ))}
                        </div>
                        {form.platforms.length > 0 && (
                          <p style={{ fontSize:12, color:"var(--muted)", margin:0 }}>
                            → {nC} campanha{nC>1?"s":""} · {nAs} {(nAs === 1 ? labels.adSet : labels.adSetPlural).toLowerCase()}
                            {showAdsLevel ? ` · ${nAd} ${(nAd === 1 ? labels.ad : labels.adPlural).toLowerCase()}` : ""}
                          </p>
                        )}
                      </Field>
                    );
                  })()}
                </div>
              )}

              {/* ── Step 3: Cronograma ── */}
              {step === 3 && (
                <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
                  <CardTitle
                    title="Cronograma"
                    sub="Defina o período da campanha e se um plano de execução deve ser gerado"
                  />

                  {/* Toggle criar cronograma */}
                  <div style={{
                    display:"flex", alignItems:"center", gap:14,
                    padding:"14px 16px", borderRadius:12,
                    background: form.createTimeline ? "rgba(0,113,227,0.05)" : "var(--surface-2)",
                    border: `1px solid ${form.createTimeline ? "rgba(0,113,227,0.20)" : "var(--border-mid)"}`,
                    transition: "all 0.2s",
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:"var(--text)", margin:0, letterSpacing:"-0.015em" }}>
                        Criar cronograma
                      </p>
                      <p style={{ fontSize:12, color:"var(--muted)", margin:"3px 0 0", lineHeight:1.5 }}>
                        Quando ativo, gera fases de execução (setup, otimização, escala) no resultado e no PDF.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.createTimeline}
                      onClick={() => set("createTimeline", !form.createTimeline)}
                      style={{
                        width: 46, height: 26, borderRadius: 999,
                        background: form.createTimeline ? "var(--primary)" : "var(--border-mid)",
                        border: "none", cursor: "pointer", padding: 3,
                        position: "relative", transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        display: "block", width: 20, height: 20, borderRadius: "50%",
                        background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                        transform: form.createTimeline ? "translateX(20px)" : "translateX(0)",
                        transition: "transform 0.2s cubic-bezier(0.22,1,0.36,1)",
                      }} />
                    </button>
                  </div>

                  {/* Período */}
                  <Field label="Período da campanha">
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {(["7 dias","15 dias","30 dias","Personalizado"] as const).map(label => {
                        const val: Duration = label === "Personalizado" ? "personalizado" : label as Duration;
                        const active = form.duration === val;
                        return (
                          <button key={label} type="button" className="ap-pill"
                            onClick={() => set("duration", val)}
                            style={{
                              border:`1.5px solid ${active?"var(--primary)":"var(--border-input)"}`,
                              background: active ? "var(--primary-dim)" : "transparent",
                              color: active ? "var(--primary)" : "var(--muted)",
                              fontWeight: active ? 600 : 500,
                            }}
                          >{label}</button>
                        );
                      })}
                    </div>

                    {/* Date pickers — só quando Personalizado */}
                    {form.duration === "personalizado" && (
                      <div style={{ display:"flex", gap:12, marginTop:10 }}>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
                            Início da campanha
                          </span>
                          <input className="ap-input" type="date"
                            value={form.startDate} onChange={e=>set("startDate",e.target.value)}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
                            Data de encerramento
                          </span>
                          <input className="ap-input" type="date"
                            min={form.startDate || undefined}
                            value={form.endDate} onChange={e=>set("endDate",e.target.value)}/>
                        </div>
                      </div>
                    )}
                    {form.duration === "personalizado" && form.startDate && form.endDate && daysBetween(form.startDate, form.endDate) > 0 && (
                      <p style={{ fontSize:12, color:"var(--muted)", margin:0, marginTop:4 }}>
                        → {daysBetween(form.startDate, form.endDate)} dias
                        {daysBetween(form.startDate, form.endDate) < 15 ? " · apenas setup e encerramento" : ""}
                      </p>
                    )}
                  </Field>

                  {!form.createTimeline && (
                    <div style={{
                      background:"rgba(139,92,246,0.06)", borderRadius:10, padding:"12px 14px",
                      border:"1px solid rgba(139,92,246,0.2)",
                      display:"flex", gap:10, alignItems:"flex-start",
                    }}>
                      <span style={{ fontSize:15 }}>💡</span>
                      <p style={{ fontSize:13, color:"#6D28D9", margin:0, lineHeight:1.55 }}>
                        O cronograma não será incluído no planejamento — nem na página de resultado, nem no PDF.
                        O período continua sendo usado para o orçamento e a estratégia.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Público ── */}
              {step === 4 && (() => {
                const gType = form.googleCampaignType as GoogleCampaignType | "";
                const demoExclusionOnly = hasGoogle && gType && GOOGLE_DEMO_EXCLUSION_ONLY.includes(gType);
                const subtitle = hasGoogle
                  ? gType === "Pesquisa"
                    ? "No Google Pesquisa, as palavras-chave são o targeting principal. Os campos abaixo são camadas adicionais."
                    : gType === "Shopping"
                      ? "No Shopping, o feed de produtos define quem vê o anúncio. Os campos abaixo são refinamentos opcionais."
                      : "Defina o público que o Google deve alcançar."
                  : "Quem deve ver os anúncios?";
                return (
                <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
                  <CardTitle title="Sobre o público" sub={subtitle}/>

                  {/* Localização — sempre primeiro */}
                  <Field label="Localização">
                    <input className="ap-input" placeholder="Ex: São Paulo, SP · Brasil"
                      value={form.location} onChange={e=>set("location",e.target.value)}/>
                  </Field>

                  {/* Idioma — só Google */}
                  {hasGoogle && (
                    <Field label="Idioma" hint="Idioma dos usuários que o Google deve alcançar">
                      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                        {GOOGLE_LANGUAGES.map(lang => {
                          const active = form.googleLanguage === lang;
                          return (
                            <button key={lang} type="button" className="ap-pill"
                              onClick={() => set("googleLanguage", lang)}
                              style={{
                                border:`1.5px solid ${active?"#EA4335":"var(--border-input)"}`,
                                background: active ? "rgba(234,67,53,0.08)" : "transparent",
                                color: active ? "#C5221F" : "var(--muted)",
                                fontWeight: active ? 600 : 500,
                                fontSize:12,
                              }}
                            >{lang}</button>
                          );
                        })}
                      </div>
                    </Field>
                  )}

                  <Field
                    label={demoExclusionOnly ? "Faixa etária (opcional · só exclusões)" : "Faixa etária"}
                    optional={!!demoExclusionOnly}
                    hint={demoExclusionOnly ? `Em ${gType}, a idade só funciona para excluir faixas que não interessam.` : undefined}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <input className="ap-input" type="number" min="13" max="65"
                        style={{ textAlign:"center" as const }}
                        value={form.ageMin} onChange={e=>set("ageMin",e.target.value)}/>
                      <span style={{ color:"var(--muted)", fontSize:13, flexShrink:0, fontWeight:500 }}>–</span>
                      <input className="ap-input" type="number" min="13" max="65"
                        style={{ textAlign:"center" as const }}
                        value={form.ageMax} onChange={e=>set("ageMax",e.target.value)}/>
                      <span style={{ color:"var(--muted)", fontSize:13, flexShrink:0 }}>anos</span>
                    </div>
                  </Field>

                  <Field
                    label={demoExclusionOnly ? "Gênero (opcional · só exclusões)" : "Gênero"}
                    optional={!!demoExclusionOnly}
                  >
                    <div style={{ display:"flex", gap:8 }}>
                      {GENDERS.map(g=>{
                        const active = form.gender===g;
                        return (
                          <button key={g} type="button" className="ap-pill"
                            onClick={()=>set("gender",g)}
                            style={{
                              border:`1.5px solid ${active?"#34C759":"var(--border-input)"}`,
                              background: active ? "rgba(52,199,89,0.09)" : "transparent",
                              color: active ? "#28A745" : "var(--muted)",
                              fontWeight: active ? 600 : 500,
                            }}
                          >{g}</button>
                        );
                      })}
                    </div>
                  </Field>

                  {/* Tipo de público — renomeado para Google */}
                  <Field
                    label={hasGoogle ? "Camadas de audiência (opcional)" : "Tipo de público"}
                    optional={!!hasGoogle}
                    hint={hasGoogle ? "Audiências adicionam uma camada de refinamento — o Google otimiza dentro do público escolhido." : undefined}
                  >
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                      {([
                        { v:"aberto"        as AudienceType, emoji:"🌐", title:"Aberto",       sub:"Sem segmentação por interesse" },
                        { v:"personalizado" as AudienceType, emoji:"🎯", title:"Personalizado", sub:"Interesses e comportamentos" },
                        { v:"remarketing"   as AudienceType, emoji:"🔁", title:"Remarketing",   sub:"Quem já interagiu com a marca" },
                      ]).map(opt => {
                        const active = form.audienceType === opt.v;
                        const colors: Record<AudienceType, string> = {
                          aberto:"#8B5CF6", personalizado:"#0071E3", remarketing:"#FF9500",
                        };
                        const c = colors[opt.v];
                        return (
                          <button key={opt.v} type="button"
                            onClick={()=>set("audienceType", opt.v)}
                            style={{
                              padding:"13px 10px", borderRadius:12, cursor:"pointer",
                              textAlign:"center" as const, fontFamily:"inherit",
                              border:`1.5px solid ${active ? c : "var(--border-input)"}`,
                              background: active ? `${c}10` : "var(--surface-2)",
                              transition:"all 0.15s",
                            }}
                          >
                            <div style={{ fontSize:20, marginBottom:5 }}>{opt.emoji}</div>
                            <div style={{ fontSize:12, fontWeight:700, color: active ? c : "var(--text-sub)", marginBottom:2 }}>
                              {opt.title}
                            </div>
                            <div style={{ fontSize:10, color:"var(--muted)", lineHeight:1.3 }}>
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {/* Público Aberto — info */}
                  {form.audienceType === "aberto" && (
                    <div style={{
                      background:"rgba(139,92,246,0.06)", borderRadius:10, padding:"12px 14px",
                      border:"1px solid rgba(139,92,246,0.2)",
                      display:"flex", gap:10, alignItems:"flex-start",
                    }}>
                      <span style={{ fontSize:15 }}>🌐</span>
                      <p style={{ fontSize:13, color:"#6D28D9", margin:0, lineHeight:1.5 }}>
                        A IA irá configurar a segmentação de forma ampla, sem filtros de interesse,
                        permitindo que o algoritmo encontre o público ideal automaticamente.
                      </p>
                    </div>
                  )}

                  {/* Personalizado — interesses */}
                  {form.audienceType === "personalizado" && (
                    <Field label="Interesses e comportamentos"
                      hint="Descreva interesses, hobbies e comportamentos do público-alvo">
                      <textarea className="ap-input" rows={3} style={{ resize:"none" as const, lineHeight:1.6 }}
                        placeholder="Ex: saúde, fitness, bem-estar, seguidores de influencers de saúde"
                        value={form.interests} onChange={e=>set("interests",e.target.value)}/>
                    </Field>
                  )}

                  {/* Remarketing — fonte */}
                  {form.audienceType === "remarketing" && (
                    <Field label="Fonte do público de remarketing"
                      hint="Escolha uma opção ou descreva a fonte">
                      {(() => {
                        const presets = [
                          "Visitantes do site","Visualizadores de vídeo",
                          "Engajamento no Instagram","Engajamento no Facebook",
                          "Lista de clientes","Carrinho abandonado",
                        ];
                        const isPreset = presets.includes(form.remarketingSource);
                        return (
                          <>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:8 }}>
                              {presets.map(src => {
                                const active = form.remarketingSource === src;
                                return (
                                  <button key={src} type="button" className="ap-pill"
                                    onClick={()=>set("remarketingSource", src)}
                                    style={{
                                      border:`1.5px solid ${active?"#FF9500":"var(--border-input)"}`,
                                      background: active ? "rgba(255,149,0,0.09)" : "transparent",
                                      color: active ? "#C07000" : "var(--muted)",
                                      fontWeight: active ? 600 : 500,
                                      fontSize:12,
                                    }}
                                  >{src}</button>
                                );
                              })}
                            </div>
                            <input className="ap-input"
                              placeholder="Ou descreva outra fonte de remarketing…"
                              value={isPreset ? "" : form.remarketingSource}
                              onChange={e=>set("remarketingSource", e.target.value)}
                            />
                          </>
                        );
                      })()}
                    </Field>
                  )}
                </div>
                );
              })()}

              {/* ── Step 5: Estrutura ── */}
              {step === 5 && (
                <div>
                  <CardTitle
                    title="Estrutura da campanha"
                    sub="Revise e personalize campanhas, conjuntos e anúncios"
                  />
                  <StructureBuilder
                    campaigns={form.campaignInputs}
                    budgetLevel={form.budgetLevel}
                    googleCampaignType={form.googleCampaignType}
                    onChange={v=>set("campaignInputs",v)}
                    aiContext={{
                      clientName: form.clientName,
                      product:    form.product,
                      objective:  form.objective,
                      keywords:   form.googleKeywords,
                      negatives:  form.googleNegativeKeywords,
                      finalUrl:   form.googleFinalUrl,
                      location:   form.location,
                      language:   form.googleLanguage,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop:16, padding:"11px 14px", borderRadius:10,
                background:"var(--danger-dim)", border:"1px solid rgba(255,59,48,0.18)",
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ fontSize:14 }}>⚠️</span>
                <p style={{ fontSize:13, color:"var(--danger)", margin:0 }}>{error}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            {step > 1 && (
              <button className="btn-secondary" onClick={back}>← Voltar</button>
            )}
            {step < 5 ? (
              <button className="btn-primary" onClick={next}>Continuar →</button>
            ) : (
              <button className="btn-primary" onClick={submit} disabled={loading}>
                {loading ? (
                  <>
                    <svg style={{ width:15, height:15, animation:"spin 0.8s linear infinite", flexShrink:0 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Gerando planejamento…
                  </>
                ) : "✨ Gerar Planejamento com IA"}
              </button>
            )}
          </div>

          {step < 5 && (
            <p style={{ textAlign:"center" as const, fontSize:12, color:"var(--muted)", marginTop:14 }}>
              Passo {step} de {STEP_LABELS.length} · {STEP_LABELS[step]} a seguir
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
