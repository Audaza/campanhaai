"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

/* ═══════════════════════════════════════════════════════
   KeywordChipInput
   Input de palavras-chave estilo chip/tag.
   Valor externo = string separada por vírgula ou nova linha.
═══════════════════════════════════════════════════════ */

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Cor de destaque (borda foco, chips). Padrão: azul do sistema */
  accent?: string;
  /** Mostra contador de palavras-chave abaixo */
  showCount?: boolean;
  /** Quando chip for pura negação (começa com "-"), estiliza em vermelho */
  negativeMode?: boolean;
};

function parseKeywords(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map(k => k.trim())
    .filter(Boolean);
}

function serialize(arr: string[]): string {
  return arr.filter(Boolean).join(", ");
}

export default function KeywordChipInput({
  value, onChange, placeholder, accent = "#0071E3", showCount, negativeMode,
}: Props) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const keywords = parseKeywords(value);

  function commitDraft() {
    const parts = parseKeywords(draft);
    if (!parts.length) return;
    const next = [...keywords];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(serialize(next));
    setDraft("");
  }

  function removeAt(i: number) {
    const next = keywords.filter((_, idx) => idx !== i);
    onChange(serialize(next));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && keywords.length) {
      removeAt(keywords.length - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[,\n]/.test(text)) {
      e.preventDefault();
      const parts = parseKeywords(text);
      if (!parts.length) return;
      const next = [...keywords];
      for (const p of parts) if (!next.includes(p)) next.push(p);
      onChange(serialize(next));
      setDraft("");
    }
  }

  const wrapStyle: CSSProperties = {
    width: "100%",
    minHeight: 40,
    padding: "6px 8px",
    borderRadius: 8,
    background: "var(--surface)",
    border: `1.5px solid ${focused ? accent : "rgba(0,0,0,0.14)"}`,
    boxShadow: focused ? `0 0 0 3px ${accent}26` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5,
    cursor: "text",
  };

  return (
    <div>
      <div style={wrapStyle} onClick={() => inputRef.current?.focus()}>
        {keywords.map((k, i) => {
          const isNeg = negativeMode || k.startsWith("-");
          const chipColor = isNeg ? "#dc2626" : accent;
          return (
            <span key={`${k}-${i}`} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 600, color: chipColor,
              background: chipColor + "12", border: `1px solid ${chipColor}33`,
              padding: "3px 5px 3px 10px", borderRadius: 999,
              maxWidth: "100%", lineHeight: 1.3,
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                {k}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                aria-label={`Remover ${k}`}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 16, height: 16, borderRadius: "50%",
                  border: "none", background: chipColor + "20",
                  color: chipColor, cursor: "pointer", padding: 0,
                  fontSize: 11, lineHeight: 1, fontFamily: "inherit",
                }}
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          placeholder={keywords.length === 0 ? placeholder : ""}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { setFocused(false); commitDraft(); }}
          onFocus={() => setFocused(true)}
          style={{
            flex: "1 1 120px", minWidth: 120,
            padding: "4px 6px", border: "none", outline: "none",
            background: "transparent", fontSize: 13,
            color: "var(--text)", fontFamily: "inherit",
          }}
        />
      </div>
      {showCount && (
        <p style={{
          fontSize: 11, color: "var(--muted)", margin: "5px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>
            {keywords.length} palavra{keywords.length === 1 ? "" : "s"}-chave
          </span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>
            Enter ou vírgula para adicionar · Backspace remove a última
          </span>
        </p>
      )}
    </div>
  );
}
