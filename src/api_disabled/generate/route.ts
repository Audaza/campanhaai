import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import type { CampaignFormData } from "@/types/campaign";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const d: CampaignFormData = await req.json();

  const budgetInfo = d.budgetType === "diario"
    ? `R$ ${d.budget}/dia (investimento diário)`
    : `R$ ${d.budget} total`;

  const dailyValue  = d.budgetType === "diario" ? `R$ ${d.budget}` : "";
  const totalValue  = d.budgetType === "total"  ? `R$ ${d.budget}` : "";

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

PÚBLICO:
- Tipo: ${d.audienceType === "aberto" ? "Público Aberto (sem segmentação por interesse)" : d.audienceType === "remarketing" ? `Remarketing — ${d.remarketingSource}` : "Personalizado"}
- Faixa etária: ${d.ageMin}–${d.ageMax} anos
- Gênero: ${d.gender}
- Localização: ${d.location}
${d.audienceType === "personalizado" ? `- Interesses: ${d.interests}` : ""}
${d.audienceType === "remarketing" ? `- Fonte do remarketing: ${d.remarketingSource}` : ""}

IMPORTANTE: A estrutura de campanhas (campanhas, conjuntos, anúncios) já foi configurada manualmente pelo usuário.
Retorne SOMENTE um JSON válido, sem markdown, com estes campos estratégicos:

{
  "overview": {
    "clientName": "${d.clientName}",
    "product": "${d.product}",
    "totalBudget": "${totalValue || "calculado"}",
    "dailyBudget": "${dailyValue}",
    "duration": "${d.duration}",
    "objective": "${d.objective}",
    "platforms": ${JSON.stringify(d.platforms)},
    "summary": "resumo estratégico da campanha em 2-3 frases diretas e profissionais"
  },
  "budgetDistribution": [
    {
      "platform": "plataforma (uma das: ${d.platforms.join(", ")})",
      "amount": "valor em R$",
      "percentage": numero_inteiro,
      "allocation": "como o orçamento é distribuído internamente nesta plataforma"
    }
  ],
  "timeline": [
    {
      "phase": "nome da fase",
      "duration": "ex: Dias 1-7",
      "actions": ["ação específica 1", "ação específica 2", "ação específica 3"]
    }
  ],
  "creatives": [
    {
      "format": "Imagem, Vídeo, Carrossel ou Stories",
      "platform": "plataforma (uma das: ${d.platforms.join(", ")})",
      "headline": "título impactante do anúncio",
      "body": "texto principal do anúncio em 2-3 frases",
      "cta": "texto do botão de ação"
    }
  ],
  "recommendations": [
    "recomendação estratégica 1",
    "recomendação estratégica 2",
    "recomendação estratégica 3",
    "recomendação estratégica 4"
  ]
}

REGRAS:
- budgetDistribution: 1 entrada por plataforma (total: ${d.platforms.length})
- timeline: 5 fases obrigatórias na ordem: "Data Início", "Otimização", "Escala", "Análise de Desempenho", "Análise Final" (duration da última deve ser "Escala ou Desativar")
- creatives: 2 sugestões por plataforma (total: ${d.platforms.length * 2})
- Distribua o orçamento inteligentemente entre as plataformas
- Seja específico, prático e profissional`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3500,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const text = res.choices[0].message.content;
    if (!text) return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    console.error("Erro ao gerar campanha:", err);
    return NextResponse.json({ error: "Erro ao gerar planejamento" }, { status: 500 });
  }
}
