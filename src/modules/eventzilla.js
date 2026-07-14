// Eventzilla event link parser.

import { compactData, fetchHtml, firstJsonLdOfType, normalizeUrl, pathParts } from './_helpers.js';

export default async function eventzilla(url) {
    try {
        const parsed = normalizeUrl(url, 'https://www.eventzilla.net');
        if (!parsed || !/^(?:www\.)?eventzilla\.net$/i.test(parsed.hostname)) return { error: 'Invalid Eventzilla event URL' };

        const parts = pathParts(parsed);
        if (parts[0] !== 'e' || !parts[1]) return { error: 'Invalid Eventzilla event URL' };

        const idMatch = parts[1].match(/-(\d{6,})$/);
        const data = { share_id: idMatch?.[1] || parts[1], event_id: idMatch?.[1], share_type: 'event-invite', share_url: parsed.toString() };

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
            return { error: 'Eventzilla event page does not expose organizer identity data' };
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
