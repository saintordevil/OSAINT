// Microsoft Teams meeting invite parser.

import { compactData, normalizeUrl } from './_helpers.js';

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function teams(url) {
    try {
        const parsed = normalizeUrl(url, 'https://teams.microsoft.com');
        if (!parsed || parsed.hostname.toLowerCase() !== 'teams.microsoft.com') {
            return { error: 'Invalid Microsoft Teams meeting URL' };
        }

        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts[0] !== 'l' || parts[1] !== 'meetup-join' || !/^19%3ameeting_.+%40thread\.v2$/i.test(parts[2] || '')) {
            return { error: 'Teams URL does not contain a valid meeting thread ID' };
        }

        const contextRaw = parsed.searchParams.get('context');
        if (!contextRaw) return { error: 'Teams URL does not include organizer context' };

        let context;
        try {
            context = JSON.parse(contextRaw);
        } catch {
            context = JSON.parse(decodeURIComponent(contextRaw));
        }

        const tenantId = context.Tid || context.tid;
        const userId = context.Oid || context.oid;
        if (!GUID_RE.test(tenantId || '') || !GUID_RE.test(userId || '')) {
            return { error: 'Teams context does not include valid organizer and tenant IDs' };
        }

        return { data: compactData({
            user_id: userId,
            tenant_id: tenantId,
            meeting_id: decodeURIComponent(parts[2]),
            share_type: 'teams-meeting',
            share_source: 'embedded-context',
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
