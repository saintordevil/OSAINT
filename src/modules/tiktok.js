// TikTok share link metadata reader
// Uses node-tls-client with mobile UA to extract sharer profile from shareUser data
// Key: TikTok only embeds sharer identity for mobile user agents, not desktop

import { COUNTRY_CODES } from '../utils.js';
import { extractJsonObjects, normalizeUrl } from './_helpers.js';
import { createTlsDeadline, getHeader, tlsFetch } from './_tls.js';

const TIKTOK_HOSTS = new Set([
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
]);
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function parseTikTokUrl(value) {
    const parsed = normalizeUrl(value, 'https://www.tiktok.com');
    if (!parsed) throw new Error('Invalid TikTok share URL');
    if (parsed.protocol !== 'https:' || !TIKTOK_HOSTS.has(parsed.hostname.toLowerCase())) {
        throw new Error('Invalid TikTok share URL');
    }
    return parsed;
}

export function selectTikTokShareUser(html) {
    const envelope = extractJsonObjects(html, 'webapp.reflow.global.shareUser')[0];
    const statusCode = Number(envelope?.statusCode);
    const candidates = [envelope?.shareUser, envelope?.user, envelope];
    const user = candidates.find(candidate => candidate && typeof candidate === 'object' &&
        (candidate.uniqueId || candidate.id || candidate.nickname));
    return { envelope, statusCode, user };
}

export default async function tiktok(url) {
    try {
        let initialUrl;
        try {
            initialUrl = parseTikTokUrl(url);
        } catch {
            return { error: 'Invalid TikTok share URL' };
        }

        const isShortHost = ['vm.tiktok.com', 'vt.tiktok.com'].includes(initialUrl.hostname.toLowerCase());
        if (!isShortHost && !initialUrl.pathname.startsWith('/t/')) {
            return { error: 'Invalid TikTok share URL' };
        }

        // MUST use mobile UA - TikTok only embeds shareUser data for mobile user agents
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        };

        // ── Step 1: Follow redirect to get tracking params ───────────────
        let finalUrl = initialUrl.href;
        let html = '';
        const remainingTimeout = createTlsDeadline();
        for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
            const res = await tlsFetch(finalUrl, {
                followRedirects: false,
                headers,
                timeoutMs: remainingTimeout(),
            });

            if (REDIRECT_STATUSES.has(res.status)) {
                const loc = getHeader(res.headers, 'location');
                if (!loc) break;
                if (redirects === MAX_REDIRECTS) {
                    return { error: `TikTok redirect limit exceeded (${MAX_REDIRECTS})` };
                }

                try {
                    finalUrl = parseTikTokUrl(new URL(loc, finalUrl).href).href;
                } catch {
                    return { error: 'TikTok redirected to an unexpected host' };
                }
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
        const { statusCode, user } = selectTikTokShareUser(html);
        if (Number.isFinite(statusCode)) {

            if (statusCode === 0) {
                data.profile_sharing = 'Enabled';
                if (user?.uniqueId) {
                    data.username = user.uniqueId;
                    data.profile_url = `https://www.tiktok.com/@${user.uniqueId}`;
                }
                if (user?.id) data.user_id = user.id;
                if (user?.nickname) data.name = user.nickname;
                if (user?.avatarLarger) data.avatar_url = user.avatarLarger.replace(/\\u002F/g, '/');
                if (user?.signature) data.signature = user.signature;
                if (user?.followerCount !== undefined) data.follower_count = user.followerCount;
                if (user?.followingCount !== undefined) data.following_count = user.followingCount;
                if (user?.videoCount !== undefined) data.video_count = user.videoCount;
                if (user?.heartCount !== undefined) data.heart_count = user.heartCount;
                if (user?.privateAccount !== undefined) data.private_account = user.privateAccount;
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

        if (!['user_id', 'username', 'name', 'profile_url'].some(field => data[field])) {
            return { error: 'TikTok did not expose a sharer identity for this link' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
