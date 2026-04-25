/* ═══════════════════════════════════════════════════════
   Parser/serializer compartilhado do formato RSA.

   Formato canônico armazenado em ad.copy:
     Títulos: t1 | t2 | t3
     Descrições: d1 | d2

   Fallback para conteúdo livre (vinda da IA antiga ou colado):
     separa por " | " ou newline e classifica por comprimento.
═══════════════════════════════════════════════════════ */

export const RSA_MAX_TITLE = 30;
export const RSA_MAX_DESC  = 90;

export interface RSAParsed {
  titles:       string[];
  descriptions: string[];
}

export function parseRSA(raw: string): RSAParsed {
  if (!raw) return { titles: [], descriptions: [] };
  const lines = raw.split("\n").map(l => l.trim());
  const tLine = lines.find(l => /^títulos?\s*:/i.test(l));
  const dLine = lines.find(l => /^descri(ç|c)ões?\s*:/i.test(l));
  const splitPipes = (s: string) => s.split("|").map(x => x.trim()).filter(Boolean);

  if (tLine || dLine) {
    return {
      titles: tLine ? splitPipes(tLine.replace(/^títulos?\s*:\s*/i, "")) : [],
      descriptions: dLine ? splitPipes(dLine.replace(/^descri(ç|c)ões?\s*:\s*/i, "")) : [],
    };
  }

  /* Fallback: separa por '|' / newline e classifica por comprimento */
  const items = raw.split(/\||\n/).map(s => s.trim()).filter(Boolean);
  const titles: string[] = [];
  const descs:  string[] = [];
  for (const it of items) {
    if (it.length <= RSA_MAX_TITLE && descs.length === 0) titles.push(it);
    else descs.push(it);
  }
  return { titles, descriptions: descs };
}

export function serializeRSA(titles: string[], descriptions: string[]): string {
  const t = titles.map(s => s.trim()).filter(Boolean);
  const d = descriptions.map(s => s.trim()).filter(Boolean);
  if (!t.length && !d.length) return "";
  const parts: string[] = [];
  if (t.length) parts.push(`Títulos: ${t.join(" | ")}`);
  if (d.length) parts.push(`Descrições: ${d.join(" | ")}`);
  return parts.join("\n");
}

/** Retorna o domínio limpo a partir de uma URL (ou string vazia se inválida) */
export function extractDomain(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

/** Retorna o caminho da URL (ex: "/oferta") em formato breadcrumb (› oferta) */
export function urlBreadcrumb(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname.split("/").filter(Boolean);
    if (!path.length) return "";
    return " › " + path.join(" › ");
  } catch {
    return "";
  }
}
