// SharePoint personal-site URLs expose an account-derived site slug. Underscore
// substitution is ambiguous, so any reconstructed email is only a candidate.

import { compactData, normalizeUrl } from './_helpers.js';

export default async function microsoft(url) {
    try {
        const parsed = normalizeUrl(url, 'https://example.sharepoint.com');
        const host = parsed?.hostname.toLowerCase() || '';
        if (!parsed || host === 'sharepoint.com' || !host.endsWith('.sharepoint.com')) {
            return { error: 'Invalid SharePoint personal share URL' };
        }

        const match = parsed.pathname.match(/^\/:([a-z]):\/(?:g\/personal|p)\/([A-Za-z0-9_]+)\/[^/?#]+/i);
        if (!match) return { error: 'Could not extract identity from SharePoint personal URL' };

        const siteSlug = match[2];
        const parts = siteSlug.split('_').filter(Boolean);
        let emailCandidate = null;
        if (parts.length >= 3) {
            const tld = parts.at(-1);
            const domain = parts.at(-2);
            const local = parts.slice(0, -2).join('.');
            emailCandidate = `${local}@${domain}.${tld}`;
        }

        return { data: compactData({
            site_slug: siteSlug,
            email_candidate: emailCandidate,
            email_confidence: emailCandidate ? 'heuristic' : null,
            identity_confidence: 'unsigned_url_claim',
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
