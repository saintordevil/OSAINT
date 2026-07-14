// Pinterest short link metadata reader
// Follows the redirect to get invite code, then queries metadata API
// Uses node-tls-client for TLS fingerprint impersonation

import { createTlsDeadline, getHeader, tlsFetch } from './_tls.js';
import { normalizeUrl } from './_helpers.js';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export default async function pinterest(url) {
    try {
        const parsed = normalizeUrl(url, 'https://pin.it');
        const host = parsed?.hostname.toLowerCase();
        const match = ['pin.it', 'www.pin.it'].includes(host) ? parsed.pathname.match(/^\/([\w]+)\/?$/i) : null;
        if (!match) return { error: 'Invalid Pinterest short URL' };

        const shortCode = match[1];
        const remainingTimeout = createTlsDeadline();
        // Step 1: Follow redirect to get invite code
        const redirectRes = await tlsFetch(`https://api.pinterest.com/url_shortener/${shortCode}/redirect/`, {
            followRedirects: false,
            headers: { 'User-Agent': UA },
            timeoutMs: remainingTimeout(),
        });

        const location = getHeader(redirectRes.headers, 'location');
        if (!location) return { error: 'No redirect location found' };

        // Extract invite code and pin ID from redirect URL
        const inviteMatch = location.match(/invite_code=([a-f0-9]+)/);
        const pinMatch = location.match(/\/pin\/(\d+)/);

        if (!inviteMatch) return { error: 'No invite code in redirect - link may not be a share link (only sent pins contain invite codes)' };

        const inviteCode = inviteMatch[1];
        const pinId = pinMatch ? pinMatch[1] : '0';

        // Step 2: Query invite metadata API
        const params = new URLSearchParams({
            'source_url': `/pin/${pinId}/sent/?invite_code=${inviteCode}`,
            'data': JSON.stringify({options: {invite_code: inviteCode, field_set_key: 'default'}, context: {}}),
            '_': String(Date.now()),
        });

        const apiRes = await tlsFetch(`https://www.pinterest.com/resource/InviteCodeMetadataResource/get/?${params}`, {
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Pinterest-AppState': 'active',
                'X-Pinterest-Pws-Handler': 'www/pin/[id]/sent.js',
                'X-Pinterest-Source-Url': `/pin/${pinId}/sent/?invite_code=${inviteCode}`,
                'Referer': 'https://www.pinterest.com/',
            },
            timeoutMs: remainingTimeout(),
        });

        if (!apiRes.ok) return { error: `Pinterest API returned ${apiRes.status}` };

        const json = await apiRes.json();
        const sender = json?.resource_response?.data?.sender;
        if (!sender) return { error: 'No sender data in invite metadata' };

        const data = {};
        if (sender.username) {
            data.username = sender.username;
            data.profile_url = `https://www.pinterest.com/${sender.username}/`;
        }
        if (sender.id) data.user_id = sender.id;
        if (sender.full_name) data.name = sender.full_name;
        if (sender.image_large_url) data.avatar_url = sender.image_large_url;

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
