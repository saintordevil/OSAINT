import { annotateResult } from './attribution.js';

const PLATFORMS = [
    { name: 'tiktok',       pattern: /^(?:(?:vm|vt)\.tiktok\.com\/[^/?#]+(?:[/?]|$)|(?:(?:www|m)\.)?tiktok\.com\/t\/[^/?#]+(?:[/?]|$))/i, desc: 'TikTok share links' },
    { name: 'instagram',    pattern: /^(?:(?:www|m)\.)?instagram\.com\/(?:reel|p)\/[^/?#]+(?:[/?]|$)/i, desc: 'Instagram reels & posts' },
    { name: 'xiaohongshu',  pattern: /^(?:(?:(?:www|m)\.)?xiaohongshu\.com\/(?:explore|discovery\/item)\/[a-z0-9]+(?:[/?]|$)|(?:www\.)?xhslink\.com\/[^/?#]+(?:[/?]|$))/i, desc: 'Xiaohongshu / RED share links' },
    { name: 'bilibili',     pattern: /^(?:(?:(?:www|m)\.)?bilibili\.com\/(?:video|bangumi\/play|read|opus|dynamic)\/[^/?#]+(?:[/?]|$)|(?:www\.)?(?:b23\.tv|bili2233\.cn)\/[^/?#]+(?:[/?]|$))/i, desc: 'Bilibili app share links' },
    { name: 'baidu',        pattern: /^pan\.baidu\.com\//i, desc: 'Baidu Netdisk share links' },
    { name: 'netease',      pattern: /^(?:music\.163\.com|y\.music\.163\.com)\/(?:#\/?|m\/)?(?:song|playlist|album|program|djradio|mv)(?:[/?#]|$)/i, desc: 'NetEase Cloud Music share links' },
    { name: 'zhihu',        pattern: /^(?:(?:www|zhuanlan)\.)?zhihu\.com\/(?:question\/\d+|answer\/\d+|p\/\d+|zvideo\/\d+)(?:[/?]|$)/i, desc: 'Zhihu legacy share links' },
    { name: 'discord',      pattern: /^(?:(?:www\.)?discord\.com\/invite|discord\.gg)\/[^/?#]+(?:[/?]|$)/i, desc: 'Discord invite links' },
    { name: 'claude',       pattern: /^(?:www\.)?claude\.ai\/share\/[a-z0-9-]+(?:[/?]|$)/i, desc: 'Claude shared conversations' },
    { name: 'perplexity',   pattern: /^(?:www\.)?perplexity\.ai\/search\/[^/?#]+(?:[/?]|$)/i, desc: 'Perplexity search threads' },
    { name: 'microsoft',    pattern: /^[a-z0-9-]+\.sharepoint\.com\/:[a-z]:\/(?:g\/personal|p)\/[A-Za-z0-9_]+\/[^/?#]+(?:[/?]|$)/i, desc: 'SharePoint / OneDrive links' },
    { name: 'pinterest',    pattern: /^(?:www\.)?pin\.it\/[^/?#]+(?:[/?]|$)/i, desc: 'Pinterest share links' },
    { name: 'substack',     pattern: /^(?:[a-z0-9-]+\.)?substack\.com\/@[\w-]+\/note\/[^/?#]+(?:[/?]|$)/i, desc: 'Substack referral links' },
    { name: 'suno',         pattern: /^(?:www\.)?suno\.com\/s\/[^/?#]+(?:[/?]|$)/i, desc: 'Suno music share links' },
    { name: 'spotify',      pattern: /^(?:(?:www\.)?spotify\.com\/wrapped-share\/|open\.spotify\.com\/wrapped\/share\/)[^/?#]+(?:[/?]|$)/i, desc: 'Spotify Wrapped share links' },
    { name: 'youtube',      pattern: /^(?:(?:www|m)\.)?youtube\.com\/clip\/[^/?#]+(?:[/?]|$)/i, desc: 'YouTube clips (reveals clipper)' },
    { name: 'googlephotos', pattern: /^(?:photos\.app\.goo\.gl\/[^/?#]+(?:[/?]|$)|photos\.google\.com\/share\/[^/?#]+(?:[/?]|$))/i, desc: 'Google Photos shared albums' },
    { name: 'partiful',     pattern: /^(?:(?:www\.)?partiful\.com\/e\/[^/?#]+(?:[/?]|$)|go\.partiful\.com\/[^/?#]+(?:[/?]|$))/i, desc: 'Partiful event invites' },
    { name: 'luma',         pattern: /^(?:www\.)?(?:lu\.ma|luma\.com)\/[A-Za-z0-9_-]{4,}(?:[/?]|$)/i, desc: 'Lu.ma event invites' },
    { name: 'eventbrite',   pattern: /^(?:www\.)?eventbrite\.com\/e\/[^/?#]*-tickets-\d+(?:[/?]|$)/i, desc: 'Eventbrite event invites' },
    { name: 'teams',        pattern: /^teams\.microsoft\.com\/l\/meetup-join\/[^/?#]+(?:[/?]|$)/i, desc: 'Microsoft Teams meeting links' },
    { name: 'whatsapp',     pattern: /^(?:wa\.me\/\d{7,15}(?:[/?]|$)|api\.whatsapp\.com\/send\/?\?(?:[^#&]*&)*phone=\d{7,15}(?:[&#]|$))/i, desc: 'WhatsApp click-to-chat links' },
    { name: 'qqcontact',    pattern: /^wpa\.qq\.com\/msgrd\/?\?(?:[^#&]*&)*uin=\d{5,12}(?:[&#]|$)/i, desc: 'QQ contact links' },
    { name: 'steamtrade',   pattern: /^(?:www\.)?steamcommunity\.com\/tradeoffer\/new\/?\?(?:[^#&]*&)*partner=\d+(?:[&#]|$)/i, desc: 'Steam trade-offer links' },
    { name: 'onedrive',     pattern: /^(?:onedrive\.live\.com|1drv\.ms)\//i, desc: 'OneDrive personal share links' },
    { name: 'cashapp',      pattern: /^cash\.app\/\$[A-Za-z0-9_]{1,20}(?:[/?]|$)/i, desc: 'Cash App profile links' },
    { name: 'venmo',        pattern: /^(?:www\.)?venmo\.com\/(?:u\/[A-Za-z0-9_.-]{2,32}(?:[/?]|$)|code\?(?:[^#&]*&)*user_id=\d+(?:[&#]|$))/i, desc: 'Venmo profile links' },
    { name: 'paypalme',     pattern: /^(?:www\.)?paypal\.me\/[A-Za-z0-9_.-]{2,64}(?:[/?]|$)/i, desc: 'PayPal.Me profile links' },
    { name: 'kofi',         pattern: /^(?:www\.)?ko-fi\.com\/[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'Ko-fi profile links' },
    { name: 'buymeacoffee', pattern: /^(?:www\.)?buymeacoffee\.com\/[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'Buy Me a Coffee profile links' },
    { name: 'patreon',      pattern: /^(?:www\.)?patreon\.com\/(?:c\/)?[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'Patreon creator links' },
    { name: 'linktree',     pattern: /^(?:www\.)?linktr\.ee\/[A-Za-z0-9_.-]{2,64}(?:[/?]|$)/i, desc: 'Linktree profile links' },
    { name: 'beacons',      pattern: /^(?:www\.)?beacons\.ai\/[A-Za-z0-9_.-]{2,64}(?:[/?]|$)/i, desc: 'Beacons profile links' },
    { name: 'calendly',     pattern: /^calendly\.com\/[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'Calendly booking links' },
    { name: 'calcom',       pattern: /^(?:www\.)?cal\.com\/(?:team\/)?[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'Cal.com booking links' },
    { name: 'tidycal',      pattern: /^tidycal\.com\/[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'TidyCal booking links' },
    { name: 'youcanbookme', pattern: /^[a-z0-9-]{2,63}\.youcanbook\.me(?:[/?]|$)/i, desc: 'YouCanBookMe booking links' },
    { name: 'savvycal',     pattern: /^(?:www\.)?savvycal\.com\/[A-Za-z0-9_-]{2,64}(?:[/?]|$)/i, desc: 'SavvyCal booking links' },
    { name: 'acuity',       pattern: /^(?:app\.acuityscheduling\.com\/schedule\.php|[a-z0-9-]+\.as\.me\/schedule\.php)\?(?:[^#&]*&)*owner=\d+(?:[&#]|$)/i, desc: 'Acuity scheduling links' },
    { name: 'tickettailor', pattern: /^(?:(?:www\.)?tickettailor\.com\/events\/[A-Za-z0-9_-]{2,80}|buytickets\.at\/[A-Za-z0-9_-]{2,80})(?:[/?]|$)/i, desc: 'Ticket Tailor event links' },
    { name: 'humanitix',    pattern: /^(?:(?:events\.)?humanitix\.com\/[A-Za-z0-9_-]{4,160}|www\.humanitix\.com\/events\/[A-Za-z0-9_-]{4,160})(?:[/?]|$)/i, desc: 'Humanitix event links' },
    { name: 'meetup',       pattern: /^(?:www\.)?meetup\.com\/[A-Za-z0-9_-]{2,120}\/events\/\d{5,20}(?:[/?]|$)/i, desc: 'Meetup event links' },
    { name: 'ticketleap',   pattern: /^(?:www\.)?ticketleap\.events\/tickets\/[A-Za-z0-9_-]{2,120}(?:[/?]|$)/i, desc: 'TicketLeap event links' },
    { name: 'eventzilla',   pattern: /^(?:www\.)?eventzilla\.net\/e\/[^/?#]+(?:[/?]|$)/i, desc: 'Eventzilla event links' },
    { name: 'universe',     pattern: /^(?:www\.)?universe\.com\/(?:events\/)?[A-Za-z0-9_-]+-tickets-[A-Za-z0-9]+(?:[/?]|$)/i, desc: 'Universe event links' },
    { name: 'loom',         pattern: /^(?:www\.)?loom\.com\/share\/[a-f0-9]{32}(?:[/?]|$)/i, desc: 'Loom recording shares' },
    { name: 'medal',        pattern: /^(?:www\.)?medal\.tv\/(?:[^/?#]+\/)+clips\/[A-Za-z0-9_-]{8,}(?:[/?]|$)/i, desc: 'Medal.tv game clips' },
    { name: 'twitch',       pattern: /^(?:clips\.twitch\.tv\/[A-Za-z0-9_-]+(?:[/?]|$)|(?:www\.)?twitch\.tv\/[A-Za-z0-9_]+\/clip\/[A-Za-z0-9_-]+(?:[/?]|$))/i, desc: 'Twitch clips (reveals clipper)' },
    { name: 'reddit',       pattern: /^(?:(?:www|old|new)\.)?reddit\.com\/r\/[A-Za-z0-9_]+\/s\/[A-Za-z0-9_-]+(?:[/?]|$)/i, desc: 'Reddit mobile share links' },
    { name: 'stackexchange', pattern: /^(?:(?:www\.)?stackoverflow\.com|meta\.stackoverflow\.com|(?:(?:meta|www)\.)?(?:serverfault\.com|superuser\.com|askubuntu\.com|mathoverflow\.net)|(?:es|ja|pt|ru)\.stackoverflow\.com|(?:es|ja|pt|ru|[a-z0-9-]+)\.meta\.stackoverflow\.com|(?:www\.)?(?:serverfault|superuser|askubuntu|stackapps)\.com|(?:[a-z0-9-]+(?:\.meta)?|meta)\.stackexchange\.com)\/(?:q|a)\/\d{1,10}\/\d{1,10}(?:[/?]|$)/i, desc: 'Stack Exchange built-in share links' },
];

function normalizeSubmittedUrl(rawUrl) {
    const input = String(rawUrl || '').trim();
    if (!input) return null;

    try {
        let parsed;
        if (/^\/\//.test(input)) {
            parsed = new URL(`https:${input}`);
        } else if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
            parsed = new URL(input);
        } else {
            parsed = new URL(`https://${input}`);
        }

        if (parsed.protocol !== 'https:') return null;
        if (parsed.username || parsed.password || !parsed.hostname) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function detectPlatform(url) {
    const parsed = normalizeSubmittedUrl(url);
    if (!parsed) return null;

    const hostname = parsed.hostname.toLowerCase();
    if (
        (hostname === 'music.163.com' || hostname === 'y.music.163.com')
        && /^#\/?(?:song|playlist|album|program|djradio|mv)(?:[/?]|$)/i.test(parsed.hash)
    ) {
        return PLATFORMS.find(platform => platform.name === 'netease') || null;
    }

    // Fragment text is client-side only and must never influence routing.
    const routeTarget = `${hostname}${parsed.pathname}${parsed.search}`;
    for (const platform of PLATFORMS) {
        if (platform.pattern.test(routeTarget)) return platform;
    }
    return null;
}

export function listPlatforms() {
    return PLATFORMS.map(platform => ({ name: platform.name, desc: platform.desc }));
}

export async function loadParser(name) {
    const mod = await import(`./modules/${name}.js`);
    return async url => annotateResult(name, await mod.default(url));
}
