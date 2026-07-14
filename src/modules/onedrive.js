// OneDrive personal share URL parser.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

export default async function onedrive(url) {
    try {
        const parsed = normalizeUrl(url, 'https://onedrive.live.com');
        if (!parsed) return { error: 'Invalid OneDrive personal share URL with owner CID' };

        const host = parsed.hostname.toLowerCase();
        if (host !== 'onedrive.live.com' && host !== '1drv.ms') {
            return { error: 'Invalid OneDrive personal share URL with owner CID' };
        }

        let resolved = parsed;
        const modernShortMatch = host === '1drv.ms'
            ? parsed.pathname.match(/^\/[a-z]\/(?:c)\/([a-f0-9]{8,32})\/[^/?#]+/i)
            : null;

        if (host === '1drv.ms' && !modernShortMatch) {
            const fetched = await fetchHtml(parsed, {}, {
                allowedRedirectHosts: ['1drv.ms', 'onedrive.live.com'],
            });
            if (fetched.error || !fetched.res?.url) {
                return { error: fetched.error || 'OneDrive short link did not resolve' };
            }
            resolved = normalizeUrl(fetched.res.url);
            if (!resolved || resolved.hostname.toLowerCase() !== 'onedrive.live.com') {
                return { error: 'OneDrive short link resolved to an unexpected host' };
            }
        }

        const resourceParam = resolved.searchParams.get('resid') || resolved.searchParams.get('id');
        const delimitedResource = (resourceParam || '').match(/^([a-f0-9]{8,32})![^!]+$/i);
        const hasResourcePath = /^\/.+/.test(resourceParam || '');
        const queryCid = resolved.searchParams.get('cid') || '';
        const resolvedPathMatch = resolved.hostname.toLowerCase() === 'onedrive.live.com'
            ? resolved.pathname.match(/^\/:?[a-z]:\/g\/personal\/([a-f0-9]{8,32})\/[^/?#]+/i)
            : null;
        const cid = modernShortMatch?.[1] ||
            resolvedPathMatch?.[1] ||
            delimitedResource?.[1] ||
            (hasResourcePath && /^[a-f0-9]{8,32}$/i.test(queryCid) ? queryCid : null);

        if (!cid || !/^[a-f0-9]{8,32}$/i.test(cid) || (!modernShortMatch && !resolvedPathMatch && !resourceParam)) {
            return { error: 'Invalid OneDrive personal share URL with owner CID' };
        }

        return { data: compactData({
            user_id: cid.toUpperCase(),
            owner_id: cid.toUpperCase(),
            profile_url: `https://onedrive.live.com/?cid=${cid.toUpperCase()}`,
            share_type: 'onedrive-share',
            identity_confidence: 'unsigned_url_claim',
            resolved_url: resolved.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
