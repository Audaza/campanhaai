export type Platform   = "Facebook" | "Instagram" | "Google Ads" | "TikTok Ads" | "YouTube Ads";
export type Objective  = "Conversão" | "Tráfego" | "Geração de Leads" | "Reconhecimento de Marca" | "Engajamento" | "Vendas Diretas";
export type GoogleCampaignType =
  | "Pesquisa"
  | "Display"
  | "Vídeo/YouTube"
  | "Shopping"
  | "Performance Max"
  | "Demand Gen";
export type Gender     = "Todos" | "Masculino" | "Feminino";
export type Duration   = "7 dias" | "15 dias" | "30 dias" | "60 dias" | "90 dias" | "personalizado";
export type BudgetType   = "total" | "diario";
export type BudgetLevel  = "campaign" | "adset";
export type AudienceType = "aberto" | "personalizado" | "remarketing";
export type AdFormat =
  | "Imagem" | "Vídeo" | "Carrossel"                             // Meta
  | "Responsivo de Pesquisa" | "Display Responsivo"              // Google Ads
  | "Spark Ads"                                                  // TikTok Ads
  | "In-Stream" | "Discovery" | "Bumper";                        // YouTube Ads

/* ── Manual structure input types ── */

export interface LinkPreviewData {
  url:         string;
  title:       string;
  description: string;
  image:       string;
  siteName:    string;
  platform:    string;
}

export interface AdInput {
  id:           string;
  name:         string;
  format:       AdFormat;
  copy:         string;
  fileDataUrl?: string;
  fileType?:    "image" | "video";
  fileName?:    string;
  link?:        string;
  linkPreview?: LinkPreviewData;
}

export interface AdSetInput {
  id:          string;
  name:        string;
  audience:    string;
  dailyBudget: string;
  ads:         AdInput[];
}

export interface CampaignInput {
  id:                  string;
  name:                string;
  platform:            Platform;
  googleCampaignType?: GoogleCampaignType;
  totalBudget:         string;
  adSets:              AdSetInput[];
}

/* ── Form data (all steps) ── */

export interface CampaignFormData {
  clientName:        string;
  product:           string;
  website:           string;
  campaignName:      string;
  objective:         Objective;
  platforms:         Platform[];
  budgetType:        BudgetType;
  budgetLevel:       BudgetLevel;
  budget:            string;
  duration:          Duration;
  startDate:         string;
  endDate:           string;
  createTimeline:    boolean;
  ageMin:            string;
  ageMax:            string;
  gender:            Gender;
  location:          string;
  audienceType:      AudienceType;
  interests:         string;
  remarketingSource: string;
  structCampaigns:   number;
  structAdSets:      number;
  structAds:         number;
  campaignInputs:    CampaignInput[];
  googleCampaignType:       GoogleCampaignType | "";
  googleKeywords:           string;
  googleNegativeKeywords:   string;
  googleFinalUrl:           string;
  googleAudienceSignals:    string;
  googleShoppingCategories: string;
  googleVideoFormat:        string;
  googleDemandGenFormat:    string;
  googleLanguage:           string;
  youtubeVideoUrl:          string;
}

/* ── Campaign Plan (result) ── */

export interface AdSet {
  name:     string;
  audience: string;
  budget:   string;
  ads: {
    name:         string;
    format:       string;
    copy:         string;
    fileDataUrl?: string;
    fileType?:    "image" | "video";
    fileName?:    string;
  }[];
}

export interface Campaign {
  name:                string;
  platform:            Platform;
  googleCampaignType?: GoogleCampaignType;
  objective:           string;
  totalBudget:         string;
  adSets:              AdSet[];
}

export interface TimelinePhase {
  phase:    string;
  duration: string;
  actions:  string[];
}

/** Estimativas de performance por plataforma (geradas pela IA com base em
 *  benchmarks de mercado para o objetivo + setor + investimento). */
export interface PerformanceMetrics {
  /** Impressões totais estimadas (ex: "180.000") */
  impressions?: string;
  /** Alcance único estimado (ex: "120.000") */
  reach?:       string;
  /** Cliques totais estimados (ex: "3.500") */
  clicks?:      string;
  /** Custo por mil impressões (ex: "R$ 12,80") */
  cpm?:         string;
  /** Custo por clique (ex: "R$ 0,85") */
  cpc?:         string;
  /** Taxa de cliques % (ex: "2.9") — só o número */
  ctr?:         string;
  /** Conversões estimadas (objetivo Conversão/Vendas) */
  conversions?: string;
  /** Leads estimados (objetivo Geração de Leads) */
  leads?:       string;
  /** Custo por aquisição/lead (ex: "R$ 35,30") */
  cpa?:         string;
  /** Visualizações de vídeo (objetivo Engajamento/Reconhecimento com vídeo) */
  views?:       string;
  /** Custo por visualização (ex: "R$ 0,02") */
  cpv?:         string;
}

export interface BudgetDistribution {
  platform:   Platform;
  amount:     string;
  percentage: number;
  allocation: string;
  metrics?:   PerformanceMetrics;
}

export interface CreativeSuggestion {
  format:       string;
  platform:     Platform;
  headline:     string;
  body:         string;
  cta:          string;
  fileDataUrl?: string;
  fileType?:    "image" | "video";
  fileName?:    string;
}

export interface GoogleAdsPlanConfig {
  campaignType:       GoogleCampaignType;
  keywords?:          string;
  negativeKeywords?:  string;
  finalUrl?:          string;
  audienceSignals?:   string;
  shoppingCategories?:string;
  videoFormat?:       string;
  demandGenFormat?:   string;
  youtubeVideoUrl?:   string;
  language?:          string;
}

export interface CampaignPlan {
  overview: {
    clientName:  string;
    product:     string;
    totalBudget: string;
    dailyBudget: string;
    duration:    string;
    objective:   string;
    platforms:   Platform[];
    summary:     string;
  };
  googleAdsConfig?:   GoogleAdsPlanConfig;
  campaigns:          Campaign[];
  budgetDistribution: BudgetDistribution[];
  timeline:           TimelinePhase[];
  creatives:          CreativeSuggestion[];
  recommendations:    string[];
}
