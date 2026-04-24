"use client";

import { useEffect, useRef, useState } from "react";
import { generateRSASuggestions, type RSAContext } from "@/lib/openaiClient";

/* ═══════════════════════════════════════════════════════
   ResponsiveSearchAdBuilder
   Constrói anúncios RSA (Responsivo de Pesquisa) com inputs
   separados para títulos (máx 30) e descrições (máx 90).

   Armazena em formato texto legível:
     Títulos: t1 | t2 | t3
     Descrições: d1 | d2

   Google: 3–15 títulos · 2–4 descrições.

   Se `context` é fornecido, mostra botão "Gerar com IA" que
   cria títulos e descrições otimizados pelo OpenAI GPT-4o.
═══════════════════════════════════════════════════════ */

const MAX_TITLE_LEN = 30;
const MAX_DESC_LEN  = 90;
const MIN_TITLES = 3, MAX_TITLES = 15;
const MIN_DESCS  = 2, MAX_DESCS  = 4;

const RED = "#EA4335";
const BLUE = "#0071E3";

type Props = {
  value: string;
  onChange: (v: string) => void;
  context?: RSAContext;
};

function parseRSA(raw: string): { titles: string[]; descriptions: string[] } {
  const empty = { titles: [], descriptions: [] };
  if (!raw) return empty;
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

  /* Fallback: formato livre → separa por " | " ou newline.
     Até 30 chars = título, até 90 = descrição. */
  const items = raw.split(/\||\n/).map(s => s.trim()).filter(Boolean);
  const titles: string[] = [];
  const descs: string[] = [];
  for (const it of items) {
    if (it.length <= MAX_TITLE_LEN && descs.length === 0) titles.push(it);
    else descs.push(it);
  }
  return { titles, descriptions: descs };
}

function serialize(titles: string[], descriptions: string[]): string {
  const t = titles.map(s => s.trim()).filter(Boolean);
  const d = descriptions.map(s => s.trim()).filter(Boolean);
  if (!t.length && !d.length) return "";
  const parts: string[] = [];
  if (t.length) parts.push(`Títulos: ${t.join(" | ")}`);
  if (d.length) parts.push(`Descrições: ${d.join(" | ")}`);
  return parts.join("\n");
}

/* ── Linha individual (título ou descrição) ── */
function Row({
  value, max, placeholder, index, onChange, onRemove, canRemove,
}: {
  value: string; max: number; placeholder: string; index: number;
  onChange: (v: string) => void; onRemove: () => void; canRemove: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const len = value.length;
  const pctOver = len > max;
  const pctNear = len > max * 0.85 && len <= max;
  const counterColor = pctOver ? "#dc2626" : pctNear ? "#d97706" : "var(--muted)";

  const borderColor = focused
    ? (pctOver ? "#dc2626" : "#0071E3")
    : (pctOver ? "#dc2626" : "rgba(0,0,0,0.14)");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6,
        background: "var(--surface-2)", border: "1px solid var(--border-mid)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "var(--muted)",
        flexShrink: 0, fontVariantNumeric: "tabular-nums",
      }}>
        {index + 1}
      </span>
      <div style={{ flex: 1, position: "relative" }}>
        <input
          type="text"
          value={value}
          maxLength={max + 20}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 66px 9px 12px",
            borderRadius: 8, fontSize: 13,
            border: `1.5px solid ${borderColor}`,
            background: "var(--surface)", color: "var(--text)",
            fontFamily: "inherit", outline: "none",
            boxShadow: focused && !pctOver ? "0 0 0 3px rgba(0,113,227,0.15)"
                     : focused && pctOver  ? "0 0 0 3px rgba(220,38,38,0.18)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        />
        <span style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          fontSize: 11, fontWeight: 600, color: counterColor,
          fontVariantNumeric: "tabular-nums",
        }}>
          {len}/{max}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remover item ${index + 1}`}
        style={{
          width: 26, height: 26, borderRadius: 6,
          border: "1px solid var(--border-mid)",
          background: "var(--surface)",
          color: canRemove ? "var(--muted)" : "rgba(0,0,0,0.12)",
          cursor: canRemove ? "pointer" : "not-allowed",
          fontSize: 13, lineHeight: 1, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => { if (canRemove) { (e.currentTarget as HTMLButtonElement).style.background = "var(--danger-dim)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; } }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; (e.currentTarget as HTMLButtonElement).style.color = canRemove ? "var(--muted)" : "rgba(0,0,0,0.12)"; }}
      >
        ×
      </button>
    </div>
  );
}

export default function ResponsiveSearchAdBuilder({ value, onChange, context }: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  /* Estado interno: arrays. Parse inicial do value;
     re-sincroniza se a prop mudar por fora (ex: reset). */
  const initial = parseRSA(value);
  const [titles, setTitles] = useState<string[]>(() =>
    initial.titles.length >= MIN_TITLES ? initial.titles : [
      ...initial.titles,
      ...Array(Math.max(0, MIN_TITLES - initial.titles.length)).fill(""),
    ]
  );
  const [descs, setDescs] = useState<string[]>(() =>
    initial.descriptions.length >= MIN_DESCS ? initial.descriptions : [
      ...initial.descriptions,
      ...Array(Math.max(0, MIN_DESCS - initial.descriptions.length)).fill(""),
    ]
  );

  /* Só emite onChange quando o estado local muda (não quando prop externa muda) */
  const skipNextEmit = useRef(true);
  useEffect(() => {
    if (skipNextEmit.current) { skipNextEmit.current = false; return; }
    onChange(serialize(titles, descs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titles, descs]);

  const filledT = titles.filter(Boolean).length;
  const filledD = descs.filter(Boolean).length;

  const tOver = titles.some(t => t.length > MAX_TITLE_LEN);
  const dOver = descs.some(d => d.length > MAX_DESC_LEN);

  function updateTitle(i: number, v: string) {
    setTitles(prev => prev.map((t, idx) => idx === i ? v : t));
  }
  function updateDesc(i: number, v: string) {
    setDescs(prev => prev.map((d, idx) => idx === i ? v : d));
  }
  function addTitle() {
    if (titles.length >= MAX_TITLES) return;
    setTitles(prev => [...prev, ""]);
  }
  function addDesc() {
    if (descs.length >= MAX_DESCS) return;
    setDescs(prev => [...prev, ""]);
  }
  function removeTitle(i: number) {
    if (titles.length <= MIN_TITLES) return;
    setTitles(prev => prev.filter((_, idx) => idx !== i));
  }
  function removeDesc(i: number) {
    if (descs.length <= MIN_DESCS) return;
    setDescs(prev => prev.filter((_, idx) => idx !== i));
  }

  async function runAI() {
    if (!context) return;
    setAiLoading(true); setAiError("");
    try {
      const r = await generateRSASuggestions(context);
      if (r.titles.length) setTitles(r.titles);
      if (r.descriptions.length) setDescs(r.descriptions);
    } catch {
      setAiError("Não foi possível gerar. Tente novamente.");
      setTimeout(() => setAiError(""), 3500);
    } finally {
      setAiLoading(false);
    }
  }

  const hasAI = !!context && (!!context.product || !!context.clientName);

  return (
    <div style={{
      background: "var(--surface-2)", borderRadius: 10,
      border: "1px solid var(--border-mid)",
      padding: "14px 14px 12px",
    }}>
      {/* Header com botão de IA */}
      {hasAI && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", marginBottom: 14,
          background: `linear-gradient(135deg, ${BLUE}0d 0%, ${BLUE}05 100%)`,
          border: `1px solid ${BLUE}33`, borderRadius: 8,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: `linear-gradient(135deg, ${BLUE}, #34aadc)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: `0 2px 6px ${BLUE}40`,
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>
              Gerar com IA
            </p>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0", lineHeight: 1.45 }}>
              {aiError
                ? <span style={{ color: "#dc2626" }}>{aiError}</span>
                : "10 títulos + 4 descrições otimizados usando o contexto da campanha"}
            </p>
          </div>
          <button
            type="button"
            onClick={runAI}
            disabled={aiLoading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12.5, fontWeight: 700, color: "white",
              background: aiLoading ? "var(--muted)" : BLUE,
              border: "none", borderRadius: 7,
              padding: "7px 14px", cursor: aiLoading ? "wait" : "pointer",
              fontFamily: "inherit", flexShrink: 0,
              boxShadow: aiLoading ? "none" : `0 2px 6px ${BLUE}55`,
              transition: "all 0.15s",
            }}
          >
            {aiLoading ? (
              <>
                <svg style={{ width: 12, height: 12, animation: "spin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gerando…
              </>
            ) : (
              <>Gerar com IA</>
            )}
          </button>
        </div>
      )}

      {/* Títulos */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          textTransform: "uppercase", color: "var(--text-sub)",
        }}>
          Títulos
        </span>
        <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
          {filledT}/{titles.length} · máx {MAX_TITLE_LEN} caracteres · 3 mínimo
        </span>
        {tOver && (
          <span style={{ fontSize: 10.5, color: "#dc2626", fontWeight: 600, marginLeft: "auto" }}>
            ⚠ Algum título excede o limite
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {titles.map((t, i) => (
          <Row
            key={i}
            index={i}
            value={t}
            max={MAX_TITLE_LEN}
            placeholder={i === 0 ? "Ex: Plano de Saúde Empresarial" : `Título ${i + 1}`}
            onChange={v => updateTitle(i, v)}
            onRemove={() => removeTitle(i)}
            canRemove={titles.length > MIN_TITLES}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addTitle}
        disabled={titles.length >= MAX_TITLES}
        style={{
          fontSize: 12, fontWeight: 600, color: titles.length >= MAX_TITLES ? "var(--muted)" : RED,
          background: titles.length >= MAX_TITLES ? "var(--surface-2)" : `${RED}10`,
          border: `1px dashed ${titles.length >= MAX_TITLES ? "var(--border-mid)" : RED + "55"}`,
          borderRadius: 7, padding: "6px 12px",
          cursor: titles.length >= MAX_TITLES ? "not-allowed" : "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}
      >
        + Adicionar título {titles.length >= MAX_TITLES ? `(máx ${MAX_TITLES})` : ""}
      </button>

      {/* Separador */}
      <div style={{ height: 1, background: "var(--border-mid)", margin: "18px -14px 16px" }} />

      {/* Descrições */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          textTransform: "uppercase", color: "var(--text-sub)",
        }}>
          Descrições
        </span>
        <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
          {filledD}/{descs.length} · máx {MAX_DESC_LEN} caracteres · 2 mínimo
        </span>
        {dOver && (
          <span style={{ fontSize: 10.5, color: "#dc2626", fontWeight: 600, marginLeft: "auto" }}>
            ⚠ Alguma descrição excede o limite
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {descs.map((d, i) => (
          <Row
            key={i}
            index={i}
            value={d}
            max={MAX_DESC_LEN}
            placeholder={i === 0 ? "Ex: Cobertura nacional, desconto PME e 0800 24h." : `Descrição ${i + 1}`}
            onChange={v => updateDesc(i, v)}
            onRemove={() => removeDesc(i)}
            canRemove={descs.length > MIN_DESCS}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addDesc}
        disabled={descs.length >= MAX_DESCS}
        style={{
          fontSize: 12, fontWeight: 600, color: descs.length >= MAX_DESCS ? "var(--muted)" : RED,
          background: descs.length >= MAX_DESCS ? "var(--surface-2)" : `${RED}10`,
          border: `1px dashed ${descs.length >= MAX_DESCS ? "var(--border-mid)" : RED + "55"}`,
          borderRadius: 7, padding: "6px 12px",
          cursor: descs.length >= MAX_DESCS ? "not-allowed" : "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}
      >
        + Adicionar descrição {descs.length >= MAX_DESCS ? `(máx ${MAX_DESCS})` : ""}
      </button>
    </div>
  );
}
