// Loom recording share parser.

import { compactData, fetchHtml, normalizeUrl } from './_helpers.js';

function parseUrl(rawUrl) {
    const parsed = normalizeUrl(rawUrl, 'https://www.loom.com');
    if (!parsed || !/^(?:www\.)?loom\.com$/i.test(parsed.hostname)) return null;
    const match = parsed.pathname.match(/^\/share\/([a-f0-9]{32})\/?$/i);
    if (!match) return null;
    return { parsed, videoId: match[1] };
}

function extractOwner(html) {
    const id = html.match(/"ownerId"\s*:\s*"([^"]+)"/)?.[1] || html.match(/"owner_id"\s*:\s*"([^"]+)"/)?.[1];
    const name = html.match(/"ownerName"\s*:\s*"([^"]+)"/)?.[1] || html.match(/"owner_name"\s*:\s*"([^"]+)"/)?.[1];
    const avatar = html.match(/"ownerAvatarUrl"\s*:\s*"([^"]+)"/)?.[1] || html.match(/"avatar_url"\s*:\s*"([^"]+)"/)?.[1];
    if (!id && !name && !avatar) return null;
    return { user_id: id, name, avatar_url: avatar?.replace(/\\u002F/g, '/') };
}

export default async function loom(url) {
    try {
        const parsed = parseUrl(url);
        if (!parsed) return { error: 'Invalid Loom share URL' };

        const { html, error } = await fetchHtml(parsed.parsed);
        if (error) return { error };

        const owner = extractOwner(html);
        if (!owner) return { error: 'Loom share page does not expose recording owner data' };

        return { data: compactData({
            share_id: parsed.videoId,
            share_type: 'recording-share',
            ...owner,
            share_url: parsed.parsed.toString(),
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
