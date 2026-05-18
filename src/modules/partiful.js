// Partiful event invite parser.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

function extractNextData(html) {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
}

function findHosts(value, found = []) {
    if (!value || typeof value !== 'object') return found;
    if (Array.isArray(value)) {
        for (const item of value) findHosts(item, found);
        return found;
    }
    if ((value.hosts || value.hostUsers) && Array.isArray(value.hosts || value.hostUsers)) {
        found.push(...(value.hosts || value.hostUsers));
    }
    for (const child of Object.values(value)) findHosts(child, found);
    return found;
}

export default async function partiful(url) {
    try {
        const parsed = normalizeUrl(url, 'https://partiful.com');
        if (!parsed || !/^(?:www\.)?(?:partiful\.com|go\.partiful\.com)$/i.test(parsed.hostname)) return { error: 'Invalid Partiful event URL' };

        const match = parsed.pathname.match(/^\/e\/([A-Za-z0-9_-]+)/);
        if (!match) return { error: 'Invalid Partiful event URL' };

        const { html, error } = await fetchHtml(parsed);
        if (error) return { error };

        const nextData = extractNextData(html);
        const event = nextData?.props?.pageProps?.event;
        const host = findHosts(nextData).find(Boolean) ||
            event?.owners?.[0] ||
            (event?.createdBy?.id ? event.createdBy : null);
        if (!host) return { error: 'Partiful page does not expose host data' };

        const userId = host.id || host.userId;
        if (!userId && !host.name && !host.displayName) {
            return { error: 'Partiful page does not expose host identity data' };
        }

        return { data: compactData({
            share_id: match[1],
            event_id: match[1],
            share_type: 'event-invite',
            user_id: userId,
            name: host.name || host.displayName,
            avatar_url: host.profilePhoto || host.avatarUrl,
            instagram: host.instagram,
            twitter: host.twitter,
            host_count: event?.ownerIds?.length,
            profile_url: parsed.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
