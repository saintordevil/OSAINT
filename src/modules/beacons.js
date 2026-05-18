// Beacons profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function beacons(url) {
    try {
        const parsed = normalizeUrl(url, 'https://beacons.ai');
        if (!parsed || !/^(?:www\.)?beacons\.ai$/i.test(parsed.hostname)) return { error: 'Invalid Beacons profile URL' };

        const handle = pathParts(parsed)[0];
        if (!/^[A-Za-z0-9_.-]{2,64}$/.test(handle || '') || looksLikeReservedSlug(handle)) {
            return { error: 'Invalid Beacons profile URL' };
        }

        const data = { username: handle, profile_url: `https://beacons.ai/${handle}`, share_type: 'profile-link' };
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
