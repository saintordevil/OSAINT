// Ko-fi profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function kofi(url) {
    try {
        const parsed = normalizeUrl(url, 'https://ko-fi.com');
        if (!parsed || !/^(?:www\.)?ko-fi\.com$/i.test(parsed.hostname)) return { error: 'Invalid Ko-fi profile URL' };

        const handle = pathParts(parsed)[0];
        if (!/^[A-Za-z0-9_-]{2,64}$/.test(handle || '') || looksLikeReservedSlug(handle)) {
            return { error: 'Invalid Ko-fi profile URL' };
        }

        const data = { username: handle, profile_url: `https://ko-fi.com/${handle}`, share_type: 'support-profile' };
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
