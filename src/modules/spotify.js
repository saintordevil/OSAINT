// Spotify Wrapped share link metadata reader
// Wrapped public share pages expose shareData.sender_name for the link sender.

import { fetchHtml, normalizeUrl } from './_helpers.js';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
};

function parseUrl(rawUrl) {
    const parsed = normalizeUrl(rawUrl, 'https://www.spotify.com');
    if (!parsed) return null;
    const host = parsed.hostname.toLowerCase();
    if (!['www.spotify.com', 'spotify.com', 'open.spotify.com'].includes(host)) return null;

    const path = parsed.pathname.replace(/\/+$/, '');
    const wrappedShare = path.match(/^\/(?:[a-z]{2}\/)?wrapped-share\/([^/]+)$/i);
    if (wrappedShare) {
        return { parsed, shareId: wrappedShare[1], route: 'wrapped-share' };
    }

    const legacyWrapped = path.match(/^\/wrapped\/share\/([^/]+)$/i);
    if (legacyWrapped) {
        return { parsed, shareId: legacyWrapped[1], route: 'legacy-wrapped-share' };
    }

    return null;
}

function decodeJsonString(value) {
    try {
        return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
    } catch {
        return value
            .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
    }
}

function extractStringField(html, field) {
    const escaped = new RegExp(`\\\\"${field}\\\\"\\s*:\\s*\\\\"((?:\\\\\\\\.|[^\\\\"])*)\\\\"`);
    const escapedMatch = html.match(escaped);
    if (escapedMatch) return decodeJsonString(escapedMatch[1]);

    const plain = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
    const plainMatch = html.match(plain);
    if (plainMatch) return decodeJsonString(plainMatch[1]);

    return null;
}

function cleanSenderName(senderName) {
    if (!senderName) return null;
    return senderName.replace(/^From\s+/i, '').trim() || senderName;
}

function extractShareData(html) {
    const senderName = extractStringField(html, 'sender_name');
    if (!senderName) return null;

    const data = {
        sender_name: senderName,
        display_name: cleanSenderName(senderName),
    };

    const shortSenderName = extractStringField(html, 'short_sender_name');
    if (shortSenderName && shortSenderName !== senderName) {
        data.short_sender_name = shortSenderName;
    }

    const senderImageUrl = extractStringField(html, 'sender_image_url');
    if (senderImageUrl) data.sender_image_url = senderImageUrl;

    const imageAlt = extractStringField(html, 'image_alt');
    if (imageAlt) data.share_card_text = imageAlt;

    const storyType = extractStringField(html, 'story_type');
    if (storyType) data.story_type = storyType;

    const shareCardId = extractStringField(html, 'share_card_id');
    if (shareCardId) data.share_card_id = shareCardId;

    return data;
}

export default async function spotify(url) {
    try {
        const parsed = parseUrl(url);
        if (!parsed) {
            return { error: 'Invalid Spotify Wrapped share URL' };
        }

        const { error, res, html } = await fetchHtml(parsed.parsed, HEADERS);
        if (error) return { error: `Spotify Wrapped share page request failed: ${error}` };
        const shareData = extractShareData(html);
        if (!shareData) {
            return { error: 'Spotify Wrapped share page does not expose sender data' };
        }

        return {
            data: {
                share_id: parsed.shareId,
                share_type: parsed.route,
                ...shareData,
                resolved_url: res.url,
            },
        };
    } catch (err) {
        return { error: err.message };
    }
}
