// Eventbrite event page parser.

import { compactData, extractJsonLd, fetchHtml, normalizeUrl } from './_helpers.js';

function extractJson(html) {
    const match = html.match(/window\.__SERVER_DATA__\s*=\s*({[\s\S]*?});\s*<\/script>/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
}

export default async function eventbrite(url) {
    try {
        const parsed = normalizeUrl(url, 'https://www.eventbrite.com');
        if (!parsed || !/^(?:www\.)?eventbrite\.com$/i.test(parsed.hostname)) return { error: 'Invalid Eventbrite event URL' };

        const match = parsed.pathname.match(/\/e\/[^/]*-tickets-(\d+)/i);
        if (!match) return { error: 'Invalid Eventbrite event URL' };

        const eventId = match[1];
        const data = { event_id: eventId, share_id: eventId, share_type: 'event-invite', profile_url: parsed.toString() };

        const { html } = await fetchHtml(parsed).catch(() => ({}));
        if (html) {
            const json = extractJson(html);
            const ldEvent = extractJsonLd(html).find(item => item?.organizer);
            const organizer = json?.event?.organizer || json?.components?.eventInfo?.organizer || ldEvent?.organizer;
            if (organizer?.id) data.user_id = String(organizer.id);
            if (organizer?.name) data.name = organizer.name;
            if (organizer?.url) data.profile_url = organizer.url;
            if (organizer?.logo?.url) data.avatar_url = organizer.logo.url;
        }

        if (!data.user_id && !data.name) {
            return { error: 'Eventbrite event page does not expose organizer identity data' };
        }

        return { data: compactData(data) };
    } catch (err) {
        return { error: err.message };
    }
}
