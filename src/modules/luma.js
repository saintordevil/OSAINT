// Lu.ma event page parser.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

function extractInitialData(html) {
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextMatch) {
        try {
            return JSON.parse(nextMatch[1])?.props?.pageProps?.initialData || null;
        } catch {}
    }

    const match = html.match(/initialData\s*=\s*({[\s\S]*?})\s*<\/script>/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
}

function findHosts(value, found = []) {
    if (!value || typeof value !== 'object') return found;
    if (Array.isArray(value)) {
        for (const item of value) findHosts(item, found);
        return found;
    }
    if (Array.isArray(value.hosts)) found.push(...value.hosts);
    for (const child of Object.values(value)) findHosts(child, found);
    return found;
}

export default async function luma(url) {
    try {
        const parsed = normalizeUrl(url, 'https://lu.ma');
        if (!parsed || !/^(?:www\.)?(?:lu\.ma|luma\.com)$/i.test(parsed.hostname)) return { error: 'Invalid Lu.ma event URL' };
        if (/^\/u\//i.test(parsed.pathname)) return { error: 'Lu.ma URL is not an event URL' };

        const slug = parsed.pathname.split('/').filter(Boolean)[0];
        if (!slug || slug.length < 4) return { error: 'Invalid Lu.ma event URL' };

        const { html, error } = await fetchHtml(parsed);
        if (error) return { error };

        const initialData = extractInitialData(html);
        if (initialData?.kind && initialData.kind !== 'event') return { error: 'Lu.ma URL is not an event URL' };

        const host = findHosts(initialData).find(Boolean);
        if (!host) return { error: 'Lu.ma event page does not expose host data' };

        return { data: compactData({
            share_id: initialData?.data?.event?.api_id || slug,
            event_id: initialData?.data?.event?.api_id || slug,
            share_type: 'event-invite',
            user_id: host.api_id || host.id,
            name: host.name,
            avatar_url: host.avatar_url,
            twitter: host.twitter_handle,
            website: host.website,
            profile_url: parsed.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
