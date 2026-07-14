// Reddit mobile share link analyzer
// Reddit's app generates /r/<sub>/s/<share-id> tracking URLs
// Uses TLS impersonation to follow redirects and extract sharer data

import { createTlsDeadline, getHeader, tlsFetch } from './_tls.js';
import { normalizeUrl } from './_helpers.js';

const REDDIT_HOSTS = new Set(['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export default async function reddit(url) {
    try {
        const parsedUrl = normalizeUrl(url, 'https://www.reddit.com');

        if (!parsedUrl || parsedUrl.protocol !== 'https:' || !REDDIT_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
            return { error: 'Invalid Reddit share URL' };
        }

        const shareMatch = parsedUrl.pathname.match(/^\/r\/([A-Za-z0-9_]+)\/s\/([A-Za-z0-9_-]+)\/?$/i);
        if (!shareMatch) {
            return { error: 'Only Reddit mobile share links (/r/<sub>/s/<id>) are supported' };
        }

        const data = {};
        data.subreddit = shareMatch[1];
        data.share_token = shareMatch[2];

        const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html',
        };
        let currentUrl = parsedUrl;
        let res;
        const remainingTimeout = createTlsDeadline();
        for (let redirects = 0; redirects <= 5; redirects++) {
            res = await tlsFetch(currentUrl.href, {
                followRedirects: false,
                headers,
                timeoutMs: remainingTimeout(),
            });
            if (!REDIRECT_STATUSES.has(res.status)) break;

            const location = getHeader(res.headers, 'location');
            if (!location) return { error: `Reddit redirect response ${res.status} had no Location header` };
            if (redirects === 5) return { error: 'Reddit redirect limit exceeded (5)' };

            const next = normalizeUrl(new URL(location, currentUrl).href);
            if (!next || next.protocol !== 'https:' || !REDDIT_HOSTS.has(next.hostname.toLowerCase())) {
                return { error: 'Reddit share link redirected to an unexpected host' };
            }
            currentUrl = next;
        }

        if (res.ok) {
            const html = await res.text();

            // Look for sharer username in page data
            const sharedBy = html.match(/"sharedByUser"\s*:\s*"([^"]+)"/);
            if (sharedBy) data.username = sharedBy[1];

            // Extract the resolved post URL from canonical
            const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
            if (canonical) {
                data.resolved_url = canonical[1];
                const postMatch = canonical[1].match(/comments\/([\w]+)/);
                if (postMatch) data.post_id = postMatch[1];
            }

            // Check for the "shared by" prompt in JSON data
            const shareContext = html.match(/"shareContext"\s*:\s*\{[^}]*"user(?:name|Name)"\s*:\s*"([^"]+)"/);
            if (shareContext && !data.username) data.username = shareContext[1];
        }

        // Also check the redirect URL itself for tracking
        const finalUrl = currentUrl.href;
        const sidMatch = finalUrl.match(/[?&]sid=([\w-]+)/);
        if (sidMatch) data.share_token = sidMatch[1];

        if (!data.username) {
            return { error: 'Could not extract sharer identity from this Reddit share link' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
