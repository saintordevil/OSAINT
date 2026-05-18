// Universe event link parser.

import { compactData, fetchHtml, firstJsonLdOfType, normalizeUrl, pathParts } from './_helpers.js';

export default async function universe(url) {
    try {
        const parsed = normalizeUrl(url, 'https://www.universe.com');
        if (!parsed || !/^(?:www\.)?universe\.com$/i.test(parsed.hostname)) return { error: 'Invalid Universe event URL' };

        const parts = pathParts(parsed);
        const slug = parts[0] === 'events' ? parts[1] : parts[0];
        const match = (slug || '').match(/^(.+)-tickets-([A-Za-z0-9]+)$/);
        if (!match) return { error: 'Invalid Universe event URL' };

        const data = { share_id: slug, event_id: match[2], share_type: 'event-invite', profile_url: parsed.toString() };
        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            const event = firstJsonLdOfType(html, 'Event');
            const organizer = event?.organizer;
            if (typeof organizer === 'string') data.name = organizer;
            else if (organizer?.name) data.name = organizer.name;
            if (organizer?.url) data.profile_url = organizer.url;
            if (organizer?.image) data.avatar_url = organizer.image;
        }

        if (!data.name && !data.user_id) {
            return { error: 'Universe event page does not expose organizer identity data' };
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
