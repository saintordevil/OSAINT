import { postJsonProbe } from './httpProbe.js';
import { safeUrl } from './tokenUtils.js';

export const SAMPLE_URLS = {
    youtube: [
        'https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh',
        'https://youtu.be/E27-IDwnhnY?si=p7FQfkwP0NTwOihw',
    ],
    spotify: [
        'https://open.spotify.com/track/2prqm9sPLj10B4Wg0wE5x9?si=e98015d9626d4ffc',
        'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH?si=910364c95fdc4362',
        'https://open.spotify.com/track/6sKr3450XtdB6xS4y1XbkM?si=e46f8be4b30041c8',
        'https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7',
    ],
};

export function buildBaseProbes(platform, control) {
    const probes = [
        {
            id: `${control.name}:desktop`,
            platform,
            control: control.name,
            label: `${control.name} desktop fetch`,
            url: control.url,
            user_agent: 'desktop',
        },
        {
            id: `${control.name}:mobile`,
            platform,
            control: control.name,
            label: `${control.name} mobile fetch`,
            url: control.url,
            user_agent: 'mobile',
        },
    ];

    if (platform === 'youtube') probes.push(...buildYoutubeStaticProbes(control));
    if (platform === 'spotify') probes.push(...buildSpotifyStaticProbes(control));
    return probes;
}

export function buildYoutubeStaticProbes(control) {
    const parsed = safeUrl(control.url);
    const videoId = parsed.hostname === 'youtu.be'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : parsed.searchParams.get('v');
    const probes = [];
    if (videoId) {
        probes.push({
            id: `${control.name}:youtube:oembed`,
            platform: 'youtube',
            control: control.name,
            label: `${control.name} YouTube oEmbed`,
            url: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(control.url)}`,
            accept: 'application/json',
        });
        probes.push({
            id: `${control.name}:youtube:watch`,
            platform: 'youtube',
            control: control.name,
            label: `${control.name} canonical watch`,
            url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}${parsed.searchParams.get('si') ? `&si=${encodeURIComponent(parsed.searchParams.get('si'))}` : ''}`,
        });
        probes.push({
            id: `${control.name}:youtube:mweb`,
            platform: 'youtube',
            control: control.name,
            label: `${control.name} mobile watch`,
            url: `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}${parsed.searchParams.get('si') ? `&si=${encodeURIComponent(parsed.searchParams.get('si'))}` : ''}`,
            user_agent: 'mobile',
        });
    }
    return probes;
}

export function buildYoutubeInnertubeProbes(inputUrl, contentIds, ytcfg, control = 'exact') {
    if (!ytcfg?.api_key || !contentIds?.video_id) return [];
    const clientVersion = ytcfg.client_version || '2.20250101.00.00';
    const endpoint = suffix => `https://www.youtube.com/youtubei/v1/${suffix}?prettyPrint=false&key=${encodeURIComponent(ytcfg.api_key)}`;
    const context = {
        client: {
            hl: 'en',
            gl: 'US',
            clientName: 'WEB',
            clientVersion,
            visitorData: ytcfg.visitor_data || undefined,
        },
    };
    const si = new URL(inputUrl).searchParams.get('si');
    const bodyBase = { context, videoId: contentIds.video_id };
    return [
        postJsonProbe(`${control}:youtubei:resolve_url`, 'youtube', endpoint('navigation/resolve_url'), { context, url: inputUrl }, 'Innertube resolve_url', control),
        postJsonProbe(`${control}:youtubei:player`, 'youtube', endpoint('player'), bodyBase, 'Innertube player', control),
        postJsonProbe(`${control}:youtubei:player_si`, 'youtube', endpoint('player'), { ...bodyBase, si }, 'Innertube player with si field', control),
        postJsonProbe(`${control}:youtubei:player_share_id`, 'youtube', endpoint('player'), { ...bodyBase, shareId: si }, 'Innertube player with shareId field', control),
        postJsonProbe(`${control}:youtubei:player_current_url`, 'youtube', endpoint('player'), {
            ...bodyBase,
            url: inputUrl,
            playbackContext: {
                contentPlaybackContext: {
                    currentUrl: inputUrl,
                    shareId: si,
                },
            },
        }, 'Innertube player with playback context share fields', control),
        postJsonProbe(`${control}:youtubei:next`, 'youtube', endpoint('next'), bodyBase, 'Innertube next', control),
        postJsonProbe(`${control}:youtubei:next_si`, 'youtube', endpoint('next'), { ...bodyBase, si, shareId: si, url: inputUrl }, 'Innertube next with share fields', control),
        postJsonProbe(`${control}:youtubei:share_panel`, 'youtube', endpoint('share/get_share_panel'), {
            context,
            serializedSharedEntity: serializeYoutubeVideoEntity(contentIds.video_id),
        }, 'Innertube share panel', control),
    ];
}

export function defaultYoutubeConfig() {
    return {
        api_key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
        client_version: '2.20250101.00.00',
        source: 'public_web_fallback',
    };
}

export function buildSpotifyStaticProbes(control) {
    const parsed = safeUrl(control.url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const [type, id] = parts;
    const probes = [
        {
            id: `${control.name}:spotify:oembed`,
            platform: 'spotify',
            control: control.name,
            label: `${control.name} Spotify oEmbed`,
            url: `https://open.spotify.com/oembed?url=${encodeURIComponent(control.url)}`,
            accept: 'application/json',
        },
    ];
    if (type && id) {
        probes.push({
            id: `${control.name}:spotify:embed`,
            platform: 'spotify',
            control: control.name,
            label: `${control.name} Spotify embed`,
            url: `https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}${parsed.search}`,
        });
        probes.push(postJsonProbe(`${control.name}:spotify:url_dispenser`, 'spotify', 'https://spclient.wg.spotify.com/url-dispenser/v1/generate-url', {
            uri: `spotify:${type}:${id}`,
            social_referrer: 'copy-link',
        }, `${control.name} Spotify URL dispenser`, control.name));
    }
    return probes;
}

export function spotifyBundleNeedles() {
    return [
        'sharingInfo',
        'shareId',
        'shareUrl',
        'pathfinder',
        'url-dispenser',
        'referrer',
        'sender',
        'inviter',
        'sourceUser',
        'resolveShare',
    ];
}

function serializeYoutubeVideoEntity(videoId) {
    return Buffer.concat([Buffer.from([10, Buffer.byteLength(videoId)]), Buffer.from(videoId)]).toString('base64');
}
