// Telegram invite hashes are opaque server-side lookup values. Public invite
// checks can return chat metadata, but they do not expose the invite creator.

import { normalizeUrl } from './_helpers.js';

const TELEGRAM_HOSTS = new Set(['t.me', 'www.t.me', 'telegram.me', 'telegram.dog']);

export default async function telegram(url) {
    const parsed = normalizeUrl(url, 'https://t.me');
    if (!parsed || !TELEGRAM_HOSTS.has(parsed.hostname.toLowerCase()) ||
        !/^\/(?:joinchat\/|\+)[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)) {
        return { error: 'Invalid Telegram invite URL format' };
    }

    return {
        error: 'Telegram invite hashes are opaque and do not publicly encode the invite creator; no sharer identity can be extracted',
    };
}
