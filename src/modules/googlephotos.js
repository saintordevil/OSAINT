// Google Photos shared album metadata reader.
// Public shared-album pages expose the album owner's Google account ID, name, and avatar.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

function parseShare(rawUrl) {
    const parsed = normalizeUrl(rawUrl, 'https://photos.google.com');
    if (!parsed) return null;

    if (parsed.hostname.toLowerCase() === 'photos.google.com') {
        const match = parsed.pathname.match(/^\/share\/(AF1Qip[A-Za-z0-9_-]+)\/?$/);
        if (!match) return null;
        return { parsed, shareId: match[1], shareKey: parsed.searchParams.get('key') };
    }

    if (parsed.hostname.toLowerCase() === 'photos.app.goo.gl') {
        return { parsed, shareId: parsed.pathname.replace(/^\//, ''), shareKey: null };
    }

    return null;
}

function isGooglePhotosHost(hostname) {
    return ['photos.google.com', 'photos.app.goo.gl'].includes(hostname.toLowerCase());
}

function extractOwner(html) {
    const ownerIndex = html.indexOf('(Owner)');
    if (ownerIndex === -1) return null;

    const before = html.slice(Math.max(0, ownerIndex - 3000), ownerIndex + 300);
    const tuples = [...before.matchAll(/\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]/g)];
    const tuple = tuples.at(-1);
    if (!tuple) return null;

    return {
        user_id: tuple[1],
        name: tuple[2],
        avatar_url: tuple[3],
    };
}

export default async function googlephotos(url) {
    try {
        const parsed = parseShare(url);
        if (!parsed) return { error: 'Invalid Google Photos shared album URL' };

        const { error, res, html } = await fetchHtml(parsed.parsed, {}, { allowedRedirectHosts: isGooglePhotosHost });
        if (error) return { error: `Google Photos shared album request failed: ${error}` };

        const finalShare = parseShare(res.url) || parsed;
        if (!finalShare.shareId || (finalShare.parsed.hostname === 'photos.google.com' && !finalShare.shareKey)) {
            return { error: 'Google Photos URL did not resolve to a public shared album' };
        }

        const owner = extractOwner(html);
        if (!owner) return { error: 'Google Photos shared album page does not expose a verifiable owner marker' };

        return { data: compactData({
            share_id: finalShare.shareId,
            share_type: 'shared-album',
            ...owner,
            share_token: finalShare.shareKey,
            share_url: finalShare.parsed.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
