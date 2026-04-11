// TikTok share link metadata reader
// Uses node-tls-client with mobile UA to extract sharer profile from shareUser data
// Key: TikTok only embeds sharer identity for mobile user agents, not desktop

import { COUNTRY_CODES } from '../utils.js';
import { fetch as tlsFetch, initTLS } from 'node-tls-client';

let _tlsReady = false;
async function ensureTLS() {
    if (!_tlsReady) { await initTLS(); _tlsReady = true; }
}

export default async function tiktok(url) {
    try {
        if (!/(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\//i.test(url)) {
            return { error: 'Invalid TikTok share URL' };
        }

        await ensureTLS();

        // MUST use mobile UA - TikTok only embeds shareUser data for mobile user agents
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        };

        // ── Step 1: Follow redirect to get tracking params ───────────────
        let finalUrl = url;
        let html = '';
        let hops = 0;
        while (hops < 5) {
            const res = await tlsFetch(finalUrl, {
                clientIdentifier: 'chrome_131',
                followRedirects: false,
                headers,
            });

            if (res.status >= 300 && res.status < 400) {
                const loc = res.headers?.Location?.[0] || res.headers?.location?.[0];
                if (!loc) break;
                finalUrl = loc.startsWith('http') ? loc : `https://www.tiktok.com${loc}`;
                hops++;
                continue;
            }

            if (res.ok) html = await res.text();
            break;
        }

        const data = {};

        // ── Step 2: Extract tracking params from redirect URL ────────────
        try {
            const u = new URL(finalUrl);

            // Old format
            const uCode = u.searchParams.get('u_code');
            if (uCode) data.share_token = uCode;

            const timestamp = u.searchParams.get('timestamp');
            if (timestamp) {
                data.shared_at = new Date(parseInt(timestamp) * 1000).toISOString().replace('T', ' ').slice(0, 19);
            }

            const utmSource = u.searchParams.get('utm_source');
            if (utmSource) data.share_method = utmSource;

            const utmCampaign = u.searchParams.get('utm_campaign');
            if (utmCampaign) data.share_source = utmCampaign;

            // New format (_t is the sharer tracking token)
            const tParam = u.searchParams.get('_t');
            if (tParam && !data.share_token) data.share_token = tParam;

        } catch { /* URL parse failed */ }

        // ── Step 3: Extract sharer profile from shareUser in page HTML ──
        // TikTok embeds the sharer's full profile in webapp.reflow.global.shareUser (mobile UA only)
        // Search for shareUser section and check statusCode
        const statusMatch = html.match(/"webapp\.reflow\.global\.shareUser"\s*:\s*\{[^]*?"statusCode"\s*:\s*(\d+)/);
        if (statusMatch) {
            const statusCode = parseInt(statusMatch[1]);

            if (statusCode === 0) {
                data.profile_sharing = 'Enabled';
                // Extract the shareUser profile object
                try {
                    const shareBlock = html.match(/"shareUser"\s*:\s*\{[^}]+\}/);
                    if (shareBlock) {
                        const cleaned = shareBlock[0].replace(/\\u002F/g, '/');
                        const jsonStr = cleaned.match(/"shareUser"\s*:\s*(\{[^}]+\})/);
                        if (jsonStr) {
                            const user = JSON.parse(jsonStr[1]);
                            if (user.uniqueId) {
                                data.username = user.uniqueId;
                                data.profile_url = `https://www.tiktok.com/@${user.uniqueId}`;
                            }
                            if (user.id) data.user_id = user.id;
                            if (user.nickname) data.name = user.nickname;
                            if (user.avatarLarger) data.avatar_url = user.avatarLarger.replace(/\\u002F/g, '/');
                            if (user.signature) data.signature = user.signature;
                            if (user.followerCount !== undefined) data.follower_count = user.followerCount;
                            if (user.followingCount !== undefined) data.following_count = user.followingCount;
                            if (user.videoCount !== undefined) data.video_count = user.videoCount;
                            if (user.heartCount !== undefined) data.heart_count = user.heartCount;
                            if (user.privateAccount !== undefined) data.private_account = user.privateAccount;
                        }
                    }
                } catch { /* JSON parse failed */ }
            } else {
                data.profile_sharing = 'Disabled';
            }
        }

        // Extract region/country from URL
        const regionMatch = (html.match(/share_region=([A-Z]{2})/i) || finalUrl.match(/share_region=([A-Z]{2})/i));
        if (regionMatch) {
            const code = regionMatch[1].toUpperCase();
            data.country = COUNTRY_CODES[code] || code;
        }

        if (Object.keys(data).length === 0) {
            return { error: 'Could not extract any metadata from this TikTok link' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
