import { gunzipSync, inflateSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);
const SPOTIFY_HOSTS = new Set(['open.spotify.com', 'spotify.link', 'spotify.app.link']);

export function safeUrl(rawUrl, base = 'https://example.com') {
    try {
        return new URL(rawUrl);
    } catch {
        return new URL(rawUrl, base);
    }
}

export function inferPlatform(rawUrl) {
    const parsed = safeUrl(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be' || host.endsWith('.youtube.com')) return 'youtube';
    if (host === 'spotify.link' || host === 'spotify.app.link' || host === 'open.spotify.com') return 'spotify';
    return null;
}

export function extractTokens(rawUrl, platform = inferPlatform(rawUrl)) {
    const parsed = safeUrl(rawUrl);
    const params = collectParams(parsed);
    const branchReferrer = params.get('_branch_referrer') || params.get('branch_referrer') || null;

    const tokens = {
        si: params.get('si') || null,
        pp: params.get('pp') || null,
        v: params.get('v') || null,
        list: params.get('list') || null,
        clip: params.get('clip') || null,
        t: params.get('t') || params.get('start') || null,
        sp_cid: params.get('sp_cid') || null,
        dlsi: params.get('dlsi') || null,
        go: params.get('go') || null,
        nd: params.get('nd') || null,
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        branch_referrer: branchReferrer,
        branch_match_id: params.get('_branch_match_id') || params.get('branch_match_id') || null,
        decoded_branch_referrer: branchReferrer ? decodeBranchReferrer(branchReferrer) : null,
    };

    tokens.decoded_si_hex = tokens.si ? decodeBase64UrlHex(tokens.si) : null;
    tokens.decoded_pp_hex = tokens.pp ? decodeBase64UrlHex(tokens.pp) : null;

    const contentIds = platform === 'spotify'
        ? extractSpotifyContentIds(parsed)
        : extractYoutubeContentIds(parsed);

    return {
        platform,
        input_url: rawUrl,
        final_host: parsed.hostname.toLowerCase(),
        tokens,
        token_values: evidenceTokenValues(tokens, platform),
        all_token_values: Object.values(tokens).filter(Boolean).map(String),
        content_ids: contentIds,
    };
}

export function evidenceTokenValues(tokens, platform) {
    const keys = platform === 'youtube'
        ? ['si', 'pp']
        : ['si', 'sp_cid', 'dlsi', 'branch_referrer', 'branch_match_id'];
    return keys
        .map(key => tokens[key])
        .filter(Boolean)
        .map(String)
        .filter(value => value.length >= 8);
}

export function collectParams(parsed, depth = 0) {
    const params = new Map();

    function add(key, value) {
        if (!key || value === null || value === undefined || value === '') return;
        const normalized = key.toLowerCase();
        if (!params.has(normalized)) params.set(normalized, String(value));
    }

    for (const [key, value] of parsed.searchParams.entries()) {
        add(key, value);
        if (depth < 2) {
            for (const [nestedKey, nestedValue] of collectNestedUrlParams(value, depth + 1)) {
                add(nestedKey, nestedValue);
            }
        }
    }

    if (parsed.hash) {
        const hash = parsed.hash.replace(/^#/, '');
        const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash;
        for (const [key, value] of new URLSearchParams(hashQuery).entries()) {
            add(key, value);
        }
    }

    return params;
}

function collectNestedUrlParams(value, depth) {
    const decodedValues = [value];
    try { decodedValues.push(decodeURIComponent(value)); } catch {}

    for (const candidate of decodedValues) {
        if (!/^https?:\/\//i.test(candidate)) continue;
        try {
            return collectParams(new URL(candidate), depth);
        } catch {}
    }

    return new Map();
}

export function extractYoutubeContentIds(parsed) {
    const host = parsed.hostname.toLowerCase();
    const ids = {};
    if (host === 'youtu.be') {
        const id = parsed.pathname.split('/').filter(Boolean)[0];
        if (id) ids.video_id = id;
    }
    if (parsed.searchParams.get('v')) ids.video_id = parsed.searchParams.get('v');
    if (parsed.searchParams.get('list')) ids.playlist_id = parsed.searchParams.get('list');
    const shorts = parsed.pathname.match(/\/shorts\/([^/?#]+)/i);
    if (shorts) ids.video_id = shorts[1];
    const clip = parsed.pathname.match(/\/clip\/([^/?#]+)/i);
    if (clip) ids.clip_id = clip[1];
    return ids;
}

export function extractSpotifyContentIds(parsed) {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const [type, id] = parts;
    const ids = {};
    if (type && id) {
        ids.content_type = type;
        ids.content_id = id;
        ids.spotify_uri = `spotify:${type}:${id}`;
    }
    return ids;
}

export function isKnownHost(rawUrl, platform) {
    const host = safeUrl(rawUrl).hostname.toLowerCase();
    if (platform === 'youtube') return YOUTUBE_HOSTS.has(host) || host.endsWith('.youtube.com');
    if (platform === 'spotify') return SPOTIFY_HOSTS.has(host);
    return false;
}

export function decodeBranchReferrer(value) {
    const decoded = [];
    const candidates = [value];
    try { candidates.push(decodeURIComponent(value)); } catch {}

    for (const candidate of candidates) {
        const normalized = candidate.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        try {
            const raw = Buffer.from(padded, 'base64');
            for (const method of [gunzipSync, inflateSync]) {
                try {
                    const text = method(raw).toString('utf8');
                    if (text && !decoded.includes(text)) decoded.push(text);
                } catch {}
            }
            const plain = raw.toString('utf8');
            if (/^https?:\/\//i.test(plain) && !decoded.includes(plain)) decoded.push(plain);
        } catch {}
    }

    return decoded.length ? decoded : null;
}

export function removeParam(rawUrl, paramName) {
    const parsed = safeUrl(rawUrl);
    parsed.searchParams.delete(paramName);
    return parsed.toString();
}

export function setParam(rawUrl, paramName, value) {
    const parsed = safeUrl(rawUrl);
    parsed.searchParams.set(paramName, value);
    return parsed.toString();
}

export function mutateToken(value) {
    if (!value) return value;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const last = value[value.length - 1];
    const replacement = chars[(chars.indexOf(last) + 1 + chars.length) % chars.length] || 'A';
    return value.slice(0, -1) + replacement;
}

export function randomLike(value) {
    if (!value) return null;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const bytes = randomBytes(value.length);
    let out = '';
    for (let i = 0; i < value.length; i++) out += chars[bytes[i] % chars.length];
    return out;
}

export function primaryTrackingToken(tokens, platform) {
    if (platform === 'youtube') return ['si', 'pp'].find(k => tokens[k]);
    if (platform === 'spotify') return ['si', 'sp_cid', 'dlsi', 'branch_referrer', 'branch_match_id'].find(k => tokens[k]);
    return null;
}

export function decodeBase64UrlHex(value) {
    if (!value) return null;
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    try {
        const buffer = Buffer.from(padded, 'base64');
        if (!buffer.length) return null;
        return buffer.toString('hex');
    } catch {
        return null;
    }
}
