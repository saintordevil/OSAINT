// Lu.ma event page parser.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

const LUMA_HOSTS = new Set(['lu.ma', 'www.lu.ma', 'luma.com', 'www.luma.com']);

function isLumaHost(hostname) {
    return LUMA_HOSTS.has(String(hostname || '').toLowerCase());
}

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

function hostId(host) {
    return host?.api_id || host?.id || host?.user_api_id || null;
}

function selectEventHost(initialData) {
    const data = initialData?.data;
    const event = data?.event;
    if (!event || typeof event !== 'object') return null;

    const candidates = [
        ...(Array.isArray(event.hosts) ? event.hosts : []),
        ...(Array.isArray(event.hostUsers) ? event.hostUsers : []),
        ...(Array.isArray(event.owners) ? event.owners : []),
        ...(Array.isArray(data.hosts) ? data.hosts : []),
        event.createdBy,
    ].filter(Boolean);
    const ownerIds = new Set([
        event.user_api_id,
        event.owner_api_id,
        event.creator_api_id,
        ...(Array.isArray(event.host_ids) ? event.host_ids : []),
        ...(Array.isArray(event.ownerIds) ? event.ownerIds : []),
        hostId(event.createdBy),
    ].filter(Boolean).map(String));

    if (ownerIds.size) return candidates.find(candidate => ownerIds.has(String(hostId(candidate)))) || null;
    return event.createdBy || event.owners?.[0] || event.hosts?.[0] || null;
}

export default async function luma(url) {
    try {
        const parsed = normalizeUrl(url, 'https://lu.ma');
        if (!parsed || parsed.protocol !== 'https:' || !isLumaHost(parsed.hostname)) return { error: 'Invalid Lu.ma event URL' };
        if (/^\/u\//i.test(parsed.pathname)) return { error: 'Lu.ma URL is not an event URL' };

        const slug = parsed.pathname.split('/').filter(Boolean)[0];
        if (!slug || slug.length < 4) return { error: 'Invalid Lu.ma event URL' };

        const { html, error, res } = await fetchHtml(parsed, {}, { allowedRedirectHosts: isLumaHost });
        if (error) return { error };

        const resolved = normalizeUrl(res?.url || parsed.href);
        if (!resolved || resolved.protocol !== 'https:' || !isLumaHost(resolved.hostname)) {
            return { error: 'Lu.ma event link resolved to an unexpected host' };
        }

        const initialData = extractInitialData(html);
        if (initialData?.kind && initialData.kind !== 'event') return { error: 'Lu.ma URL is not an event URL' };

        const host = selectEventHost(initialData);
        if (!host) return { error: 'Lu.ma event page does not expose host data' };

        return { data: compactData({
            share_id: initialData?.data?.event?.api_id || slug,
            event_id: initialData?.data?.event?.api_id || slug,
            share_type: 'event-invite',
            user_id: hostId(host),
            name: host.name,
            avatar_url: host.avatar_url,
            twitter: host.twitter_handle,
            website: host.website,
            share_url: resolved.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
