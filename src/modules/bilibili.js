// Bilibili share link metadata reader
// Extracts sharer MID when app-generated share URLs include it.

import { fetchHtml, normalizeUrl } from './_helpers.js';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
};

function isBilibiliHost(hostname) {
    return hostname === 'bilibili.com' || hostname.endsWith('.bilibili.com') ||
        hostname === 'b23.tv' || hostname.endsWith('.b23.tv') ||
        hostname === 'bili2233.cn' || hostname.endsWith('.bili2233.cn');
}

function isShortHost(hostname) {
    return hostname === 'b23.tv' || hostname.endsWith('.b23.tv') ||
        hostname === 'bili2233.cn' || hostname.endsWith('.bili2233.cn');
}

function isContentPath(pathname) {
    return /^\/(?:video|bangumi\/play|read|opus|dynamic)\//i.test(pathname);
}

function collectParams(rawUrls) {
    const params = new Map();
    const seen = new Set();

    function addParam(key, value) {
        if (!key || value === null || value === undefined || value === '') return;
        const normalized = key.toLowerCase();
        if (!params.has(normalized)) params.set(normalized, String(value));
    }

    function addFromUrl(raw, depth = 0) {
        if (!raw || depth > 2) return;

        let decoded = String(raw);
        try { decoded = decodeURIComponent(decoded); } catch {}

        const seenKey = `${depth}:${decoded}`;
        if (seen.has(seenKey)) return;
        seen.add(seenKey);

        let parsed;
        try {
            parsed = new URL(decoded, 'https://www.bilibili.com');
        } catch {
            return;
        }

        for (const [key, value] of parsed.searchParams.entries()) {
            addParam(key, value);

            const nestedKey = key.toLowerCase();
            if (['url', 'shareurl', 'redirect_url', 'target_url'].includes(nestedKey)) {
                addFromUrl(value, depth + 1);
            }
        }
    }

    for (const raw of rawUrls) addFromUrl(raw);
    return params;
}

function getParam(params, key) {
    return params.get(key.toLowerCase()) || null;
}

function parseTimestamp(value) {
    if (!value || !/^\d{10,13}$/.test(value)) return null;
    const ms = value.length === 13 ? Number(value) : Number(value) * 1000;
    return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
}

function first(params, keys) {
    for (const key of keys) {
        const value = getParam(params, key);
        if (value) return value;
    }
    return null;
}

function parseBilibiliUrl(raw) {
    const parsed = normalizeUrl(raw, 'https://www.bilibili.com');
    if (!parsed) return null;
    if (!isBilibiliHost(parsed.hostname.toLowerCase())) return null;
    return parsed;
}

export default async function bilibili(url) {
    try {
        const initialUrl = parseBilibiliUrl(url);
        if (!initialUrl) {
            return { error: 'Invalid Bilibili share URL' };
        }

        const rawUrls = [url];
        const isShortUrl = isShortHost(initialUrl.hostname.toLowerCase());
        let hasContentUrl = isContentPath(initialUrl.pathname);

        if (isShortUrl) {
            try {
                const { res } = await fetchHtml(initialUrl, HEADERS, { allowedRedirectHosts: isBilibiliHost });
                if (res?.url && res.url !== initialUrl.toString()) {
                    rawUrls.push(res.url);
                    const resolved = parseBilibiliUrl(res.url);
                    if (resolved && isContentPath(resolved.pathname)) hasContentUrl = true;
                }
            } catch {
                // Short-link resolution can fail regionally; direct params still work.
            }
        }

        if (!isShortUrl && !hasContentUrl) {
            return { error: 'Bilibili URL is not a supported app share content link' };
        }

        const params = collectParams(rawUrls);
        const shareMid = getParam(params, 'share_mid');
        const appShareMid = hasContentUrl && first(params, ['mid', 'mid_from']);
        const sharerMid = shareMid || appShareMid;
        const shareMarkers = [
            'share_session_id', 'share_source', 'share_medium', 'share_plat',
            'unique_k', 'timestamp', 'vd_source',
        ];
        const hasShareMarker = shareMarkers.some(key => getParam(params, key));

        if (!hasContentUrl || !hasShareMarker || !/^[1-9]\d{0,19}$/.test(sharerMid || '')) {
            return { error: 'Bilibili URL does not include a validated app-share MID and companion marker' };
        }

        const data = {
            user_id: sharerMid,
            profile_url: `https://space.bilibili.com/${sharerMid}`,
            identity_confidence: 'unsigned_url_claim',
        };

        const shareToken = first(params, ['share_session_id', 'unique_k']);
        if (shareToken) data.share_token = shareToken;

        const shareSource = first(params, ['share_source', 'vd_source']);
        if (shareSource) data.share_source = shareSource;

        const buvid = first(params, ['buvid', 'h5_buvid']);
        if (buvid) data.device_id = buvid;

        const sharedAt = parseTimestamp(first(params, ['timestamp', 'ts']));
        if (sharedAt) data.shared_at = sharedAt;

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
