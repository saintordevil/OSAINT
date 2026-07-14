// YouTube clip page parser.
// A clip page identifies the person who created the clip artifact. It does not
// prove who later forwarded the clip URL, and ordinary `si` tokens remain opaque.

import { cleanText, compactData, extractJsonObjects, extractMeta, fetchHtml, normalizeUrl } from './_helpers.js';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

function textValue(value) {
    if (!value || typeof value !== 'object') return null;
    if (typeof value.simpleText === 'string') return cleanText(value.simpleText);
    if (Array.isArray(value.runs)) {
        const text = value.runs.map(run => run?.text || '').join('');
        return cleanText(text) || null;
    }
    return null;
}

function selectAvatar(renderer) {
    const thumbnails = renderer?.authorAvatar?.thumbnails;
    if (!Array.isArray(thumbnails)) return null;
    return thumbnails
        .filter(item => typeof item?.url === 'string')
        .sort((a, b) => (Number(b.width) * Number(b.height)) - (Number(a.width) * Number(a.height)))[0]?.url || null;
}

function splitCreatedText(value) {
    const text = cleanText(value || '');
    const parts = text.split(/\s+(?:\u00b7|\u00c2\u00b7)\s+/).filter(Boolean);
    if (parts.length >= 2 && /views?$/i.test(parts[0])) {
        return { viewCount: parts[0], createdText: parts.slice(1).join(' \u00b7 ') };
    }
    return { createdText: text || null, viewCount: null };
}

export default async function youtube(url) {
    try {
        const parsed = normalizeUrl(url, 'https://www.youtube.com');
        if (!parsed || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase()) || !/^\/clip\/[^/]+\/?$/i.test(parsed.pathname)) {
            return { error: 'Only YouTube clip URLs are supported; normal watch, Shorts, and si links do not expose sharer data' };
        }

        const clipId = parsed.pathname.split('/').filter(Boolean)[1];
        if (!clipId) return { error: 'Invalid YouTube clip URL' };

        parsed.search = '';
        parsed.hash = '';
        const shareUrl = parsed.toString();
        const { error, html } = await fetchHtml(parsed, {
            'Accept-Language': 'en-GB,en;q=0.8',
        });
        if (error) return { error: `YouTube clip page request failed: ${error}` };

        const renderer = extractJsonObjects(html, 'clipAttributionRenderer')
            .find(candidate => textValue(candidate?.clipAuthor));
        const description = extractMeta(html, 'description') || extractMeta(html, 'og:description') || '';
        const metaAuthor = description.match(/Clipped by\s+(.+?)\s+(?:\u00b7|\u00c2\u00b7)\s+Original video/i)?.[1];
        const name = cleanText(textValue(renderer?.clipAuthor) || metaAuthor || '');
        if (!name) return { error: 'YouTube clip page does not expose clip creator data' };

        const combined = splitCreatedText(textValue(renderer?.createdText));
        const explicitViewCount = textValue(renderer?.viewCountText);

        return { data: compactData({
            clip_id: clipId,
            share_type: 'clip',
            identity_role: 'clip_creator',
            name,
            clip_title: textValue(renderer?.title) || textValue(renderer?.clipTitle) || extractMeta(html, 'og:title'),
            created_text: combined.createdText,
            view_count: explicitViewCount || combined.viewCount,
            avatar_url: selectAvatar(renderer),
            share_url: shareUrl,
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
