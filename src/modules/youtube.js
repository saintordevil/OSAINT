// YouTube clip page parser.

import { cleanText, compactData, extractMeta, normalizeUrl } from './_helpers.js';

function extractString(html, key) {
    const match = html.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
    if (!match) return null;
    try { return JSON.parse(`"${match[1]}"`); } catch { return match[1]; }
}

export default async function youtube(url) {
    try {
        const parsed = normalizeUrl(url, 'https://www.youtube.com');
        if (!/^(?:www\.|m\.)?youtube\.com$/i.test(parsed.hostname) || !parsed.pathname.startsWith('/clip/')) {
            return { error: 'Only YouTube clip URLs are supported; normal watch, Shorts, and si links do not expose sharer data' };
        }

        const clipId = parsed.pathname.split('/').filter(Boolean)[1];
        if (!clipId) return { error: 'Invalid YouTube clip URL' };

        const res = await fetch(parsed.toString(), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!res.ok) return { error: `YouTube clip page returned HTTP ${res.status}` };

        const html = await res.text();
        const description = extractMeta(html, 'description') || '';
        const clippedBy = description.match(/Clipped by\s+(.+?)\s+·\s+Original video/i)?.[1] ||
            html.match(/Clipped by\s*([^<"·]+)/i)?.[1];
        const name = cleanText(clippedBy || extractString(html, 'clipAttributionRenderer'));
        if (!name) return { error: 'YouTube clip page does not expose clipper data' };

        return { data: compactData({
            clip_id: clipId,
            share_type: 'clip',
            name,
            profile_url: parsed.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
