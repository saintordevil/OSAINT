// YouCanBookMe booking link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, normalizeUrl } from './_helpers.js';

export default async function youcanbookme(url) {
    try {
        const parsed = normalizeUrl(url, 'https://example.youcanbook.me');
        if (!parsed || !parsed.hostname.toLowerCase().endsWith('.youcanbook.me')) {
            return { error: 'Invalid YouCanBookMe booking URL' };
        }

        const owner = parsed.hostname.split('.')[0];
        if (!/^[a-z0-9-]{2,63}$/i.test(owner) || owner === 'www') {
            return { error: 'Invalid YouCanBookMe booking URL' };
        }

        const data = { username: owner, profile_url: `https://${owner}.youcanbook.me`, share_type: 'booking-link' };
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
