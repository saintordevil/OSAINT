// Cash App profile link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, looksLikeReservedSlug, normalizeUrl } from './_helpers.js';

export default async function cashapp(url) {
    try {
        const parsed = normalizeUrl(url, 'https://cash.app');
        if (!parsed || parsed.hostname.toLowerCase() !== 'cash.app') return { error: 'Invalid Cash App profile URL' };

        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length !== 1) return { error: 'Invalid Cash App profile URL' };

        if (!parts[0].startsWith('$')) return { error: 'Cash App URL must use the $cashtag payment profile form' };

        const cashtag = parts[0].slice(1);
        if (!/^[A-Za-z0-9_]{1,20}$/.test(cashtag) || looksLikeReservedSlug(cashtag)) {
            return { error: 'Invalid Cash App cashtag' };
        }

        const data = {
            cashtag,
            username: cashtag,
            profile_url: `https://cash.app/$${cashtag}`,
            share_type: 'payment-profile',
        };

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
