// Suno music share link metadata reader
// Uses the public share API with a browser token
// Falls back to TLS-impersonated page fetch for OG metadata

import { fetch as tlsFetch, initTLS } from 'node-tls-client';

let _tlsReady = false;
async function ensureTLS() {
    if (!_tlsReady) { await initTLS(); _tlsReady = true; }
}

export default async function suno(url) {
    try {
        const match = url.match(/suno\.com\/s\/([\w-]+)/i);
        if (!match) return { error: 'Invalid Suno share URL' };

        const shareCode = match[1];
        await ensureTLS();

        // Try the share API with browser token
        const ts = Date.now();
        const innerToken = Buffer.from(JSON.stringify({ timestamp: ts })).toString('base64');
        const browserToken = Buffer.from(JSON.stringify({ token: innerToken })).toString('base64');

        const apiRes = await tlsFetch(`https://studio-api.prod.suno.com/api/share/code/${shareCode}`, {
            clientIdentifier: 'chrome_131',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'browser-token': browserToken,
            }
        });

        if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.success || json.sharer_handle) {
                const data = {};
                if (json.sharer_handle) {
                    data.username = json.sharer_handle;
                    data.profile_url = `https://suno.com/@${json.sharer_handle}/`;
                }
                if (json.sharer_display_name) data.name = json.sharer_display_name;
                if (json.sharer_avatar_url) data.avatar_url = json.sharer_avatar_url;
                if (Object.keys(data).length > 0) return { data };
            }
        }

        // Fallback: fetch the share page and check OG tags / embedded data
        const pageRes = await tlsFetch(`https://suno.com/s/${shareCode}`, {
            clientIdentifier: 'chrome_131',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
            }
        });

        if (pageRes.ok) {
            const html = await pageRes.text();
            const data = {};

            // Check for sharer data in page scripts
            const sharerHandle = html.match(/"sharer_handle"\s*:\s*"([^"]+)"/);
            if (sharerHandle) {
                data.username = sharerHandle[1];
                data.profile_url = `https://suno.com/@${sharerHandle[1]}/`;
            }
            const sharerName = html.match(/"sharer_display_name"\s*:\s*"([^"]+)"/);
            if (sharerName) data.name = sharerName[1];

            // Check OG tags
            const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
            if (ogTitle && !data.name) data.title = ogTitle[1];

            if (Object.keys(data).length > 0) return { data };
        }

        return { error: 'Could not extract sharer data - share link may have expired' };
    } catch (err) {
        return { error: err.message };
    }
}
