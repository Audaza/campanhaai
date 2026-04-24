import type { GoogleCampaignType, Platform } from "@/types/campaign";

export interface HierarchyLabels {
  /** Nome do nível intermediário (singular) — ex: "Conjunto de Anúncios" / "Grupo de Anúncios" / "Grupo de Produtos" */
  adSet:        string;
  /** Plural do nível intermediário — ex: "Conjuntos" / "Grupos" / "Grupos de Produtos" */
  adSetPlural:  string;
  /** Nome da unidade final (singular) — ex: "Anúncio" / "Vídeo" / "Produto" / "Conjunto de Ativos" */
  ad:           string;
  /** Plural da unidade final */
  adPlural:     string;
  /** Prefixo do nome auto-gerado para o nível intermediário — ex: "Conjunto" / "Grupo" / "Grupo de Produtos" */
  adSetPrefix:  string;
  /** Prefixo do nome auto-gerado para a unidade final — ex: "ADS" / "Vídeo" / "Produto" */
  adPrefix:     string;
  /** Shopping (e PMax com assets vs ads): indica se existe unidade manual de "anúncio" */
  hasManualAds: boolean;
  /** Para PMax: cada "ad" é na verdade um asset group; ads individuais não existem */
  isAssetGroup: boolean;
  /** Label específica para "público-alvo" nesse contexto */
  audienceLabel: string;
  /** Placeholder do campo de público */
  audiencePH:    string;
}

const META_LABELS: HierarchyLabels = {
  adSet:         "Conjunto de Anúncios",
  adSetPlural:   "Conjuntos",
  ad:            "Anúncio",
  adPlural:      "Anúncios",
  adSetPrefix:   "Conjunto",
  adPrefix:      "ADS",
  hasManualAds:  true,
  isAssetGroup:  false,
  audienceLabel: "Audiência / Segmentação",
  audiencePH:    "Ex: Mulheres 25–40, interessadas em saúde, SP",
};

const GOOGLE_LABELS: Record<GoogleCampaignType, HierarchyLabels> = {
  "Pesquisa": {
    adSet:         "Grupo de Anúncios",
    adSetPlural:   "Grupos",
    ad:            "Anúncio responsivo",
    adPlural:      "Anúncios responsivos",
    adSetPrefix:   "Grupo",
    adPrefix:      "RSA",
    hasManualAds:  true,
    isAssetGroup:  false,
    audienceLabel: "Tema / Palavras-chave",
    audiencePH:    "Ex: plano de saúde empresarial, convênio PME",
  },
  "Display": {
    adSet:         "Grupo de Anúncios",
    adSetPlural:   "Grupos",
    ad:            "Anúncio display",
    adPlural:      "Anúncios display",
    adSetPrefix:   "Grupo",
    adPrefix:      "RDA",
    hasManualAds:  true,
    isAssetGroup:  false,
    audienceLabel: "Segmentos de público",
    audiencePH:    "Ex: pessoas com interesse em RH, PMEs",
  },
  "Vídeo/YouTube": {
    adSet:         "Grupo de Anúncios",
    adSetPlural:   "Grupos",
    ad:            "Vídeo",
    adPlural:      "Vídeos",
    adSetPrefix:   "Grupo",
    adPrefix:      "Vídeo",
    hasManualAds:  true,
    isAssetGroup:  false,
    audienceLabel: "Segmentos / Posicionamentos",
    audiencePH:    "Ex: canais de culinária, pessoas com interesse em dieta",
  },
  "Shopping": {
    adSet:         "Grupo de Produtos",
    adSetPlural:   "Grupos de Produtos",
    ad:            "Filtro de Produtos",
    adPlural:      "Filtros de Produtos",
    adSetPrefix:   "Grupo de Produtos",
    adPrefix:      "Filtro",
    hasManualAds:  false,
    isAssetGroup:  false,
    audienceLabel: "Categoria / Filtro do feed",
    audiencePH:    "Ex: tênis esportivos, preço acima de R$ 200",
  },
  "Performance Max": {
    adSet:         "Grupo de Recursos",
    adSetPlural:   "Grupos de Recursos",
    ad:            "Conjunto de Ativos",
    adPlural:      "Conjuntos de Ativos",
    adSetPrefix:   "Asset Group",
    adPrefix:      "Asset",
    hasManualAds:  false,
    isAssetGroup:  true,
    audienceLabel: "Sinais de público",
    audiencePH:    "Ex: gestores de RH, interessados em benefícios corporativos",
  },
  "Demand Gen": {
    adSet:         "Grupo de Anúncios",
    adSetPlural:   "Grupos",
    ad:            "Anúncio Demand Gen",
    adPlural:      "Anúncios Demand Gen",
    adSetPrefix:   "Grupo",
    adPrefix:      "DG",
    hasManualAds:  true,
    isAssetGroup:  false,
    audienceLabel: "Segmentos de público",
    audiencePH:    "Ex: lookalike de clientes, interessados no setor",
  },
};

const TIKTOK_LABELS: HierarchyLabels = {
  adSet:         "Grupo de Anúncios",
  adSetPlural:   "Grupos",
  ad:            "Vídeo",
  adPlural:      "Vídeos",
  adSetPrefix:   "Grupo",
  adPrefix:      "Vídeo",
  hasManualAds:  true,
  isAssetGroup:  false,
  audienceLabel: "Segmentação de Público",
  audiencePH:    "Ex: 18–35 anos, interesse em moda, Nordeste",
};

const YOUTUBE_LABELS: HierarchyLabels = {
  adSet:         "Grupo de Anúncios",
  adSetPlural:   "Grupos",
  ad:            "Vídeo",
  adPlural:      "Vídeos",
  adSetPrefix:   "Grupo",
  adPrefix:      "Vídeo",
  hasManualAds:  true,
  isAssetGroup:  false,
  audienceLabel: "Segmentação / Palavras-chave",
  audiencePH:    "Ex: canais de culinária, palavras 'receita saudável'",
};

export function getHierarchyLabels(
  platform: Platform | string,
  googleType?: GoogleCampaignType | "" | null,
): HierarchyLabels {
  if (platform === "Google Ads" && googleType) {
    return GOOGLE_LABELS[googleType as GoogleCampaignType] ?? GOOGLE_LABELS["Pesquisa"];
  }
  if (platform === "TikTok Ads")  return TIKTOK_LABELS;
  if (platform === "YouTube Ads") return YOUTUBE_LABELS;
  return META_LABELS;
}
