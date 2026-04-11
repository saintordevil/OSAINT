// Substack referral link metadata reader
// Extracts the referring user from embedded page preloads
// Uses node-tls-client for TLS fingerprint impersonation

import { fetch as tlsFetch, initTLS } from 'node-tls-client';

let _tlsReady = false;
async function ensureTLS() {
    if (!_tlsReady) { await initTLS(); _tlsReady = true; }
}

export default async function substack(url) {
    try {
        if (!url.includes('?r=') && !url.includes('&r=')) {
            return { error: 'URL does not contain a referral parameter (?r=)' };
        }

        await ensureTLS();

        const res = await tlsFetch(url, {
            clientIdentifier: 'chrome_131',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Ch-Ua': '"Google Chrome";v="131"',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Dest': 'document',
            },
        });

        if (!res.ok) return { error: `Request failed with status ${res.status}` };

        const html = await res.text();

        // Extract preloads JSON
        const preloadMatch = html.match(/window\._preloads\s*=\s*JSON\.parse\("(.+?)"\)/s);
        if (!preloadMatch) return { error: 'Could not find preload data in page' };

        // Decode unicode escapes
        const decoded = preloadMatch[1]
            .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

        let preloads;
        try {
            preloads = JSON.parse(decoded);
        } catch {
            return { error: 'Failed to parse preload JSON' };
        }

        const referrer = preloads?.referringUser;
        if (!referrer) return { error: 'No referring user data found - referral may have expired' };

        const data = {};
        if (referrer.id) data.user_id = referrer.id;
        if (referrer.name) data.name = referrer.name;
        if (referrer.handle) {
            data.handle = referrer.handle;
            data.profile_url = `https://substack.com/@${referrer.handle}`;
        }
        if (referrer.previous_name) data.previous_name = referrer.previous_name;
        if (referrer.photo_url) data.photo_url = referrer.photo_url;
        if (referrer.bio) data.bio = referrer.bio;
        if (referrer.profile_set_up_at) data.profile_set_up_at = referrer.profile_set_up_at;

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
