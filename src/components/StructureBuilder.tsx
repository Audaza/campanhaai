"use client";

import { useState, useRef, useEffect } from "react";
import type { AdFormat, AdInput, AdSetInput, CampaignInput, BudgetLevel, LinkPreviewData, Platform, GoogleCampaignType } from "@/types/campaign";
import { getHierarchyLabels } from "@/lib/hierarchy";
import GoogleCampaignCard from "@/components/GoogleCampaignCard";
import KeywordChipInput from "@/components/KeywordChipInput";
import ResponsiveSearchAdBuilder from "@/components/ResponsiveSearchAdBuilder";
import type { RSAContext } from "@/lib/openaiClient";

/* Google Ads — tipos sem upload manual de mídia */
const GOOGLE_TEXT_ONLY_TYPES: GoogleCampaignType[] = ["Pesquisa", "Shopping", "Vídeo/YouTube"];

/* Formatos de anúncio por tipo de campanha Google */
function googleFormatsFor(type?: GoogleCampaignType | ""): AdFormat[] {
  switch (type) {
    case "Pesquisa":        return ["Responsivo de Pesquisa"];
    case "Display":         return ["Display Responsivo"];
    case "Vídeo/YouTube":   return ["Vídeo"];
    case "Shopping":        return ["Display Responsivo"];
    case "Performance Max": return ["Imagem","Vídeo","Carrossel","Display Responsivo"];
    case "Demand Gen":      return ["Imagem","Vídeo","Carrossel"];
    default:                return ["Responsivo de Pesquisa","Display Responsivo","Vídeo"];
  }
}

/* Label do copy por tipo Google (mantido aqui — específico do AdCard) */
function googleCopyLabel(type?: GoogleCampaignType | ""): string {
  if (type === "Pesquisa") return "Títulos e descrições";
  if (type === "Shopping") return "Observações do produto";
  if (type === "Performance Max") return "Títulos, descrições e CTAs do grupo de recursos";
  if (type === "Vídeo/YouTube") return "Título + CTA do vídeo";
  return "Copy do anúncio";
}

/* ── Platform-specific config ─────────────────────────────────────────────── */
interface PlatformCfg {
  adGroupLabel:  string;
  audienceLabel: string;
  audiencePH:    string;
  formats:       AdFormat[];
  defaultFormat: AdFormat;
  color:         string;
}

const PLATFORM_CONFIG: Record<Platform, PlatformCfg> = {
  "Facebook":    {
    adGroupLabel:  "Conjunto de Anúncios",
    audienceLabel: "Audiência / Segmentação",
    audiencePH:    "Ex: Mulheres 25–40, interessadas em saúde, SP",
    formats:       ["Imagem","Vídeo","Carrossel"],
    defaultFormat: "Imagem",
    color:         "#1877F2",
  },
  "Instagram":   {
    adGroupLabel:  "Conjunto de Anúncios",
    audienceLabel: "Audiência / Segmentação",
    audiencePH:    "Ex: Mulheres 25–40, interessadas em saúde, SP",
    formats:       ["Imagem","Vídeo","Carrossel"],
    defaultFormat: "Imagem",
    color:         "#E1306C",
  },
  "Google Ads":  {
    adGroupLabel:  "Grupo de Anúncios",
    audienceLabel: "Palavras-chave / Segmentação",
    audiencePH:    "Ex: clínica odontológica SP, dentista implante preço",
    formats:       ["Responsivo de Pesquisa","Display Responsivo","Vídeo"],
    defaultFormat: "Responsivo de Pesquisa",
    color:         "#EA4335",
  },
  "TikTok Ads":  {
    adGroupLabel:  "Grupo de Anúncios",
    audienceLabel: "Segmentação de Público",
    audiencePH:    "Ex: 18–35 anos, interesse em moda, Nordeste",
    formats:       ["Vídeo","Spark Ads"],
    defaultFormat: "Vídeo",
    color:         "#010101",
  },
  "YouTube Ads": {
    adGroupLabel:  "Grupo de Anúncios",
    audienceLabel: "Segmentação / Palavras-chave",
    audiencePH:    "Ex: canais de culinária, palavras como 'receita saudável'",
    formats:       ["In-Stream","Discovery","Bumper"],
    defaultFormat: "In-Stream",
    color:         "#FF0000",
  },
};

function uid() { return Math.random().toString(36).slice(2,9); }

function adsetName(i: number, platform: Platform = "Facebook", gType?: GoogleCampaignType | "") {
  const { adSetPrefix } = getHierarchyLabels(platform, gType);
  return `${adSetPrefix} #${i + 1}`;
}
function adName(i: number, platform: Platform = "Facebook", gType?: GoogleCampaignType | "") {
  const { adPrefix } = getHierarchyLabels(platform, gType);
  return `${adPrefix} #${i + 1}`;
}

/* ── Helpers ── */
export function makeAd(index = 0, platform: Platform = "Facebook", gType?: GoogleCampaignType | ""): AdInput {
  const cfg = PLATFORM_CONFIG[platform];
  const effectiveFormat: AdFormat = platform === "Google Ads" && gType
    ? (googleFormatsFor(gType)[0] ?? cfg.defaultFormat)
    : cfg.defaultFormat;
  return { id:uid(), name:adName(index, platform, gType), format:effectiveFormat, copy:"" };
}
export function makeAdSet(adCount = 1, index = 0, platform: Platform = "Facebook", gType?: GoogleCampaignType | ""): AdSetInput {
  return {
    id:uid(),
    name:adsetName(index, platform, gType),
    audience:"",
    dailyBudget:"",
    ads:Array.from({length:adCount},(_,i)=>makeAd(i,platform,gType)),
  };
}

const OBJ_CODE: Record<string, string> = {
  "Conversão":               "CONV",
  "Tráfego":                 "TRAF",
  "Geração de Leads":        "LEAD",
  "Reconhecimento de Marca": "REC",
  "Engajamento":             "ENG",
  "Vendas Diretas":          "VND",
};

export interface StructurePrefill {
  campaignName:      string;
  objective:         string;
  ageMin:            string;
  ageMax:            string;
  gender:            string;
  location:          string;
  audienceType:      string;
  interests:         string;
  remarketingSource: string;
  budget:            string;
  budgetType:        string;
  budgetLevel:       string;
  /** Palavras-chave do Google Ads (Pesquisa/PMax) — usadas como audience do grupo */
  googleKeywords?:       string;
  googleAudienceSignals?: string;
}

export function makeStructure(
  platforms: Platform[],
  campaignsPerPlatform = 1,
  adSets = 2,
  ads = 1,
  prefill?: StructurePrefill,
  googleCampaignType?: GoogleCampaignType | "",
): CampaignInput[] {
  const audienceDesc   = prefill ? buildAudienceDesc(prefill) : "";
  const objCode        = prefill ? (OBJ_CODE[prefill.objective] ?? "CAMP") : "CAMP";
  const baseName       = prefill?.campaignName?.trim() || "";

  /* Para Google Ads, o "audience" do grupo é específico do tipo:
     Pesquisa/PMax → palavras-chave | Display/Vídeo/Demand Gen → sinais de público |
     Shopping → vazio (o feed do Merchant Center comanda). */
  function audienceForPlatform(p: Platform, gType?: GoogleCampaignType | ""): string {
    if (p !== "Google Ads") return audienceDesc;
    if (!gType) return "";
    if (gType === "Pesquisa" || gType === "Performance Max") {
      return prefill?.googleKeywords?.trim() || "";
    }
    if (gType === "Display" || gType === "Vídeo/YouTube" || gType === "Demand Gen") {
      return prefill?.googleAudienceSignals?.trim() || "";
    }
    return ""; // Shopping: sem prefill
  }

  // Facebook + Instagram share one Meta campaign — deduplicate
  const hasFacebook  = platforms.includes("Facebook");
  const hasInstagram = platforms.includes("Instagram");
  const metaCombined = hasFacebook && hasInstagram;
  const normalizedPlatforms: Platform[] = metaCombined
    ? platforms.filter(p => p !== "Instagram")
    : platforms;

  const rawBudget      = parseFloat(prefill?.budget ?? "0") || 0;
  const totalCampaigns = normalizedPlatforms.length * campaignsPerPlatform;
  const totalAdSets    = totalCampaigns * adSets;

  const campaignBudget = rawBudget > 0 && prefill?.budgetLevel === "campaign"
    ? Math.round(rawBudget / totalCampaigns).toString()
    : "";

  const adsetBudget = rawBudget > 0 && prefill?.budgetLevel === "adset"
    ? Math.round(rawBudget / totalAdSets).toString()
    : "";

  return normalizedPlatforms.flatMap(platform => {
    const isMeta     = metaCombined && platform === "Facebook";
    const platLabel  = isMeta ? "FACEBOOK + INSTAGRAM" : platform.replace(" Ads", "").toUpperCase();
    const platDisplay = isMeta ? "Facebook + Instagram" : platform;

    const gType = platform === "Google Ads" ? (googleCampaignType || undefined) : undefined;
    const audienceForThis = audienceForPlatform(platform, gType);
    return Array.from({ length: campaignsPerPlatform }, (_, ci) => {
      const suffix = campaignsPerPlatform > 1 ? ` ${ci + 1}` : "";
      const name = baseName
        ? `[ADZ][${objCode}] ${baseName} — ${platDisplay}${suffix}`
        : `[ADZ][${objCode}] ${platLabel}${suffix}`;
      return {
        id: uid(),
        name,
        platform,
        googleCampaignType: gType as GoogleCampaignType | undefined,
        totalBudget: campaignBudget,
        adSets: Array.from({ length: adSets }, (__, asi) =>
          makeAdSetPrefilled(ads, audienceForThis, asi, adsetBudget, platform, gType)
        ),
      };
    });
  });
}

function buildAudienceDesc(p: StructurePrefill): string {
  const parts: string[] = [];
  parts.push(`${p.gender !== "Todos" ? p.gender + ", " : ""}${p.ageMin}–${p.ageMax} anos`);
  if (p.location) parts.push(p.location);
  if (p.audienceType === "remarketing" && p.remarketingSource) {
    parts.push(`Remarketing: ${p.remarketingSource}`);
  } else if (p.audienceType === "personalizado" && p.interests) {
    parts.push(p.interests);
  } else if (p.audienceType === "aberto") {
    parts.push("Público Aberto");
  }
  return parts.join(" · ");
}

function makeAdPrefilled(index = 0, platform: Platform = "Facebook", gType?: GoogleCampaignType | ""): AdInput {
  const cfg = PLATFORM_CONFIG[platform];
  const effectiveFormat: AdFormat = platform === "Google Ads" && gType
    ? (googleFormatsFor(gType)[0] ?? cfg.defaultFormat)
    : cfg.defaultFormat;
  return { id: uid(), name: adName(index, platform, gType), format: effectiveFormat, copy: "" };
}

function makeAdSetPrefilled(adCount = 1, audience = "", index = 0, dailyBudget = "", platform: Platform = "Facebook", gType?: GoogleCampaignType | ""): AdSetInput {
  return {
    id: uid(),
    name: adsetName(index, platform, gType),
    audience,
    dailyBudget,
    ads: Array.from({ length: adCount }, (_, ai) => makeAdPrefilled(ai, platform, gType)),
  };
}

/* ── File reader ── */
function readFile(file: File): Promise<{dataUrl:string;type:"image"|"video";name:string}> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      reject(new Error("Apenas imagens e vídeos são suportados.")); return;
    }
    const type = file.type.startsWith("image/") ? "image" : "video";
    if (type === "video") {
      resolve({ dataUrl:"", type:"video", name:file.name }); return;
    }
    const reader = new FileReader();
    reader.onload = e => resolve({ dataUrl:e.target?.result as string, type, name:file.name });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Shared input ── */
function SbInput({ value, placeholder, onChange, multiline }: {
  value:string; placeholder?:string; onChange:(v:string)=>void; multiline?:boolean;
}) {
  const base: React.CSSProperties = {
    width:"100%", padding:"9px 12px", borderRadius:8, fontSize:13,
    border:"1.5px solid rgba(0,0,0,0.14)", background:"var(--surface)",
    color:"var(--text)", fontFamily:"inherit", outline:"none",
    transition:"border-color 0.15s, box-shadow 0.15s",
    resize:"none" as const,
  };
  const fcs = {
    onFocus:(e:React.FocusEvent<HTMLElement>)=>{
      (e.target as HTMLElement).style.borderColor="#0071E3";
      (e.target as HTMLElement).style.boxShadow="0 0 0 3px rgba(0,113,227,0.15)";
    },
    onBlur:(e:React.FocusEvent<HTMLElement>)=>{
      (e.target as HTMLElement).style.borderColor="rgba(0,0,0,0.14)";
      (e.target as HTMLElement).style.boxShadow="none";
    },
  };
  if (multiline) return <SbTextarea value={value} placeholder={placeholder} onChange={onChange}/>;
  return (
    <input type="text" value={value} placeholder={placeholder}
      onChange={e=>onChange(e.target.value)} style={base} {...fcs}/>
  );
}

function SbLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize:11, fontWeight:600, color:"var(--muted)", display:"block",
      marginBottom:5, letterSpacing:"0.03em", textTransform:"uppercase" as const,
    }}>
      {children}
    </span>
  );
}

/* Textarea que auto-cresce ao conteúdo, inclusive quando preenchida por código */
function SbTextarea({ value, placeholder, onChange, rows = 1 }: {
  value: string; placeholder?: string; onChange: (v: string) => void; rows?: number;
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
      onChange={e => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight + 4}px`;
      }}
      style={{
        width:"100%", padding:"9px 12px", borderRadius:8, fontSize:13,
        border:"1.5px solid rgba(0,0,0,0.14)", background:"var(--surface)",
        color:"var(--text)", fontFamily:"inherit", outline:"none",
        resize:"none", overflow:"hidden", lineHeight:1.55,
      }}
      onFocus={e => { e.target.style.borderColor="#0071E3"; e.target.style.boxShadow="0 0 0 3px rgba(0,113,227,0.15)"; }}
      onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.14)"; e.target.style.boxShadow="none"; }}
    />
  );
}

/* ── Platform meta for link preview badge ── */
const PLAT_META: Record<string, { color: string; bg: string; icon: string }> = {
  Instagram: { color:"#E1306C", bg:"rgba(225,48,108,0.08)", icon:"📸" },
  YouTube:   { color:"#FF0000", bg:"rgba(255,0,0,0.08)",    icon:"▶" },
  TikTok:    { color:"#010101", bg:"rgba(0,0,0,0.06)",      icon:"♪" },
  Facebook:  { color:"#1877F2", bg:"rgba(24,119,242,0.08)", icon:"f" },
  X:         { color:"#000000", bg:"rgba(0,0,0,0.06)",      icon:"𝕏" },
  Link:      { color:"#0071E3", bg:"rgba(0,113,227,0.08)",  icon:"🔗" },
};

/* ── Creative image display — half-width, full image, no crop ── */
function CreativeImage({ src, alt, onRemove, sourceLabel }: {
  src: string; alt?: string; onRemove: () => void; sourceLabel?: string;
}) {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
      {/* Half-column: image shown complete at natural aspect ratio */}
      <div style={{ width:"50%", position:"relative", flexShrink:0 }}>
        <div style={{
          borderRadius:8, overflow:"hidden",
          background:"var(--surface-2)",
          border:"1px solid var(--border-mid)",
          lineHeight:0,
        }}>
          <img
            src={src}
            alt={alt || "criativo"}
            style={{ width:"100%", height:"auto", display:"block" }}
            onError={e => { (e.target as HTMLImageElement).parentElement!.parentElement!.style.display="none"; }}
          />
        </div>
        {/* Remove button */}
        <button type="button" onClick={onRemove} style={{
          position:"absolute", top:6, right:6,
          width:24, height:24, borderRadius:"50%",
          background:"rgba(0,0,0,0.6)", border:"none",
          color:"white", fontSize:13, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          lineHeight:1, fontFamily:"inherit",
        }}>×</button>
      </div>

      {/* Right side: source badge */}
      {sourceLabel && (
        <div style={{ display:"flex", flexDirection:"column", gap:4, paddingTop:4 }}>
          <div style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"4px 8px", background:"var(--surface-2)", borderRadius:6,
            border:"1px solid var(--border-mid)", width:"fit-content",
          }}>
            <span style={{ fontSize:10, color:"var(--muted)" }}>🔗 Fonte:</span>
            <span style={{ fontSize:10, color:"var(--text-sub)", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
              {sourceLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Link input section ── */
function LinkSection({ ad, onUpdate }: { ad: AdInput; onUpdate: (u: Partial<AdInput>) => void }) {
  const [input,   setInput]   = useState(ad.link ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function load() {
    const url = input.trim();
    if (!url) return;
    setLoading(true); setError("");
    try {
      let data: LinkPreviewData & { error?: string };

      const platform = /instagram\.com/i.test(url) ? "Instagram"
        : /youtube\.com|youtu\.be/i.test(url) ? "YouTube"
        : /tiktok\.com/i.test(url) ? "TikTok"
        : /facebook\.com|fb\.com/i.test(url) ? "Facebook"
        : /twitter\.com|x\.com/i.test(url) ? "X"
        : "Link";

      const r = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=false`);
      if (!r.ok) throw new Error("Não foi possível carregar o preview");
      const ml = await r.json() as { status: string; data?: { title?: string; description?: string; image?: { url?: string }; publisher?: string } };
      if (ml.status !== "success" || !ml.data) throw new Error("Não foi possível ler o preview deste link");
      const d = ml.data;
      data = {
        url, platform,
        image:       d.image?.url || "",
        title:       d.title || "",
        description: d.description || "",
        siteName:    d.publisher || platform,
      };
      if (!data.image && !data.title) throw new Error("Não foi possível ler o preview deste link");

      // Auto-fill copy if currently empty, using the post description/caption
      const autoCopy = !ad.copy.trim() ? (data.description || data.title || "") : undefined;

      onUpdate({
        link:        url,
        linkPreview: data,
        // Use preview image as the main creative (portrait display)
        ...(data.image ? { fileDataUrl: data.image, fileType: "image" as const, fileName: data.title || url } : {}),
        // Auto-fill copy only if empty
        ...(autoCopy !== undefined ? { copy: autoCopy } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); load(); }
  }

  // If link preview was loaded, it's now shown as the main creative — don't show this section
  if (ad.linkPreview) return null;

  return (
    <div>
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"8px 12px", borderRadius:8,
        border:`1.5px dashed ${error ? "var(--danger)" : "rgba(0,0,0,0.18)"}`,
        background:"var(--surface-2)", transition:"border-color 0.15s",
      }}>
        <span style={{ fontSize:14, opacity:0.55, flexShrink:0 }}>🔗</span>
        <input
          type="url"
          value={input}
          placeholder="Clique para adicionar link"
          onChange={e => { setInput(e.target.value); setError(""); }}
          onKeyDown={handleKey}
          style={{
            flex:1, border:"none", background:"transparent", fontSize:12,
            color:"var(--text)", fontFamily:"inherit", outline:"none",
            minWidth:0,
          }}
        />
        {input.trim() && (
          <button type="button" onClick={load} disabled={loading}
            style={{
              padding:"5px 11px", borderRadius:6, fontSize:12, fontWeight:600,
              border:"none", fontFamily:"inherit", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "var(--surface-2)" : "var(--primary)",
              color: loading ? "var(--muted)" : "white",
              flexShrink:0, transition:"all 0.15s", whiteSpace:"nowrap" as const,
              display:"flex", alignItems:"center", gap:5,
            }}
          >
            {loading ? (
              <>
                <svg style={{ width:11, height:11, animation:"spin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Carregando
              </>
            ) : "Carregar"}
          </button>
        )}
      </div>
      {error && (
        <p style={{ fontSize:11, color:"var(--danger)", margin:"5px 0 0" }}>⚠ {error}</p>
      )}
    </div>
  );
}

/* ── Image URL input ── */
function ImageUrlInput({ onConfirm }: { onConfirm: (url: string) => void }) {
  const [val, setVal]     = useState("");
  const [error, setError] = useState("");

  function confirm() {
    const url = val.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { setError("Use http:// ou https://"); return; }
    setError("");
    onConfirm(url);
  }

  return (
    <div style={{ marginTop:8 }}>
      <p style={{ fontSize:11, color:"var(--muted)", margin:"0 0 6px", textAlign:"center" as const }}>
        ou cole a URL da imagem
      </p>
      <div style={{ display:"flex", gap:7 }}>
        <input
          type="url" value={val} placeholder="https://exemplo.com/imagem.jpg"
          onChange={e => { setVal(e.target.value); setError(""); }}
          onKeyDown={e => e.key==="Enter" && confirm()}
          style={{
            flex:1, padding:"8px 11px", borderRadius:8, fontSize:12,
            border:`1.5px solid ${error ? "var(--danger)" : "rgba(0,0,0,0.14)"}`,
            background:"var(--surface)", color:"var(--text)", fontFamily:"inherit", outline:"none",
          }}
          onFocus={e => { e.target.style.borderColor="#0071E3"; e.target.style.boxShadow="0 0 0 3px rgba(0,113,227,0.15)"; }}
          onBlur={e  => { if (!error) { e.target.style.borderColor="rgba(0,0,0,0.14)"; e.target.style.boxShadow="none"; } }}
        />
        <button type="button" onClick={confirm} disabled={!val.trim()}
          style={{
            padding:"8px 13px", borderRadius:8, fontSize:12, fontWeight:600,
            border:"none", fontFamily:"inherit", flexShrink:0,
            background: val.trim() ? "var(--primary)" : "var(--surface-2)",
            color: val.trim() ? "white" : "var(--muted)",
            cursor: val.trim() ? "pointer" : "not-allowed",
          }}
        >Usar</button>
      </div>
      {error && <p style={{ fontSize:11, color:"var(--danger)", margin:"4px 0 0" }}>⚠ {error}</p>}
    </div>
  );
}

/* ── Budget input ── */
function BudgetInput({ value, placeholder, color, onChange }: {
  value:string; placeholder:string; color:string; onChange:(v:string)=>void;
}) {
  return (
    <div style={{ position:"relative" }}>
      <span style={{
        position:"absolute", left:9, top:"50%", transform:"translateY(-50%)",
        fontSize:12, fontWeight:700, color, pointerEvents:"none",
      }}>R$</span>
      <input type="number" min="0" value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        style={{
          width:"100%", padding:"9px 9px 9px 28px", borderRadius:8, fontSize:13,
          border:"1.5px solid rgba(0,0,0,0.14)", background:"var(--surface)",
          color:"var(--text)", fontFamily:"inherit", outline:"none",
        }}
      />
    </div>
  );
}

/* ── Ad card ── */
function AdCard({ ad, platform, googleCampaignType, aiContext, adSetAudience, onUpdate }: {
  ad: AdInput;
  platform: Platform;
  googleCampaignType?: GoogleCampaignType | "";
  aiContext?: RSAContext;
  /** Palavras-chave do grupo (audience) — usadas como contexto do RSA */
  adSetAudience?: string;
  onUpdate:(u:Partial<AdInput>)=>void;
}) {
  const cfg = PLATFORM_CONFIG[platform];

  /* Google Ads: formatos dinâmicos por sub-tipo; outras plataformas mantém o padrão */
  const formats: AdFormat[] = platform === "Google Ads" && googleCampaignType
    ? googleFormatsFor(googleCampaignType)
    : cfg.formats;

  /* Google Ads: esconde upload de mídia para Pesquisa/Shopping/Vídeo-YouTube */
  const isGoogleTextOnly = platform === "Google Ads"
    && !!googleCampaignType
    && GOOGLE_TEXT_ONLY_TYPES.includes(googleCampaignType as GoogleCampaignType);

  /* Label do campo copy — adaptado para Google */
  const copyLabel = platform === "Google Ads"
    ? googleCopyLabel(googleCampaignType)
    : "Copy do anúncio";

  const copyPlaceholder = platform === "Google Ads" && googleCampaignType === "Pesquisa"
    ? "Título 1 | Título 2 | Título 3 \\n Descrição do anúncio..."
    : "Texto principal do anúncio…";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await readFile(file);
      onUpdate({ fileDataUrl:r.dataUrl, fileType:r.type, fileName:r.name, link:undefined, linkPreview:undefined });
    } catch(err) { alert((err as Error).message); }
    e.target.value="";
  }

  function handleImageUrl(url: string) {
    onUpdate({ fileDataUrl:url, fileType:"image", fileName:url.split("/").pop() || "imagem", link:undefined, linkPreview:undefined });
  }

  function removeMedia() {
    onUpdate({ fileDataUrl:undefined, fileType:undefined, fileName:undefined, link:undefined, linkPreview:undefined });
  }

  const hasMedia = !!(ad.fileDataUrl || ad.fileName);

  // Source label when creative came from a link preview
  const sourceLabel = ad.linkPreview
    ? ad.linkPreview.url.replace(/^https?:\/\//,"").split("/").slice(0,2).join("/")
    : undefined;

  return (
    <div style={{
      background:"var(--surface)", borderRadius:10, padding:"13px 14px",
      border:"1px solid rgba(0,0,0,0.09)", display:"flex", flexDirection:"column", gap:10,
    }}>
      <div style={{ display:"flex", gap:8 }}>
        <div style={{ flex:1 }}>
          <SbLabel>Nome do anúncio</SbLabel>
          <SbInput value={ad.name} placeholder="Ex: ADS #1" onChange={v=>onUpdate({name:v})}/>
        </div>
        <div style={{ width:150 }}>
          <SbLabel>Formato</SbLabel>
          <select value={ad.format} onChange={e=>onUpdate({format:e.target.value as AdFormat})}
            style={{
              width:"100%", padding:"9px 28px 9px 10px", borderRadius:8, fontSize:13,
              border:"1.5px solid rgba(0,0,0,0.14)", background:"var(--surface)",
              color:"var(--text)", fontFamily:"inherit", cursor:"pointer", outline:"none",
              appearance:"none" as const,
              backgroundImage:`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238E8E93' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundRepeat:"no-repeat", backgroundPosition:"right 6px center", backgroundSize:"14px",
            }}
          >
            {formats.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Google Ads text-only (Pesquisa/Shopping/Vídeo-YouTube): só copy, sem upload */}
      {isGoogleTextOnly ? (
        <div>
          <SbLabel>{copyLabel}</SbLabel>
          {googleCampaignType === "Pesquisa" ? (
            <ResponsiveSearchAdBuilder
              value={ad.copy}
              onChange={v => onUpdate({ copy: v })}
              context={aiContext ? { ...aiContext, keywords: adSetAudience || aiContext.keywords } : undefined}
            />
          ) : (
            <SbInput value={ad.copy} placeholder={copyPlaceholder}
              onChange={v=>onUpdate({copy:v})} multiline/>
          )}
          {googleCampaignType === "Vídeo/YouTube" && (
            <p style={{ fontSize:11, color:"var(--muted)", marginTop:6, lineHeight:1.5 }}>
              → O link do vídeo foi definido no passo anterior. Descreva aqui a mensagem principal ou CTA do anúncio.
            </p>
          )}
          {googleCampaignType === "Shopping" && (
            <p style={{ fontSize:11, color:"var(--muted)", marginTop:6, lineHeight:1.5 }}>
              → Shopping usa o feed de produtos do Merchant Center. Aqui você pode descrever posicionamentos ou lances específicos.
            </p>
          )}
        </div>
      ) : ad.linkPreview && hasMedia && ad.fileType === "image" && ad.fileDataUrl ? (
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          {/* Imagem — 50%, completa, sem corte */}
          <div style={{ width:"50%", flexShrink:0, position:"relative" }}>
            <SbLabel>Criativo</SbLabel>
            <div style={{ borderRadius:8, overflow:"hidden", background:"var(--surface-2)", border:"1px solid var(--border-mid)", lineHeight:0 }}>
              <img
                src={ad.fileDataUrl}
                alt={ad.fileName}
                style={{ width:"100%", height:"auto", display:"block" }}
                onError={e => { (e.target as HTMLImageElement).parentElement!.style.display="none"; }}
              />
            </div>
            {sourceLabel && (
              <div style={{
                marginTop:5, display:"flex", alignItems:"center", gap:4,
                padding:"3px 7px", background:"var(--surface-2)", borderRadius:5,
                border:"1px solid var(--border-mid)", width:"fit-content",
              }}>
                <span style={{ fontSize:10, color:"var(--muted)" }}>🔗</span>
                <span style={{ fontSize:10, color:"var(--text-sub)", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                  {sourceLabel}
                </span>
              </div>
            )}
            <button type="button" onClick={removeMedia} style={{
              position:"absolute", top:20, right:6,
              width:22, height:22, borderRadius:"50%",
              background:"rgba(0,0,0,0.6)", border:"none",
              color:"white", fontSize:12, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              lineHeight:1, fontFamily:"inherit",
            }}>×</button>
          </div>

          {/* Copy — outra metade */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:0 }}>
            <SbLabel>{copyLabel}</SbLabel>
            <SbTextarea
              value={ad.copy}
              placeholder={copyPlaceholder}
              onChange={v => onUpdate({ copy: v })}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Criativo — acima da copy */}
          <div>
            <SbLabel>Criativo</SbLabel>
            {hasMedia ? (
              ad.fileType === "image" && ad.fileDataUrl ? (
                <CreativeImage src={ad.fileDataUrl} alt={ad.fileName} onRemove={removeMedia} sourceLabel={sourceLabel}/>
              ) : (
                <div style={{ position:"relative" }}>
                  <div style={{
                    background:"var(--surface-2)", borderRadius:8, padding:"10px 12px",
                    display:"flex", alignItems:"center", gap:8, border:"1px solid var(--border-mid)",
                  }}>
                    <span style={{ fontSize:18 }}>🎬</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:"var(--text)", margin:0 }}>{ad.fileName}</p>
                      <p style={{ fontSize:11, color:"var(--muted)", margin:0 }}>Vídeo anexado</p>
                    </div>
                  </div>
                  <button type="button" onClick={removeMedia} style={{
                    position:"absolute", top:7, right:7,
                    width:20, height:20, borderRadius:"50%",
                    background:"rgba(0,0,0,0.55)", border:"none",
                    color:"white", fontSize:12, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    lineHeight:1, fontFamily:"inherit",
                  }}>×</button>
                </div>
              )
            ) : (
              /* Upload + link — compacto em linha */
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"8px 12px", borderRadius:8, cursor:"pointer",
                  border:"1.5px dashed rgba(0,0,0,0.18)", background:"var(--surface-2)",
                  transition:"border-color 0.15s",
                }}>
                  <span style={{ fontSize:14, opacity:0.55 }}>📎</span>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>Clique para adicionar imagem ou vídeo</span>
                  <input type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleFile}/>
                </label>
                <LinkSection ad={ad} onUpdate={onUpdate}/>
              </div>
            )}
          </div>

          {/* Copy do anúncio — abaixo do criativo */}
          <div>
            <SbLabel>{copyLabel}</SbLabel>
            <SbInput value={ad.copy} placeholder={copyPlaceholder}
              onChange={v=>onUpdate({copy:v})} multiline/>
          </div>
        </>
      )}

    </div>
  );
}

/* ── Main ── */

interface Props {
  campaigns:          CampaignInput[];
  budgetLevel:        BudgetLevel;
  googleCampaignType?: GoogleCampaignType | "";
  onChange:           (c:CampaignInput[])=>void;
  /** Contexto para geração de RSA com IA (cliente, produto, keywords, etc.) */
  aiContext?:         RSAContext;
}

export default function StructureBuilder({ campaigns, budgetLevel, googleCampaignType, onChange, aiContext }: Props) {
  function updC(cIdx:number, u:Partial<CampaignInput>) {
    onChange(campaigns.map((c,i)=>i===cIdx?{...c,...u}:c));
  }
  function updAs(cIdx:number, asIdx:number, u:Partial<AdSetInput>) {
    updC(cIdx,{adSets:campaigns[cIdx].adSets.map((as,i)=>i===asIdx?{...as,...u}:as)});
  }
  function updAd(cIdx:number, asIdx:number, adIdx:number, u:Partial<AdInput>) {
    updAs(cIdx,asIdx,{ads:campaigns[cIdx].adSets[asIdx].ads.map((ad,i)=>i===adIdx?{...ad,...u}:ad)});
  }

  function addAdSet(cIdx:number) {
    const current  = campaigns[cIdx].adSets;
    const adCount  = current[0]?.ads.length ?? 1;
    const platform = campaigns[cIdx].platform;
    const gType    = campaigns[cIdx].googleCampaignType;
    updC(cIdx,{adSets:[...current, makeAdSet(adCount, current.length, platform, gType)]});
  }
  function addAd(cIdx:number, asIdx:number) {
    const current  = campaigns[cIdx].adSets[asIdx].ads;
    const platform = campaigns[cIdx].platform;
    const gType    = campaigns[cIdx].googleCampaignType;
    updAs(cIdx,asIdx,{ads:[...current, makeAd(current.length, platform, gType)]});
  }
  function remAdSet(cIdx:number, asIdx:number) {
    if (campaigns[cIdx].adSets.length<=1) return;
    updC(cIdx,{adSets:campaigns[cIdx].adSets.filter((_,i)=>i!==asIdx)});
  }
  function remAd(cIdx:number, asIdx:number, adIdx:number) {
    if (campaigns[cIdx].adSets[asIdx].ads.length<=1) return;
    updAs(cIdx,asIdx,{ads:campaigns[cIdx].adSets[asIdx].ads.filter((_,i)=>i!==adIdx)});
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {campaigns.map((campaign, cIdx) => {
        /* Google Ads usa UI completamente dedicada — sem "conjuntos" nem "anúncios" à la Meta */
        if (campaign.platform === "Google Ads") {
          return (
            <GoogleCampaignCard
              key={campaign.id}
              campaign={campaign}
              budgetLevel={budgetLevel}
              onChange={(updated) => onChange(campaigns.map((c, i) => i === cIdx ? updated : c))}
            />
          );
        }

        const cfg      = PLATFORM_CONFIG[campaign.platform];
        const color    = cfg.color;
        const totalAds = campaign.adSets.reduce((s,as)=>s+as.ads.length,0);
        const gType    = campaign.googleCampaignType ?? (googleCampaignType || undefined);
        const labels   = getHierarchyLabels(campaign.platform, gType);
        const adGroupLabel  = labels.adSet;
        const audienceLabel = labels.audienceLabel;
        const audiencePH    = labels.audiencePH;
        const showManualAds = labels.hasManualAds;
        return (
          <div key={campaign.id} style={{
            background:"var(--surface-2)", borderRadius:14,
            border:"1px solid var(--border-mid)", overflow:"hidden",
          }}>
            {/* Campaign header */}
            <div style={{
              background:`linear-gradient(135deg,${color}11,${color}05)`,
              borderBottom:`1px solid ${color}20`,
              padding:"14px 16px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
                <div style={{
                  background:color, borderRadius:7, padding:"3px 10px",
                  fontSize:11, fontWeight:700, color:"white", letterSpacing:"0.01em",
                }}>
                  {campaign.platform}
                </div>
                <span style={{ fontSize:11, color:"var(--muted)", marginLeft:"auto" }}>
                  {campaign.adSets.length} {(campaign.adSets.length > 1 ? labels.adSetPlural : labels.adSet).toLowerCase()}
                  {showManualAds ? ` · ${totalAds} ${(totalAds > 1 ? labels.adPlural : labels.ad).toLowerCase()}` : ""}
                </span>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <SbLabel>Nome da campanha</SbLabel>
                  <SbInput value={campaign.name} placeholder={`Campanha ${campaign.platform}`}
                    onChange={v=>updC(cIdx,{name:v})}/>
                </div>
                {budgetLevel==="campaign" && (
                  <div style={{ width:150 }}>
                    <SbLabel>Orçamento total</SbLabel>
                    <BudgetInput value={campaign.totalBudget} placeholder="5.000" color={color}
                      onChange={v=>updC(cIdx,{totalBudget:v})}/>
                  </div>
                )}
              </div>
            </div>

            {/* Ad sets */}
            <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
              {campaign.adSets.map((adSet, asIdx) => (
                <div key={adSet.id} style={{
                  background:"var(--surface)", borderRadius:12, padding:"13px 14px",
                  border:"1px solid var(--border-mid)",
                }}>
                  <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
                    <div style={{
                      width:22, height:22, borderRadius:6, background:`${color}18`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:700, color, flexShrink:0,
                    }}>
                      {asIdx+1}
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:"var(--text-sub)", marginLeft:7 }}>
                      {adGroupLabel} {asIdx+1}
                    </span>
                    {campaign.adSets.length>1 && (
                      <button type="button" onClick={()=>remAdSet(cIdx,asIdx)} style={{
                        marginLeft:"auto", fontSize:11, color:"var(--danger)",
                        background:"var(--danger-dim)", border:"none", cursor:"pointer",
                        fontFamily:"inherit", padding:"3px 9px", borderRadius:6,
                      }}>
                        Remover
                      </button>
                    )}
                  </div>

                  <div style={{ display:"flex", gap:9, marginBottom:10 }}>
                    <div style={{ flex:1 }}>
                      <SbLabel>Nome do {adGroupLabel.toLowerCase()}</SbLabel>
                      <SbInput value={adSet.name} placeholder={`${adGroupLabel} ${asIdx+1}`}
                        onChange={v=>updAs(cIdx,asIdx,{name:v})}/>
                    </div>
                    {budgetLevel==="adset" && (
                      <div style={{ width:120 }}>
                        <SbLabel>Budget/dia</SbLabel>
                        <BudgetInput value={adSet.dailyBudget} placeholder="200"
                          color="var(--muted)"
                          onChange={v=>updAs(cIdx,asIdx,{dailyBudget:v})}/>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <SbLabel>{audienceLabel}</SbLabel>
                    {campaign.platform === "Google Ads" && gType === "Pesquisa" ? (
                      <KeywordChipInput
                        value={adSet.audience}
                        onChange={v => updAs(cIdx, asIdx, { audience: v })}
                        placeholder={audiencePH}
                        accent="#EA4335"
                        showCount
                      />
                    ) : (
                      <SbInput value={adSet.audience}
                        placeholder={audiencePH}
                        onChange={v=>updAs(cIdx,asIdx,{audience:v})} multiline/>
                    )}
                  </div>

                  {showManualAds ? (
                    <>
                      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                        {adSet.ads.map((ad,adIdx) => (
                          <div key={ad.id}>
                            <div style={{ display:"flex", alignItems:"center", marginBottom:6 }}>
                              <span style={{
                                fontSize:10, fontWeight:700, color,
                                textTransform:"uppercase" as const, letterSpacing:"0.04em",
                              }}>
                                {labels.ad} {adIdx+1}
                              </span>
                              {adSet.ads.length>1 && (
                                <button type="button" onClick={()=>remAd(cIdx,asIdx,adIdx)} style={{
                                  marginLeft:"auto", fontSize:11, color:"var(--danger)",
                                  background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
                                }}>
                                  × Remover
                                </button>
                              )}
                            </div>
                            <AdCard
                              ad={ad}
                              platform={campaign.platform}
                              googleCampaignType={gType}
                              aiContext={aiContext}
                              adSetAudience={adSet.audience}
                              onUpdate={u=>updAd(cIdx,asIdx,adIdx,u)}
                            />
                          </div>
                        ))}
                      </div>

                      <button type="button" className="add-dashed"
                        onClick={()=>addAd(cIdx,asIdx)} style={{ marginTop:9 }}>
                        + Adicionar {labels.ad.toLowerCase()}
                      </button>
                    </>
                  ) : (
                    /* Shopping / PMax: sem anúncios manuais — mensagem adaptada ao tipo */
                    <div style={{
                      background:"rgba(234,67,53,0.06)", borderRadius:8, padding:"11px 14px",
                      border:"1px dashed rgba(234,67,53,0.25)",
                      display:"flex", gap:10, alignItems:"flex-start",
                    }}>
                      <span style={{ fontSize:15 }}>{gType === "Performance Max" ? "⚡" : "🛍️"}</span>
                      <div>
                        <p style={{ fontSize:12, fontWeight:600, color:"#9a2d24", margin:"0 0 3px" }}>
                          {gType === "Performance Max" ? "Grupo de Recursos" : "Sem anúncios manuais"}
                        </p>
                        <p style={{ fontSize:11, color:"var(--muted)", margin:0, lineHeight:1.5 }}>
                          {gType === "Performance Max"
                            ? "Performance Max não tem anúncios individuais — cada Grupo de Recursos reúne títulos, descrições, imagens, vídeos, logos e sinais de público. O Google monta os criativos automaticamente."
                            : "Em Shopping, o Google monta os anúncios automaticamente a partir do feed do Merchant Center. Use este grupo para filtrar quais produtos serão promovidos (categoria, preço, etc)."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button type="button" className="add-dashed"
                onClick={()=>addAdSet(cIdx)}
                style={{ borderRadius:10, padding:"11px" }}>
                + Adicionar {adGroupLabel.toLowerCase()}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
