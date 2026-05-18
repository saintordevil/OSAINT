// SavvyCal booking link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function savvycal(url) {
    try {
        const parsed = normalizeUrl(url, 'https://savvycal.com');
        if (!parsed || !/^(?:www\.)?savvycal\.com$/i.test(parsed.hostname)) return { error: 'Invalid SavvyCal booking URL' };

        const parts = pathParts(parsed);
        const owner = parts[0];
        if (!/^[A-Za-z0-9_-]{2,64}$/.test(owner || '') || looksLikeReservedSlug(owner)) {
            return { error: 'Invalid SavvyCal booking URL' };
        }

        const data = { username: owner, profile_url: `https://savvycal.com/${owner}`, booking_id: parts[1], share_type: 'booking-link' };
        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            data.name = extractMeta(html, 'og:title') || extractTitle(html);
            data.avatar_url = extractMeta(html, 'og:image');
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
