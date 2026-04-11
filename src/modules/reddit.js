// Reddit mobile share link analyzer
// Reddit's app generates /r/<sub>/s/<share-id> tracking URLs
// Uses TLS impersonation to follow redirects and extract sharer data

import { fetch as tlsFetch, initTLS } from 'node-tls-client';

let _tlsReady = false;
async function ensureTLS() {
    if (!_tlsReady) { await initTLS(); _tlsReady = true; }
}

export default async function reddit(url) {
    try {
        const shareMatch = url.match(/reddit\.com\/r\/([\w]+)\/s\/([\w]+)/i);
        if (!shareMatch) {
            return { error: 'Only Reddit mobile share links (/r/<sub>/s/<id>) are supported' };
        }

        const data = {};
        data.subreddit = shareMatch[1];
        data.share_token = shareMatch[2];

        await ensureTLS();

        // Follow the redirect chain with TLS impersonation
        const res = await tlsFetch(url, {
            clientIdentifier: 'chrome_131',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html',
            },
        });

        if (res.ok) {
            const html = await res.text();

            // Look for sharer username in page data
            const sharedBy = html.match(/"sharedByUser"\s*:\s*"([^"]+)"/);
            if (sharedBy) data.username = sharedBy[1];

            // Try alternate patterns
            const authorFlair = html.match(/"authorFlair[^"]*".*?"author"\s*:\s*"([^"]+)"/);
            if (authorFlair && !data.username) data.username = authorFlair[1];

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
        const finalUrl = res.url || '';
        const sidMatch = finalUrl.match(/[?&]sid=([\w-]+)/);
        if (sidMatch) data.share_token = sidMatch[1];

        if (Object.keys(data).length <= 2) {
            // Only have subreddit + share_token, no identity found
            return { error: 'Could not extract sharer identity from this Reddit share link' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
