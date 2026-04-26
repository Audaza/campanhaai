"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "audaza-theme";
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (v === "light" || v === "dark") return v;
  } catch {/* ignore */}
  return "dark";
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = readStoredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {/* ignore */}
  }

  /* Render placeholder até montar pra evitar flash */
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar tema"
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          cursor: "pointer", padding: 0,
        }}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      style={{
        width: 34, height: 34, borderRadius: 9,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-sub)",
        cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.18s, border-color 0.18s, color 0.18s",
        flexShrink: 0,
        fontFamily: "inherit",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.borderColor = "var(--border-mid)";
        e.currentTarget.style.color = "var(--text)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-sub)";
      }}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
