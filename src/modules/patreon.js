// Patreon creator profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function patreon(url) {
    try {
        const parsed = normalizeUrl(url, 'https://patreon.com');
        if (!parsed || !/^(?:www\.)?patreon\.com$/i.test(parsed.hostname)) return { error: 'Invalid Patreon creator URL' };

        const parts = pathParts(parsed);
        const handle = parts[0] === 'c' ? parts[1] : parts[0];
        if (!/^[A-Za-z0-9_-]{2,64}$/.test(handle || '') || looksLikeReservedSlug(handle)) {
            return { error: 'Invalid Patreon creator URL' };
        }

        const data = { username: handle, profile_url: `https://patreon.com/${handle}`, share_type: 'creator-profile' };
        const { html } = await fetchHtml(data.profile_url).catch(() => ({}));
        if (html) {
            data.name = extractMeta(html, 'og:title') || extractTitle(html);
            data.avatar_url = extractMeta(html, 'og:image');
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
