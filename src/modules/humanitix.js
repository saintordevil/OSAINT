// Humanitix event link parser.

import { cleanText, compactData, fetchHtml, firstJsonLdOfType, normalizeUrl, pathParts } from './_helpers.js';

export default async function humanitix(url) {
    try {
        const parsed = normalizeUrl(url, 'https://events.humanitix.com');
        if (!parsed || !/(?:^events\.humanitix\.com$|^www\.humanitix\.com$|^humanitix\.com$)/i.test(parsed.hostname)) {
            return { error: 'Invalid Humanitix event URL' };
        }

        const parts = pathParts(parsed);
        const slug = parsed.hostname.toLowerCase() === 'www.humanitix.com' && parts[0] === 'events' ? parts[1] : parts[0];
        if (!slug || (parts[0] === 'us' && parts[1] === 'events')) return { error: 'Invalid Humanitix event URL' };

        const data = { share_id: slug, event_id: slug, share_type: 'event-invite', profile_url: parsed.toString() };
        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            const event = firstJsonLdOfType(html, 'Event');
            const organizer = event?.organizer;
            if (typeof organizer === 'string') data.name = cleanText(organizer);
            else if (organizer?.name) data.name = cleanText(organizer.name);
            if (organizer?.url) data.profile_url = organizer.url;
            if (organizer?.image) data.avatar_url = organizer.image;
        }

        if (!data.name && !data.user_id) {
            return { error: 'Humanitix event page does not expose organizer identity data' };
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
