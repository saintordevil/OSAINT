// Linktree profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function linktree(url) {
    try {
        const parsed = normalizeUrl(url, 'https://linktr.ee');
        if (!parsed || !/^(?:www\.)?linktr\.ee$/i.test(parsed.hostname)) return { error: 'Invalid Linktree profile URL' };

        const handle = pathParts(parsed)[0];
        if (!/^[A-Za-z0-9_.-]{2,64}$/.test(handle || '') || looksLikeReservedSlug(handle)) {
            return { error: 'Invalid Linktree profile URL' };
        }

        const data = { username: handle, profile_url: `https://linktr.ee/${handle}`, share_type: 'profile-link' };
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
