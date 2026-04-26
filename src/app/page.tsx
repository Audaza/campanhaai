"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, FolderOpen, ArrowUpRight } from "lucide-react";
import { listSavedPlans } from "@/lib/savedPlans";
import BrandHeader from "@/components/BrandHeader";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(listSavedPlans().length);
  }, []);

  const cards = [
    {
      key:    "novo",
      Icon:   Sparkles,
      title:  "Novo planejamento",
      desc:   "Comece um projeto do zero — cliente, objetivo, orçamento e estrutura completa em minutos.",
      badge:  "Audaza",
      status: "ativo",
      onClick: () => router.push("/novo"),
    },
    {
      key:    "salvos",
      Icon:   FolderOpen,
      title:  "Planejamentos salvos",
      desc:   count === null
        ? "Carregando…"
        : count === 0
          ? "Nenhum projeto salvo. Seus planejamentos aparecem aqui depois que você salvar."
          : `${count} ${count === 1 ? "projeto guardado" : "projetos guardados"} — abra ou atualize quando quiser.`,
      badge:  "Biblioteca",
      status: count && count > 0 ? "ativo" : "vazio",
      onClick: () => router.push("/planejamentos"),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Topbar igual /apps */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--topbar-bg)",
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        borderBottom: "1px solid var(--topbar-border)",
      }}>
        <div style={{
          maxWidth: 1340, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px clamp(16px,3vw,32px)",
          gap: 18,
        }}>
          <BrandHeader />
          <ThemeToggle />
        </div>
      </header>

      {/* Hero estilo /apps */}
      <section style={{
        maxWidth: 1340, margin: "0 auto", width: "100%",
        padding: "48px clamp(16px,3vw,32px) 18px",
        position: "relative", zIndex: 5,
      }}>
        <h1 className="font-display" style={{
          fontWeight: 500,
          fontSize: "clamp(36px, 5.4vw, 64px)",
          lineHeight: 1,
          letterSpacing: "-0.045em",
          color: "var(--text)",
          margin: 0,
        }}>
          Planejamento de tráfego <em style={{ fontStyle: "normal", color: "var(--primary-cool)" }}>com IA</em>
        </h1>
        <p style={{
          marginTop: 14,
          fontSize: 15,
          color: "var(--text-sub)",
          maxWidth: "55ch",
          lineHeight: 1.55,
          fontWeight: 300,
        }}>
          Crie estratégias completas em poucos minutos — estrutura de campanhas,
          orçamento e cronograma automatizados, prontos pra apresentar.
        </p>
      </section>

      {/* Grid de cards igual /apps */}
      <main style={{
        maxWidth: 1340, margin: "0 auto", width: "100%",
        padding: "24px clamp(16px,3vw,32px) 80px",
        position: "relative", zIndex: 5,
        flex: 1,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {cards.map((c, i) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className="apps-card"
              style={{ animationDelay: `${0.02 + i * 0.03}s` }}
            >
              <div className="apps-card-icon">
                <c.Icon size={18} />
              </div>
              <div className="apps-card-name font-display">{c.title}</div>
              <div className="apps-card-desc">{c.desc}</div>
              <div className="apps-card-foot">
                <span className="apps-badge">{c.badge}</span>
                <span className={`apps-status${c.status === "vazio" ? " is-empty" : ""}`}>
                  <span className="apps-dot" />
                  {c.status === "vazio" ? "VAZIO" : "ATIVO"}
                </span>
              </div>
              <div className="apps-card-arrow">
                <ArrowUpRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* CSS do conceito /apps */}
      <style>{`
        .apps-card {
          position: relative;
          display: flex; flex-direction: column;
          padding: 22px 22px 18px;
          background: var(--surface);
          border: 1px solid var(--rule);
          border-radius: 14px;
          transition: transform 0.25s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s, background 0.2s, box-shadow 0.25s;
          overflow: hidden;
          min-height: 170px;
          isolation: isolate;
          cursor: pointer;
          font-family: inherit;
          color: inherit;
          text-align: left;

          opacity: 0; transform: translateY(8px);
          animation: appsCardIn 0.5s cubic-bezier(0.2,0.8,0.2,1) forwards;
        }
        @keyframes appsCardIn { to { opacity: 1; transform: none; } }

        .apps-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 14px;
          background: radial-gradient(40% 60% at 100% 0%, rgba(91,158,255,0.10), transparent 70%);
          opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: -1;
        }
        .apps-card:hover {
          transform: translateY(-2px);
          border-color: rgba(91,158,255,0.35);
          background: rgba(91,158,255,0.03);
          box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(91,158,255,0.06);
        }
        :root[data-theme="light"] .apps-card:hover {
          box-shadow: 0 12px 40px rgba(91,158,255,0.18), 0 0 0 1px rgba(91,158,255,0.10);
        }
        .apps-card:hover::before { opacity: 1; }

        .apps-card-icon {
          width: 36px; height: 36px; border-radius: 9px;
          background: rgba(91,158,255,0.10);
          border: 1px solid rgba(91,158,255,0.18);
          display: grid; place-items: center;
          color: var(--primary);
          margin-bottom: 14px; flex-shrink: 0;
          transition: 0.25s;
        }
        .apps-card:hover .apps-card-icon {
          background: rgba(91,158,255,0.18);
          border-color: rgba(91,158,255,0.35);
        }

        .apps-card-name {
          font-weight: 500; font-size: 16px; letter-spacing: -0.018em;
          color: var(--text); margin-bottom: 4px;
        }
        .apps-card-desc {
          font-size: 12.5px; color: var(--text-sub); line-height: 1.5;
          font-weight: 300; margin-bottom: 14px; flex: 1;
        }

        .apps-card-foot {
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
          margin-top: auto;
        }
        .apps-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10.5px; font-weight: 500; letter-spacing: 0.04em;
          color: var(--text-sub);
          padding: 4px 9px; border-radius: 5px;
          background: var(--surface-2);
        }
        .apps-badge::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: var(--primary);
        }
        .apps-status {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10.5px; color: var(--muted); font-weight: 500; letter-spacing: 0.05em;
        }
        .apps-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 8px rgba(91,227,138,0.6);
        }
        .apps-status.is-empty .apps-dot {
          background: var(--muted-2); box-shadow: none;
        }

        .apps-card-arrow {
          position: absolute; top: 22px; right: 22px;
          width: 28px; height: 28px; border-radius: 7px;
          display: grid; place-items: center;
          color: var(--muted);
          opacity: 0; transition: 0.25s;
        }
        .apps-card:hover .apps-card-arrow {
          opacity: 1; color: var(--primary);
          transform: translate(2px, -2px);
        }
      `}</style>
    </div>
  );
}
