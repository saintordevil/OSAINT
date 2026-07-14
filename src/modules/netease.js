// NetEase Cloud Music share link metadata reader
// App share URLs can include userid, which maps to the sharing account.

import { fetchHtml, normalizeUrl } from './_helpers.js';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json,text/html',
    'Referer': 'https://music.163.com/',
};

function isNeteaseHost(hostname) {
    return hostname === 'music.163.com' || hostname === 'y.music.163.com';
}

function parseUrl(rawUrl) {
    const parsed = normalizeUrl(rawUrl, 'https://music.163.com');
    if (!parsed) return null;
    if (!isNeteaseHost(parsed.hostname.toLowerCase())) return null;
    return parsed;
}

function collectParams(parsed) {
    const params = new Map();

    function add(key, value) {
        if (!key || value === null || value === undefined || value === '') return;
        const normalized = key.toLowerCase();
        if (!params.has(normalized)) params.set(normalized, String(value));
    }

    for (const [key, value] of parsed.searchParams.entries()) add(key, value);

    if (parsed.hash) {
        const hash = parsed.hash.replace(/^#/, '');
        const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
        for (const [key, value] of new URLSearchParams(query).entries()) add(key, value);
    }

    return params;
}

function getParam(params, key) {
    return params.get(key.toLowerCase()) || null;
}

function contentRoute(parsed) {
    const direct = parsed.pathname.match(/^\/(?:m\/)?(song|playlist|album|program|djradio|mv)(?:\/([1-9]\d*))?\/?$/i);
    if (direct) return { type: direct[1].toLowerCase(), pathId: direct[2] || null };

    const hashPath = parsed.hash.replace(/^#\/?/, '').split('?', 1)[0];
    const hash = hashPath.match(/^(song|playlist|album|program|djradio|mv)(?:\/([1-9]\d*))?\/?$/i);
    return hash ? { type: hash[1].toLowerCase(), pathId: hash[2] || null } : null;
}

async function fetchProfile(userId) {
    try {
        const { error, html } = await fetchHtml(`https://music.163.com/api/v1/user/detail/${encodeURIComponent(userId)}`, HEADERS);
        if (error) return {};

        const body = JSON.parse(html);
        const profile = body.profile || {};
        const data = {};

        if (profile.nickname) data.name = profile.nickname;
        if (profile.avatarUrl) data.avatar_url = profile.avatarUrl;
        if (profile.signature) data.signature = profile.signature;
        if (typeof profile.followeds === 'number') data.follower_count = profile.followeds;
        if (typeof profile.follows === 'number') data.following_count = profile.follows;
        if (typeof body.listenSongs === 'number') data.listened_songs = body.listenSongs;

        return data;
    } catch {
        return {};
    }
}

export default async function netease(url) {
    try {
        const parsed = parseUrl(url);
        if (!parsed) {
            return { error: 'Invalid NetEase Cloud Music share URL' };
        }

        const params = collectParams(parsed);
        const userId = getParam(params, 'userid');
        const route = contentRoute(parsed);
        const contentId = getParam(params, 'id') || route?.pathId;

        if (!route || !/^[1-9]\d*$/.test(userId || '') || !/^[1-9]\d*$/.test(contentId || '')) {
            return { error: 'NetEase URL is not a supported content share with userid and content ID' };
        }

        const data = {
            user_id: userId,
            profile_url: `https://music.163.com/#/user/home?id=${userId}`,
            identity_confidence: 'unsigned_url_claim',
        };

        if (contentId) data.content_id = contentId;

        const creatorId = getParam(params, 'creatorId');
        if (creatorId && creatorId !== userId) data.content_creator_id = creatorId;

        const dlt = getParam(params, 'dlt');
        if (dlt) data.share_token = dlt;

        return { data: { ...data, ...(await fetchProfile(userId)) } };
    } catch (err) {
        return { error: err.message };
    }
}
