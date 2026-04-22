import { NextRequest, NextResponse } from "next/server";

function detectPlatform(url: string) {
  if (/instagram\.com/i.test(url))                    return "Instagram";
  if (/youtube\.com|youtu\.be/i.test(url))            return "YouTube";
  if (/tiktok\.com/i.test(url))                       return "TikTok";
  if (/facebook\.com|fb\.com|fb\.watch/i.test(url))  return "Facebook";
  if (/twitter\.com|x\.com/i.test(url))              return "X";
  return "Link";
}

function decode(str: string) {
  return str
    // Named entities
    .replace(/&amp;/g,  "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'").replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">").replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    // Numeric hex entities: &#xNN; &#XNN;
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // Numeric decimal entities: &#NNN;
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function getMeta(html: string, ...names: string[]): string {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return decode(m[1]);
    }
  }
  return "";
}

// Instagram and Facebook serve full pre-rendered HTML to Googlebot (for SEO indexing).
// This includes og:image with actual CDN image URLs — no auth required for public content.
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const BROWSER_UA   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MOBILE_UA    = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function doFetch(url: string, ua: string, timeoutMs: number) {
  const ctrl    = new AbortController();
  const timer   = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res  = await fetch(url, {
      signal:   ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":      ua,
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
        "Cache-Control":   "no-cache",
      },
    });
    clearTimeout(timer);
    return res.ok ? await res.text() : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// TikTok oEmbed — public, no auth required, returns thumbnail_url
async function fetchTikTokOembed(url: string) {
  try {
    const res  = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const d = await res.json() as { title?: string; thumbnail_url?: string; author_name?: string };
    if (!d.thumbnail_url) return null;
    return { image: d.thumbnail_url, title: d.title || `@${d.author_name}` || "TikTok", description: `@${d.author_name || ""}`, siteName: "TikTok" };
  } catch { return null; }
}

// YouTube oEmbed — public, no auth required
async function fetchYouTubeOembed(url: string) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const d = await res.json() as { title?: string; thumbnail_url?: string; author_name?: string };
    if (!d.thumbnail_url) return null;
    return { image: d.thumbnail_url, title: d.title || "YouTube", description: `Por ${d.author_name || ""}`, siteName: "YouTube" };
  } catch { return null; }
}

function extractOg(html: string, platform: string) {
  const title       = getMeta(html, "og:title",       "twitter:title");
  const description = getMeta(html, "og:description", "twitter:description", "description");
  const image       = getMeta(html, "og:image",       "og:image:url",  "twitter:image");
  const siteName    = getMeta(html, "og:site_name")   || platform;
  return { title, description, image, siteName };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  const platform = detectPlatform(url);

  // ── YouTube & TikTok: use official oEmbed (fastest, most reliable) ────────
  if (platform === "YouTube") {
    const d = await fetchYouTubeOembed(url);
    if (d) return NextResponse.json({ url, ...d, platform });
  }
  if (platform === "TikTok") {
    const d = await fetchTikTokOembed(url);
    if (d) return NextResponse.json({ url, ...d, platform });
  }

  // ── Instagram & Facebook: use Googlebot UA — serves full pre-rendered HTML ─
  if (platform === "Instagram" || platform === "Facebook") {
    const html = await doFetch(url, GOOGLEBOT_UA, 10000);
    if (html) {
      const og = extractOg(html, platform);
      if (og.image || og.title) {
        return NextResponse.json({ url, ...og, platform });
      }
    }
    return NextResponse.json(
      { error: "Não foi possível carregar o preview. Verifique se o perfil é público." },
      { status: 422 },
    );
  }

  // ── Generic: try desktop UA, fallback to mobile UA ────────────────────────
  let html = await doFetch(url, BROWSER_UA, 8000);
  if (html) {
    const og = extractOg(html, platform);
    if (og.title || og.image) {
      return NextResponse.json({ url, ...og, platform });
    }
  }

  // Mobile UA fallback
  html = await doFetch(url, MOBILE_UA, 7000);
  if (html) {
    const og = extractOg(html, platform);
    if (og.title || og.image) {
      return NextResponse.json({ url, ...og, platform });
    }
  }

  if (!html) {
    return NextResponse.json({ error: "Timeout: link demorou demais para responder" }, { status: 500 });
  }
  return NextResponse.json(
    { error: "Não foi possível ler o preview deste link. Tente uma URL pública." },
    { status: 422 },
  );
}
