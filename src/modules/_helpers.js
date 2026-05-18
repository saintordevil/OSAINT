const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
};

export function normalizeUrl(rawUrl, base = 'https://example.com') {
    const input = String(rawUrl || '').trim();
    try {
        return new URL(input);
    } catch {
        try {
            if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(input)) {
                return new URL(`https://${input}`);
            }
            return new URL(input, base);
        } catch {
            return null;
        }
    }
}

export function pathParts(parsed) {
    return parsed.pathname
        .split('/')
        .map(part => decodeURIComponent(part))
        .filter(Boolean);
}

export function cleanText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
}

export function compactData(data) {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );
}

export function looksLikeReservedSlug(slug) {
    return /^(?:about|account|admin|api|blog|business|careers|contact|discover|events|explore|help|home|login|privacy|pricing|search|settings|support|terms|this|u|user|users)$/i.test(slug || '');
}

export async function fetchHtml(url, headers = {}) {
    const res = await fetch(url.toString(), {
        redirect: 'follow',
        headers: { ...DEFAULT_HEADERS, ...headers },
    });
    if (!res.ok) return { error: `Request failed with status ${res.status}`, res, html: '' };
    return { res, html: await res.text() };
}

export function extractMeta(html, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`, 'i'),
    ];
    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return cleanText(match[1]);
    }
    return null;
}

export function extractTitle(html) {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? cleanText(match[1]) : null;
}

export function extractJsonLd(html) {
    const blocks = [];
    const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = pattern.exec(html))) {
        try {
            const parsed = JSON.parse(match[1].trim());
            if (Array.isArray(parsed)) blocks.push(...parsed);
            else blocks.push(parsed);
        } catch {}
    }
    return blocks;
}

export function firstJsonLdOfType(html, type) {
    return extractJsonLd(html).find(item => {
        const value = item?.['@type'];
        return Array.isArray(value) ? value.includes(type) : value === type;
    }) || null;
}
