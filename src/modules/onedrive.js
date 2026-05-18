// OneDrive personal share URL parser.

import { compactData, normalizeUrl } from './_helpers.js';

export default async function onedrive(url) {
    try {
        const parsed = normalizeUrl(url, 'https://onedrive.live.com');
        if (!parsed) return { error: 'Invalid OneDrive personal share URL with owner CID' };

        const host = parsed.hostname.toLowerCase();
        if (host !== 'onedrive.live.com' && host !== '1drv.ms') {
            return { error: 'Invalid OneDrive personal share URL with owner CID' };
        }

        const cid = parsed.searchParams.get('cid') ||
            (parsed.searchParams.get('resid') || parsed.searchParams.get('id') || '').split('!')[0];

        if (!cid || !/^[a-f0-9]{8,32}$/i.test(cid)) {
            return { error: 'Invalid OneDrive personal share URL with owner CID' };
        }

        return { data: compactData({
            user_id: cid.toUpperCase(),
            owner_id: cid.toUpperCase(),
            profile_url: `https://onedrive.live.com/?cid=${cid.toUpperCase()}`,
            share_type: 'onedrive-share',
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
