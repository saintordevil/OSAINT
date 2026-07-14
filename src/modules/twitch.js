// Twitch clip analyzer
// Uses Twitch's public GQL API to get clip curator (clipper) identity
// The curator is the viewer who captured the clip - their username and ID are exposed

import { tlsFetch } from './_tls.js';
import { normalizeUrl } from './_helpers.js';

const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

export default async function twitch(url) {
    try {
        // Extract clip slug from URL
        const parsed = normalizeUrl(url, 'https://www.twitch.tv');
        const host = parsed?.hostname.toLowerCase();
        const clipMatch = host === 'clips.twitch.tv'
            ? parsed.pathname.match(/^\/([\w-]+)\/?$/i)
            : (['twitch.tv', 'www.twitch.tv'].includes(host)
                ? parsed.pathname.match(/^\/[A-Za-z0-9_]+\/clip\/([\w-]+)\/?$/i)
                : null);
        if (!clipMatch) {
            return { error: 'Only Twitch clip URLs are supported (clips.twitch.tv or /clip/)' };
        }

        const slug = clipMatch[1];
        // Query Twitch GQL for clip data including curator
        const res = await tlsFetch('https://gql.twitch.tv/gql', {
            method: 'POST',
            headers: {
                'Client-Id': CLIENT_ID,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `query{clip(slug:"${slug}"){id,title,curator{id,login,displayName},broadcaster{id,login,displayName},createdAt,durationSeconds}}`
            })
        });

        if (!res.ok) return { error: `Twitch API returned ${res.status}` };

        const json = await res.json();
        const clip = json?.data?.clip;

        if (!clip) return { error: 'Clip not found or has been deleted' };

        const data = {};
        data.clip_id = clip.id;
        if (clip.title) data.title = clip.title;

        // Curator = the person who clipped it (sharer identity)
        if (clip.curator) {
            data.username = clip.curator.login;
            data.name = clip.curator.displayName;
            data.user_id = clip.curator.id;
            data.profile_url = `https://www.twitch.tv/${clip.curator.login}`;
        }

        // Broadcaster = the streamer
        if (clip.broadcaster) {
            data.channel = clip.broadcaster.displayName;
        }

        if (clip.createdAt) {
            data.created_at = clip.createdAt.replace('T', ' ').slice(0, 19);
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
