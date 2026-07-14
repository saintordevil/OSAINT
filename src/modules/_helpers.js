import { isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
};

const DEFAULT_FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const BUILTIN_FETCH = globalThis.fetch;

const HTML_ENTITIES = Object.freeze({
    amp: '&',
    apos: "'",
    copy: '©',
    gt: '>',
    hellip: '…',
    lt: '<',
    mdash: '—',
    middot: '·',
    nbsp: '\u00a0',
    ndash: '–',
    quot: '"',
    reg: '®',
    trade: '™',
});

function isWebUrl(parsed) {
    return Boolean(
        parsed
        && /^https?:$/.test(parsed.protocol)
        && parsed.hostname
        && !parsed.username
        && !parsed.password
    );
}

export function normalizeUrl(rawUrl, base = 'https://example.com') {
    const input = String(rawUrl || '').trim();
    if (!input) return null;

    try {
        const parsed = new URL(input);
        return isWebUrl(parsed) ? parsed : null;
    } catch {
        try {
            let parsed;
            if (/^\/\//.test(input)) {
                parsed = new URL(`https:${input}`);
            } else if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
                return null;
            } else if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(input)) {
                parsed = new URL(`https://${input}`);
            } else {
                const parsedBase = base instanceof URL ? new URL(base.href) : new URL(String(base));
                if (!isWebUrl(parsedBase)) return null;
                parsed = new URL(input, parsedBase);
            }
            return isWebUrl(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
}

export function pathParts(parsed) {
    return parsed.pathname
        .split('/')
        .map(part => {
            try {
                return decodeURIComponent(part);
            } catch {
                return part;
            }
        })
        .filter(Boolean);
}

export function cleanText(value) {
    return String(value || '')
        .replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, (encoded, entity) => {
            if (entity[0] !== '#') return HTML_ENTITIES[entity.toLowerCase()] ?? encoded;

            const hexadecimal = entity[1]?.toLowerCase() === 'x';
            const digits = entity.slice(hexadecimal ? 2 : 1);
            const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
            if (
                !Number.isInteger(codePoint)
                || codePoint <= 0
                || codePoint > 0x10ffff
                || (codePoint >= 0xd800 && codePoint <= 0xdfff)
            ) {
                return encoded;
            }
            return String.fromCodePoint(codePoint);
        })
        .replace(/\s+/g, ' ')
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

function normalizeHostname(hostname) {
    return String(hostname || '')
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/\.+$/, '');
}

function parseIpv6Parts(host) {
    if (!host.includes(':')) return null;
    const halves = host.split('::');
    if (halves.length > 2) return null;

    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
    const parts = [...left, ...Array(Math.max(0, missing)).fill('0'), ...right];
    if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/i.test(part))) return null;
    return parts.map(part => Number.parseInt(part, 16));
}

function isUnsafeIpv4(host) {
    const [a, b, c] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
        (a === 198 && (b === 18 || b === 19)) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113);
}

export function isUnsafeWebHost(hostname) {
    const host = normalizeHostname(hostname);
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
        return true;
    }

    if (isIP(host) === 4) {
        return isUnsafeIpv4(host);
    }

    if (isIP(host) === 6) {
        const parts = parseIpv6Parts(host);
        if (!parts) return true;

        // IPv4-compatible and IPv4-mapped ranges include canonical hexadecimal
        // forms such as ::ffff:7f00:1, not only dotted-decimal spellings.
        const firstSixZero = parts.slice(0, 6).every(part => part === 0);
        const mapped = parts.slice(0, 5).every(part => part === 0) && parts[5] === 0xffff;
        if (firstSixZero || mapped) {
            const ipv4 = `${parts[6] >> 8}.${parts[6] & 0xff}.${parts[7] >> 8}.${parts[7] & 0xff}`;
            return mapped ? isUnsafeIpv4(ipv4) : true;
        }

        const first = parts[0];
        const globallyRoutable = first >= 0x2000 && first <= 0x3fff;
        return !globallyRoutable ||
            (first === 0x2001 && parts[1] === 0x0db8); // documentation range
    }

    return false;
}

function abortable(promise, signal) {
    if (signal.aborted) return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        signal.addEventListener('abort', onAbort, { once: true });
        Promise.resolve(promise).then(resolve, reject).finally(() => {
            signal.removeEventListener('abort', onAbort);
        });
    });
}

async function resolvesToUnsafeAddress(hostname, resolveHost, signal) {
    const host = normalizeHostname(hostname);
    if (isIP(host)) return isUnsafeWebHost(host);

    try {
        const addresses = await abortable(resolveHost(host, { all: true, verbatim: true }), signal);
        return !addresses.length || addresses.some(({ address }) => isUnsafeWebHost(address));
    } catch (error) {
        if (signal.aborted) throw error;
        throw new Error(`Destination DNS lookup failed: ${error.code || error.message}`);
    }
}

function redirectHostAllowed(hostname, policy) {
    if (!policy) return true;
    if (typeof policy === 'function') return Boolean(policy(hostname));
    const allowed = Array.isArray(policy) ? policy : [policy];
    return allowed.some(host => String(host).toLowerCase() === hostname.toLowerCase());
}

async function readBoundedText(res, maxBytes = MAX_HTML_BYTES) {
    const declaredLength = Number.parseInt(res.headers.get('content-length') || '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        await res.body?.cancel?.().catch(() => {});
        return { error: `Response exceeded ${maxBytes} byte limit`, html: '' };
    }

    if (!res.body?.getReader) {
        const body = await res.arrayBuffer();
        if (body.byteLength > maxBytes) {
            return { error: `Response exceeded ${maxBytes} byte limit`, html: '' };
        }
        return { html: new TextDecoder().decode(body) };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const textChunks = [];
    let totalBytes = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => {});
            return { error: `Response exceeded ${maxBytes} byte limit`, html: '' };
        }
        textChunks.push(decoder.decode(value, { stream: true }));
    }

    textChunks.push(decoder.decode());
    return { html: textChunks.join('') };
}

async function cancelResponse(res) {
    await res?.body?.cancel?.().catch(() => {});
}

function stripSensitiveRedirectHeaders(headers) {
    const sensitive = new Set(['authorization', 'cookie', 'host', 'origin', 'proxy-authorization', 'referer']);
    return Object.fromEntries(
        Object.entries(headers).filter(([key]) => !sensitive.has(key.toLowerCase())),
    );
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function fetchHtml(url, headers = {}, {
    allowedRedirectHosts = null,
    maxRedirects = 5,
    maxResponseBytes = MAX_HTML_BYTES,
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    resolveHost = dnsLookup,
    validateDns = globalThis.fetch === BUILTIN_FETCH,
} = {}) {
    const parsed = url instanceof URL ? normalizeUrl(url.href) : normalizeUrl(url);
    if (!parsed) return { error: 'Invalid HTTP(S) URL', res: null, html: '' };
    if (isUnsafeWebHost(parsed.hostname)) return { error: 'Unsafe HTTP(S) destination', res: null, html: '' };

    const controller = new AbortController();
    const boundedTimeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_FETCH_TIMEOUT_MS;
    const boundedRedirects = Number.isInteger(maxRedirects) && maxRedirects >= 0 ? maxRedirects : 5;
    const boundedBytes = Number.isFinite(Number(maxResponseBytes)) && Number(maxResponseBytes) > 0 ? Number(maxResponseBytes) : MAX_HTML_BYTES;
    const timer = setTimeout(() => controller.abort(), boundedTimeout);
    timer.unref?.();

    try {
        // This preflight blocks aliases that already resolve to private space.
        // The fixed platform host allowlists remain the primary boundary because
        // global fetch does not expose a portable way to pin this exact result.
        if (validateDns && await resolvesToUnsafeAddress(parsed.hostname, resolveHost, controller.signal)) {
            return { error: 'HTTP(S) destination did not resolve to a public address', res: null, html: '' };
        }

        let current = parsed;
        let requestHeaders = { ...DEFAULT_HEADERS, ...headers };
        for (let redirects = 0; ; redirects++) {
            const res = await fetch(current.toString(), {
                redirect: 'manual',
                headers: requestHeaders,
                signal: controller.signal,
            });

            if (REDIRECT_STATUSES.has(res.status)) {
                const location = res.headers.get('location');
                await cancelResponse(res);
                if (!location) {
                    return { error: `Redirect response ${res.status} had no Location header`, res, html: '' };
                }
                if (redirects >= boundedRedirects) {
                    return { error: `Redirect limit exceeded (${boundedRedirects})`, res, html: '' };
                }

                const next = normalizeUrl(new URL(location, current).href);
                if (!next || isUnsafeWebHost(next.hostname)) {
                    return { error: 'Redirect blocked an unsafe HTTP(S) destination', res, html: '' };
                }
                if (current.protocol === 'https:' && next.protocol !== 'https:') {
                    return { error: 'Redirect blocked an HTTPS downgrade', res, html: '' };
                }
                if (!redirectHostAllowed(next.hostname, allowedRedirectHosts)) {
                    return { error: `Unexpected redirect host: ${next.hostname}`, res, html: '' };
                }
                if (validateDns && await resolvesToUnsafeAddress(next.hostname, resolveHost, controller.signal)) {
                    return { error: 'Redirect destination did not resolve to a public address', res, html: '' };
                }
                if (next.origin !== current.origin) requestHeaders = stripSensitiveRedirectHeaders(requestHeaders);
                current = next;
                continue;
            }

            if (!res.ok) {
                await cancelResponse(res);
                return { error: `Request failed with status ${res.status}`, res, html: '' };
            }
            const body = await readBoundedText(res, boundedBytes);
            if (body.error) return { ...body, res };
            return { res, html: body.html };
        }
    } catch (error) {
        const message = controller.signal.aborted ? `Request timed out after ${boundedTimeout}ms` : error.message;
        return { error: message, res: null, html: '' };
    } finally {
        clearTimeout(timer);
    }
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

export function extractJsonObjects(html, key) {
    const results = [];
    const marker = `"${String(key).replace(/["\\]/g, '\\$&')}"`;
    let offset = 0;

    while (offset < html.length) {
        const keyIndex = html.indexOf(marker, offset);
        if (keyIndex < 0) break;

        let colonIndex = keyIndex + marker.length;
        while (/\s/.test(html[colonIndex])) colonIndex++;
        if (html[colonIndex] !== ':') {
            offset = keyIndex + marker.length;
            continue;
        }

        let start = colonIndex + 1;
        while (/\s/.test(html[start])) start++;
        if (start < 0 || html[start] !== '{') {
            offset = keyIndex + marker.length;
            continue;
        }

        let depth = 0;
        let inString = false;
        let escaped = false;
        let end = -1;
        for (let i = start; i < html.length; i++) {
            const char = html[i];
            if (inString) {
                if (escaped) escaped = false;
                else if (char === '\\') escaped = true;
                else if (char === '"') inString = false;
                continue;
            }
            if (char === '"') inString = true;
            else if (char === '{') depth++;
            else if (char === '}' && --depth === 0) {
                end = i + 1;
                break;
            }
        }

        if (end > start) {
            try { results.push(JSON.parse(html.slice(start, end))); } catch {}
            offset = end;
        } else {
            offset = start + 1;
        }
    }

    return results;
}

export function extractJsonLd(html) {
    const blocks = [];
    const append = value => {
        if (Array.isArray(value)) {
            for (const item of value) append(item);
            return;
        }
        if (!value || typeof value !== 'object') return;

        if ('@graph' in value) {
            const { '@graph': graph, ...container } = value;
            if (Object.keys(container).some(key => key !== '@context')) blocks.push(container);
            append(graph);
            return;
        }
        blocks.push(value);
    };

    const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = pattern.exec(html))) {
        try {
            const parsed = JSON.parse(match[1].trim());
            append(parsed);
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
