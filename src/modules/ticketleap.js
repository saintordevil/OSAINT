// TicketLeap event link parser.

import { compactData, normalizeUrl, pathParts } from './_helpers.js';

export default async function ticketleap(url) {
    try {
        const parsed = normalizeUrl(url, 'https://ticketleap.events');
        if (!parsed || !/^(?:www\.)?ticketleap\.events$/i.test(parsed.hostname)) return { error: 'Invalid TicketLeap event URL' };

        const parts = pathParts(parsed);
        if (parts[0] !== 'tickets' || !parts[1] || !parts[2]) return { error: 'Invalid TicketLeap event URL' };

        const data = {
            username: parts[1],
            user_id: parts[1],
            event_id: parts.slice(2).join('/'),
            profile_url: `https://ticketleap.events/tickets/${parts[1]}`,
            share_type: 'event-invite',
        };

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
