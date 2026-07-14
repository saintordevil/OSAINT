// Acuity Scheduling link parser.

import { compactData, extractMeta, extractTitle, fetchHtml, normalizeUrl } from './_helpers.js';

export default async function acuity(url) {
    try {
        const parsed = normalizeUrl(url, 'https://app.acuityscheduling.com');
        if (!parsed || !/(?:^app\.acuityscheduling\.com$|\.as\.me$)/i.test(parsed.hostname)) {
            return { error: 'Invalid Acuity scheduling URL' };
        }

        const owner = parsed.searchParams.get('owner');
        if (!owner || !/^\d+$/.test(owner)) {
            return { error: 'Acuity URL does not include an owner account ID' };
        }

        const data = { user_id: owner, owner_id: owner, share_url: parsed.toString(), share_type: 'booking-link' };
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
