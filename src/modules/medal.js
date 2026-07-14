// Medal.tv clip page parser.

import { compactData, extractJsonLd, fetchHtml, normalizeUrl } from './_helpers.js';

export default async function medal(url) {
    try {
        const parsed = normalizeUrl(url, 'https://medal.tv');
        if (!parsed || !/^(?:www\.)?medal\.tv$/i.test(parsed.hostname)) return { error: 'Invalid Medal.tv clip URL' };

        const match = parsed.pathname.match(/\/clips\/([A-Za-z0-9_-]{8,})/i);
        if (!match) return { error: 'Invalid Medal.tv clip URL' };

        const data = { share_id: match[1], clip_id: match[1], share_type: 'game-clip', share_url: parsed.toString() };
        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            const jsonLd = extractJsonLd(html).find(item => item?.author || item?.creator);
            const user = jsonLd?.author || jsonLd?.creator || {};
            data.name = user.name;
            data.avatar_url = user.image;
            data.user_id = user.identifier || user['@id'];
        }

        if (!data.user_id && !data.name && !data.avatar_url) {
            return { error: 'Medal.tv clip page does not expose poster identity data' };
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
