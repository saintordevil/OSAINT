// Venmo profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, normalizeUrl, pathParts } from './_helpers.js';

export default async function venmo(url) {
    try {
        const parsed = normalizeUrl(url, 'https://venmo.com');
        if (!parsed || !/^(?:www\.)?venmo\.com$/i.test(parsed.hostname)) return { error: 'Invalid Venmo profile URL' };

        const parts = pathParts(parsed);
        const data = { share_type: 'payment-profile' };

        const qrUserId = parsed.searchParams.get('user_id');
        if (parts[0] === 'code' && qrUserId && /^\d+$/.test(qrUserId)) {
            data.user_id = qrUserId;
        } else if (parts[0] === 'u' && /^[A-Za-z0-9_.-]{2,32}$/.test(parts[1] || '')) {
            data.username = parts[1];
            data.profile_url = `https://venmo.com/u/${parts[1]}`;
        } else {
            return { error: 'Invalid Venmo profile URL' };
        }

        const { html } = await fetchHtml(data.profile_url || parsed.toString()).catch(() => ({}));
        if (html) {
            data.name = extractMeta(html, 'og:title') || extractTitle(html);
            data.avatar_url = extractMeta(html, 'og:image');
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
