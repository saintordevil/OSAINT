// Partiful event invite parser.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

function extractNextData(html) {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
}

function hostId(host) {
    return host?.id || host?.userId || host?.api_id || null;
}

function selectEventHost(pageProps) {
    const event = pageProps?.event;
    if (!event || typeof event !== 'object') return null;

    const candidates = [
        ...(Array.isArray(pageProps.hosts) ? pageProps.hosts : []),
        ...(Array.isArray(event.hosts) ? event.hosts : []),
        ...(Array.isArray(event.hostUsers) ? event.hostUsers : []),
        ...(Array.isArray(event.owners) ? event.owners : []),
        event.createdBy,
    ].filter(Boolean);
    const ownerIds = new Set([
        ...(Array.isArray(event.ownerIds) ? event.ownerIds : []),
        hostId(event.createdBy),
    ].filter(Boolean).map(String));

    if (ownerIds.size) return candidates.find(candidate => ownerIds.has(String(hostId(candidate)))) || null;
    return event.createdBy || event.owners?.[0] || null;
}

export default async function partiful(url) {
    try {
        const parsed = normalizeUrl(url, 'https://partiful.com');
        if (!parsed || parsed.protocol !== 'https:' || !/^(?:www\.)?(?:partiful\.com|go\.partiful\.com)$/i.test(parsed.hostname)) return { error: 'Invalid Partiful event URL' };

        const { html, error, res } = await fetchHtml(parsed, {}, {
            allowedRedirectHosts: host => /^(?:www\.)?(?:partiful\.com|go\.partiful\.com)$/i.test(host),
        });
        if (error) return { error };

        const resolved = normalizeUrl(res?.url || parsed.toString());
        if (!resolved || resolved.protocol !== 'https:' || !/^(?:www\.)?partiful\.com$/i.test(resolved.hostname)) {
            return { error: 'Partiful link resolved to an unexpected host' };
        }
        const match = resolved.pathname.match(/^\/e\/([A-Za-z0-9_-]+)/);
        if (!match) return { error: 'Invalid Partiful event URL' };

        const nextData = extractNextData(html);
        const pageProps = nextData?.props?.pageProps;
        const event = pageProps?.event;
        const host = selectEventHost(pageProps);
        if (!host) return { error: 'Partiful page does not expose host data' };

        const userId = hostId(host);
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
            share_url: resolved.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
