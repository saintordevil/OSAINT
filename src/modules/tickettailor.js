// Ticket Tailor event/box-office link parser.
// Ticket Tailor URLs expose the event creator's box-office slug.

import { compactData, normalizeUrl, pathParts } from './_helpers.js';

function parse(rawUrl) {
    const parsed = normalizeUrl(rawUrl, 'https://www.tickettailor.com');
    if (!parsed) return null;

    const host = parsed.hostname.toLowerCase();
    const parts = pathParts(parsed);
    if (/^(?:www\.)?tickettailor\.com$/.test(host) && parts[0] === 'events' && parts[1]) {
        return { parsed, boxOffice: parts[1], eventId: parts[2] || null };
    }
    if (host === 'buytickets.at' && parts[0]) {
        return { parsed, boxOffice: parts[0], eventId: parts[1] || null };
    }
    return null;
}

export default async function tickettailor(url) {
    try {
        const parsed = parse(url);
        if (!parsed) return { error: 'Invalid Ticket Tailor event or box-office URL' };

        const data = {
            share_type: 'event-invite',
            username: parsed.boxOffice,
            user_id: parsed.boxOffice,
            box_office: parsed.boxOffice,
            profile_url: `https://www.tickettailor.com/events/${parsed.boxOffice}`,
            event_id: parsed.eventId,
        };

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
