// Buy Me a Coffee profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function buymeacoffee(url) {
    try {
        const parsed = normalizeUrl(url, 'https://buymeacoffee.com');
        if (!parsed || !/^(?:www\.)?buymeacoffee\.com$/i.test(parsed.hostname)) return { error: 'Invalid Buy Me a Coffee profile URL' };

        const handle = pathParts(parsed)[0];
        if (!/^[A-Za-z0-9_-]{2,64}$/.test(handle || '') || looksLikeReservedSlug(handle)) {
            return { error: 'Invalid Buy Me a Coffee profile URL' };
        }

        const data = { username: handle, profile_url: `https://buymeacoffee.com/${handle}`, share_type: 'support-profile' };
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
