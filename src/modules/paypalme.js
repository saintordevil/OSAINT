// PayPal.Me profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl, pathParts } from './_helpers.js';

export default async function paypalme(url) {
    try {
        const parsed = normalizeUrl(url, 'https://paypal.me');
        if (!parsed || !/^(?:www\.)?paypal\.me$/i.test(parsed.hostname)) return { error: 'Invalid PayPal.Me URL' };

        const parts = pathParts(parsed);
        const handle = parts[0];
        if (parts.length !== 1 || !/^[A-Za-z0-9_.-]{2,64}$/.test(handle || '') || looksLikeReservedSlug(handle)) {
            return { error: 'Invalid PayPal.Me profile URL' };
        }

        const data = { username: handle, profile_url: `https://paypal.me/${handle}`, share_type: 'payment-profile' };
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
