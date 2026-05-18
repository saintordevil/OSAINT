// Cal.com booking link parser.

import { cleanText, compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function calcom(url) {
    try {
        const parsed = normalizeUrl(url, 'https://cal.com');
        if (!parsed || !/^(?:www\.)?cal\.com$/i.test(parsed.hostname)) return { error: 'Invalid Cal.com booking URL' };

        const parts = pathParts(parsed);
        const owner = parts[0] === 'team' ? parts[1] : parts[0];
        const event = parts[0] === 'team' ? parts[2] : parts[1];
        if (!/^[A-Za-z0-9_-]{2,64}$/.test(owner || '') || looksLikeReservedSlug(owner)) {
            return { error: 'Invalid Cal.com booking URL' };
        }

        const data = { username: owner, profile_url: `https://cal.com/${owner}`, booking_id: event, share_type: 'booking-link' };
        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            data.name = cleanText(extractMeta(html, 'og:title') || extractTitle(html));
            data.avatar_url = extractMeta(html, 'og:image');
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
