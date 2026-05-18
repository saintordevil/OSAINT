// Meetup event link parser.

import { compactData, fetchHtml, firstJsonLdOfType, normalizeUrl, pathParts } from './_helpers.js';

export default async function meetup(url) {
    try {
        const parsed = normalizeUrl(url, 'https://www.meetup.com');
        if (!parsed || !/^(?:www\.)?meetup\.com$/i.test(parsed.hostname)) return { error: 'Invalid Meetup event URL' };

        const parts = pathParts(parsed);
        const eventsIndex = parts.indexOf('events');
        if (eventsIndex !== 1 || !parts[0] || !/^\d{5,20}$/.test(parts[2] || '')) {
            return { error: 'Invalid Meetup event URL' };
        }

        const data = {
            username: parts[0],
            user_id: parts[0],
            event_id: parts[2],
            profile_url: `https://www.meetup.com/${parts[0]}/`,
            share_type: 'event-invite',
        };

        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            const event = firstJsonLdOfType(html, 'Event');
            if (event?.organizer?.name) data.name = event.organizer.name;
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
