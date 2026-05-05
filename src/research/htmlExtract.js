import { scanJson, tryParseJson } from './jsonScan.js';

export function extractHtmlArtifacts(html, baseUrl = 'https://example.com') {
    const text = String(html || '');
    return {
        meta: extractMeta(text),
        links: extractLinks(text, baseUrl),
        script_urls: extractScriptUrls(text, baseUrl),
        json_blobs: extractJsonBlobs(text),
        youtube_config: extractYouTubeConfig(text),
    };
}

export function scanHtml(html, options = {}) {
    const artifacts = extractHtmlArtifacts(html, options.baseUrl);
    const candidates = [];

    candidates.push(...scanJson({ meta: artifacts.meta, links: artifacts.links }, {
        endpoint: `${options.endpoint || 'html'}#meta`,
        platform: options.platform,
        inputTokens: options.inputTokens,
    }));

    for (const blob of artifacts.json_blobs) {
        candidates.push(...scanJson(blob.value, {
            endpoint: `${options.endpoint || 'html'}#${blob.name}`,
            platform: options.platform,
            inputTokens: options.inputTokens,
        }));
    }

    return { artifacts, candidates };
}

export function extractMeta(html) {
    const meta = [];
    const regex = /<meta\b([^>]+)>/gi;
    let match;
    while ((match = regex.exec(html))) {
        const attrs = parseAttrs(match[1]);
        if (attrs.property || attrs.name || attrs.content) meta.push(attrs);
    }
    return meta;
}

export function extractLinks(html, baseUrl) {
    const links = [];
    const regex = /<link\b([^>]+)>/gi;
    let match;
    while ((match = regex.exec(html))) {
        const attrs = parseAttrs(match[1]);
        if (attrs.href) attrs.href = resolveUrl(attrs.href, baseUrl);
        if (attrs.rel || attrs.href) links.push(attrs);
    }
    return links;
}

export function extractScriptUrls(html, baseUrl) {
    const scripts = [];
    const regex = /<script\b([^>]*)>/gi;
    let match;
    while ((match = regex.exec(html))) {
        const attrs = parseAttrs(match[1]);
        if (attrs.src) scripts.push(resolveUrl(attrs.src, baseUrl));
    }
    return [...new Set(scripts)];
}

export function extractJsonBlobs(html) {
    const blobs = [];
    const assignments = [
        ['ytInitialData', /(?:var\s+)?ytInitialData\s*=/g],
        ['ytInitialPlayerResponse', /(?:var\s+)?ytInitialPlayerResponse\s*=/g],
        ['ytcfg', /ytcfg\.set\s*\(/g],
        ['spotify_state', /<script[^>]+id=["'](?:__NEXT_DATA__|initial-state|session)["'][^>]*>/gi],
    ];

    for (const [name, regex] of assignments) {
        let match;
        while ((match = regex.exec(html))) {
            const start = html.indexOf('{', match.index);
            if (start === -1) continue;
            const raw = extractBalanced(html, start);
            const parsed = tryParseJson(raw);
            if (parsed) blobs.push({ name, value: parsed });
        }
    }

    const jsonScript = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = jsonScript.exec(html))) {
        const attrs = parseAttrs(scriptMatch[1]);
        const body = scriptMatch[2]?.trim();
        if (!body || body.length < 2) continue;
        if (attrs.type === 'application/json' || attrs.type === 'application/ld+json') {
            const parsed = tryParseJson(body);
            if (parsed) blobs.push({ name: attrs.id || attrs.type || 'json_script', value: parsed });
        }
        if (attrs.id === 'initialstate' || attrs.id === 'initial-state' || attrs.id === 'urlschemeconfig') {
            for (const parsed of parsePossibleEncodedJson(body)) {
                blobs.push({ name: attrs.id, value: parsed });
            }
        }
    }

    return blobs;
}

export function extractYouTubeConfig(html) {
    const apiKey = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1]
        || html.match(/INNERTUBE_API_KEY['"]?\s*[:=]\s*['"]([^'"]+)/)?.[1]
        || null;
    const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1]
        || html.match(/INNERTUBE_CLIENT_VERSION['"]?\s*[:=]\s*['"]([^'"]+)/)?.[1]
        || null;
    const visitorData = html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/)?.[1] || null;
    return { api_key: apiKey, client_version: clientVersion, visitor_data: visitorData };
}

function parseAttrs(raw) {
    const attrs = {};
    const regex = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = regex.exec(raw))) {
        attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
    }
    return attrs;
}

function resolveUrl(value, baseUrl) {
    try {
        return new URL(value, baseUrl).toString();
    } catch {
        return value;
    }
}

function extractBalanced(text, start) {
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
        } else if (ch === open) {
            depth++;
        } else if (ch === close) {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return '';
}

function decodeHtml(value) {
    return String(value)
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function parsePossibleEncodedJson(value) {
    const parsed = [];
    const rawCandidates = [value];
    try { rawCandidates.push(decodeURIComponent(value)); } catch {}
    try { rawCandidates.push(Buffer.from(value, 'base64').toString('utf8')); } catch {}

    for (const candidate of rawCandidates) {
        const direct = tryParseJson(candidate);
        if (direct) parsed.push(direct);

        const text = String(candidate || '').trim();
        if (text.startsWith('ey') || text.startsWith('W3')) {
            try {
                const decoded = Buffer.from(text, 'base64').toString('utf8');
                const json = tryParseJson(decoded);
                if (json) parsed.push(json);
            } catch {}
        }
    }

    return parsed;
}
