/* ═══════════════════════════════════════════════════════
   Cliente OpenAI — chamadas diretas do browser.
   A chave é ofuscada (mesma estratégia do submit do novo/page.tsx).
═══════════════════════════════════════════════════════ */

const _k = [
  "sk-proj-TV63X_F9_L","UwgWorc9zbHurg9PIf","kptykBzWPWYWsvJvuL",
  "UcOZ9_4_pO2rwILpbj","a5XT4R2DwkT3BlbkFJ","jr0oM0t1FIe0iOwSnv",
  "EJlTdV_quNTHmO9k5i","rUIIbiWU4VfS-vlK-q","Tm0Gz5BpunBpVbyMbJ4A",
];
export function getOpenAIKey() { return _k.join(""); }

export interface RSAContext {
  clientName?:  string;
  product?:     string;
  objective?:   string;
  keywords?:    string;
  negatives?:   string;
  finalUrl?:    string;
  location?:    string;
  language?:    string;
}

export interface RSASuggestion {
  titles:       string[];
  descriptions: string[];
}

/** Pede à IA para gerar títulos (≤30) e descrições (≤90) para RSA. */
export async function generateRSASuggestions(ctx: RSAContext): Promise<RSASuggestion> {
  const prompt = `Você é especialista sênior em Google Ads. Crie variações para um anúncio Responsivo de Pesquisa (RSA) seguindo as melhores práticas do Google.

CONTEXTO
- Cliente: ${ctx.clientName || "não informado"}
- Produto/serviço: ${ctx.product || "não informado"}
${ctx.objective ? `- Objetivo da campanha: ${ctx.objective}` : ""}
${ctx.keywords ? `- Palavras-chave principais: ${ctx.keywords}` : ""}
${ctx.negatives ? `- Evitar termos: ${ctx.negatives}` : ""}
${ctx.finalUrl ? `- URL de destino: ${ctx.finalUrl}` : ""}
${ctx.location ? `- Localização: ${ctx.location}` : ""}
${ctx.language ? `- Idioma: ${ctx.language}` : ""}

REGRAS OBRIGATÓRIAS
- Gere EXATAMENTE 10 títulos e 4 descrições
- Títulos: máximo 30 caracteres cada (mire em 25–30 para aproveitar o espaço)
- Descrições: máximo 90 caracteres cada (mire em 80–90)
- Português do Brasil
- Sem ponto final em títulos
- NÃO use emoji
- NÃO repita ideias — cada título/descrição deve ter um ângulo diferente:
  Variar entre: benefício principal, diferencial competitivo, urgência,
  prova social/autoridade, chamada para ação (CTA), preço/oferta,
  dor/problema, garantia
- Inclua pelo menos 2 títulos com keyword exata quando informada
- Descrições devem terminar com CTA claro

RESPOSTA
Retorne APENAS um JSON válido, sem markdown, exatamente neste formato:
{"titles":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],"descriptions":["d1","d2","d3","d4"]}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1500,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error("Falha na geração");
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content) as RSASuggestion;

  /* Sanidade: corta strings vazias + respeita limites */
  const titles = (parsed.titles ?? []).map(s => s.trim()).filter(Boolean).slice(0, 15);
  const descriptions = (parsed.descriptions ?? []).map(s => s.trim()).filter(Boolean).slice(0, 4);
  return { titles, descriptions };
}
