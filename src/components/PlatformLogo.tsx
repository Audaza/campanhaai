import React from "react";

/* Logos oficiais das plataformas (SVG inline) */

type Props = { platform: string; size?: number };

function detect(p: string): "facebook" | "instagram" | "google" | "tiktok" | "youtube" | "generic" {
  const s = p.toLowerCase();
  if (s.includes("facebook") || (s.includes("meta") && !s.includes("instagram"))) return "facebook";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("google")) return "google";
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("youtube")) return "youtube";
  return "generic";
}

export function PlatformLogo({ platform, size = 16 }: Props) {
  const kind = detect(platform);
  const common = { width: size, height: size, style: { display: "block", flexShrink: 0 } };

  if (kind === "facebook") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-label="Facebook">
        <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }

  if (kind === "instagram") {
    const gid = `ig-grad-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <svg {...common} viewBox="0 0 24 24" aria-label="Instagram">
        <defs>
          <radialGradient id={gid} cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="5%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill={`url(#${gid})`}/>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="rgba(0,0,0,0)" />
        <path fill="#fff" d="M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 7.59a2.99 2.99 0 1 1 0-5.98 2.99 2.99 0 0 1 0 5.98z"/>
        <circle cx="17.2" cy="6.8" r="1.1" fill="#fff"/>
      </svg>
    );
  }

  if (kind === "google") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-label="Google">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    );
  }

  if (kind === "tiktok") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-label="TikTok">
        <path fill="#25F4EE" d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.957-1.283-2.648h.004C16.368 1.124 16.408 1 16.408 1H12.89v13.604c0 .182 0 .362-.008.54l-.001.067-.002.026v.007a2.99 2.99 0 0 1-1.5 2.367 2.956 2.956 0 0 1-1.472.393c-1.651 0-2.991-1.347-2.991-3.008s1.34-3.008 2.991-3.008c.312 0 .614.049.898.14V9.11c-.291-.038-.586-.058-.884-.058-3.632 0-6.576 2.944-6.576 6.576s2.944 6.576 6.576 6.576 6.576-2.944 6.576-6.576v-6.89a9.77 9.77 0 0 0 5.681 1.82v-3.5s-1.403.05-2.856-.496z"/>
        <path fill="#FE2C55" d="M20.393 4.42a6.228 6.228 0 0 1-1.072-.834 6.228 6.228 0 0 1-1.137-.966C17.335 1.65 17.018.664 16.901-.026h-2.515v17.131a2.99 2.99 0 0 1-1.5 2.367 2.956 2.956 0 0 1-1.472.393c-1.651 0-2.991-1.347-2.991-3.008 0-.44.096-.86.266-1.237a2.993 2.993 0 0 0-2.141 2.867c0 1.661 1.34 3.008 2.991 3.008.528 0 1.024-.14 1.452-.38a2.99 2.99 0 0 0 1.52-2.38l.001-.067c.008-.178.008-.358.008-.54V5.562z" opacity="0.85" transform="translate(0 1)"/>
        <path fill="#000" d="M16.901.974h-3.547v13.603c0 .182 0 .362-.008.54l-.001.067a2.99 2.99 0 0 1-1.5 2.367 2.956 2.956 0 0 1-1.472.393c-1.651 0-2.991-1.347-2.991-3.008s1.34-3.008 2.991-3.008c.312 0 .614.049.898.14v-3.019c-.291-.038-.586-.058-.884-.058-3.632 0-6.576 2.944-6.576 6.576s2.944 6.576 6.576 6.576 6.576-2.944 6.576-6.576v-6.89a9.77 9.77 0 0 0 5.681 1.82v-3.5s-1.403.05-2.856-.496a6.228 6.228 0 0 1-1.137-.966 6.228 6.228 0 0 1-1.072-.834C17.335 3.65 17.018 2.664 16.901.974z"/>
      </svg>
    );
  }

  if (kind === "youtube") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-label="YouTube">
        <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
        <path fill="#fff" d="M9.545 15.568V8.432L15.818 12z"/>
      </svg>
    );
  }

  return (
    <svg {...common} viewBox="0 0 24 24" aria-label={platform}>
      <circle cx="12" cy="12" r="10" fill="#0071E3"/>
    </svg>
  );
}
