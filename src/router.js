const PLATFORMS = [
    { name: 'tiktok',     pattern: /(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\//i,   desc: 'TikTok share links' },
    { name: 'instagram',  pattern: /instagram\.com\/(reel|p)\//i,                              desc: 'Instagram reels & posts' },
    { name: 'xiaohongshu', pattern: /(?:xiaohongshu\.com|xhslink\.com)\//i,                     desc: 'Xiaohongshu / RED share links' },
    { name: 'bilibili',    pattern: /(?:^|\/\/)(?:[\w-]+\.)?(?:bilibili\.com|b23\.tv|bili2233\.cn)\//i, desc: 'Bilibili app share links' },
    { name: 'baidu',       pattern: /(?:^|\/\/)pan\.baidu\.com\//i,                             desc: 'Baidu Netdisk share links' },
    { name: 'netease',     pattern: /(?:^|\/\/)(?:music\.163\.com|y\.music\.163\.com)\//i,       desc: 'NetEase Cloud Music share links' },
    { name: 'zhihu',       pattern: /(?:^|\/\/)(?:[\w-]+\.)?zhihu\.com\//i,                      desc: 'Zhihu legacy share links' },
    { name: 'discord',    pattern: /(?:discord\.com\/invite|discord\.gg)\//i,                   desc: 'Discord invite links' },
    { name: 'claude',     pattern: /claude\.ai\/share\/[a-f0-9-]+/i,                            desc: 'Claude shared conversations' },
    { name: 'perplexity', pattern: /perplexity\.ai\/search\//i,                                 desc: 'Perplexity search threads' },
    { name: 'microsoft',  pattern: /sharepoint\.com\/:[a-z]:\/g\/personal\//i,                  desc: 'SharePoint / OneDrive links' },
    { name: 'pinterest',  pattern: /pin\.it\//i,                                                desc: 'Pinterest share links' },
    { name: 'substack',   pattern: /substack\.com\/@[\w-]+\/note\//i,                            desc: 'Substack referral links' },
    { name: 'suno',       pattern: /suno\.com\/s\//i,                                            desc: 'Suno music share links' },
    { name: 'spotify',    pattern: /(?:^|\/\/)(?:(?:www\.)?spotify\.com\/wrapped-share\/|open\.spotify\.com\/wrapped\/share\/)/i, desc: 'Spotify Wrapped share links' },
    { name: 'youtube',    pattern: /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/clip\//i,         desc: 'YouTube clips (reveals clipper)' },
    { name: 'googlephotos', pattern: /^(?:https?:\/\/)?(?:photos\.app\.goo\.gl\/|photos\.google\.com\/share\/)/i, desc: 'Google Photos shared albums' },
    { name: 'partiful',   pattern: /^(?:https?:\/\/)?(?:www\.)?(?:partiful\.com\/e\/|go\.partiful\.com\/)/i, desc: 'Partiful event invites' },
    { name: 'luma',       pattern: /^(?:https?:\/\/)?(?:www\.)?(?:lu\.ma|luma\.com)\/[A-Za-z0-9_-]{4,}(?:[/?#]|$)/i, desc: 'Lu.ma event invites' },
    { name: 'eventbrite', pattern: /^(?:https?:\/\/)?(?:www\.)?eventbrite\.com\/e\/[^/]*-tickets-\d+/i, desc: 'Eventbrite event invites' },
    { name: 'teams',      pattern: /^(?:https?:\/\/)?teams\.microsoft\.com\/l\/meetup-join\//i,     desc: 'Microsoft Teams meeting links' },
    { name: 'whatsapp',   pattern: /^(?:https?:\/\/)?(?:wa\.me\/\d{7,15}|api\.whatsapp\.com\/send\?[^#]*phone=\d{7,15})/i, desc: 'WhatsApp click-to-chat links' },
    { name: 'qqcontact',  pattern: /^(?:https?:\/\/)?wpa\.qq\.com\/msgrd\/?\?[^#]*\buin=\d{5,12}/i, desc: 'QQ contact links' },
    { name: 'steamtrade', pattern: /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/tradeoffer\/new\/?\?[^#]*\bpartner=\d+/i, desc: 'Steam trade-offer links' },
    { name: 'onedrive',   pattern: /^(?:https?:\/\/)?(?:onedrive\.live\.com|1drv\.ms)\//i,       desc: 'OneDrive personal share links' },
    { name: 'cashapp',    pattern: /^(?:https?:\/\/)?cash\.app\/\$[A-Za-z0-9_]{1,20}(?:[/?#]|$)/i, desc: 'Cash App profile links' },
    { name: 'venmo',      pattern: /^(?:https?:\/\/)?(?:www\.)?venmo\.com\/(?:u\/[A-Za-z0-9_.-]{2,32}|code\?[^#]*user_id=\d+)/i, desc: 'Venmo profile links' },
    { name: 'paypalme',   pattern: /^(?:https?:\/\/)?(?:www\.)?paypal\.me\/[A-Za-z0-9_.-]{2,64}(?:[/?#]|$)/i, desc: 'PayPal.Me profile links' },
    { name: 'kofi',       pattern: /^(?:https?:\/\/)?(?:www\.)?ko-fi\.com\/[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'Ko-fi profile links' },
    { name: 'buymeacoffee', pattern: /^(?:https?:\/\/)?(?:www\.)?buymeacoffee\.com\/[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'Buy Me a Coffee profile links' },
    { name: 'patreon',    pattern: /^(?:https?:\/\/)?(?:www\.)?patreon\.com\/(?:c\/)?[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'Patreon creator links' },
    { name: 'linktree',   pattern: /^(?:https?:\/\/)?(?:www\.)?linktr\.ee\/[A-Za-z0-9_.-]{2,64}(?:[/?#]|$)/i, desc: 'Linktree profile links' },
    { name: 'beacons',    pattern: /^(?:https?:\/\/)?(?:www\.)?beacons\.ai\/[A-Za-z0-9_.-]{2,64}(?:[/?#]|$)/i, desc: 'Beacons profile links' },
    { name: 'calendly',   pattern: /^(?:https?:\/\/)?calendly\.com\/[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'Calendly booking links' },
    { name: 'calcom',     pattern: /^(?:https?:\/\/)?(?:www\.)?cal\.com\/(?:team\/)?[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'Cal.com booking links' },
    { name: 'tidycal',    pattern: /^(?:https?:\/\/)?tidycal\.com\/[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'TidyCal booking links' },
    { name: 'youcanbookme', pattern: /^(?:https?:\/\/)?[a-z0-9-]{2,63}\.youcanbook\.me(?:[/?#]|$)/i, desc: 'YouCanBookMe booking links' },
    { name: 'savvycal',   pattern: /^(?:https?:\/\/)?(?:www\.)?savvycal\.com\/[A-Za-z0-9_-]{2,64}(?:[/?#]|$)/i, desc: 'SavvyCal booking links' },
    { name: 'acuity',     pattern: /^(?:https?:\/\/)?(?:app\.acuityscheduling\.com\/schedule\.php|[a-z0-9-]+\.as\.me\/schedule\.php)\?[^#]*\bowner=\d+/i, desc: 'Acuity scheduling links' },
    { name: 'tickettailor', pattern: /^(?:https?:\/\/)?(?:(?:www\.)?tickettailor\.com\/events\/[A-Za-z0-9_-]{2,80}|buytickets\.at\/[A-Za-z0-9_-]{2,80})(?:[/?#]|$)/i, desc: 'Ticket Tailor event links' },
    { name: 'humanitix',  pattern: /^(?:https?:\/\/)?(?:(?:events\.)?humanitix\.com\/|www\.humanitix\.com\/events\/)[A-Za-z0-9_-]{4,160}(?:[/?#]|$)/i, desc: 'Humanitix event links' },
    { name: 'meetup',     pattern: /^(?:https?:\/\/)?(?:www\.)?meetup\.com\/[A-Za-z0-9_-]{2,120}\/events\/\d{5,20}(?:[/?#]|$)/i, desc: 'Meetup event links' },
    { name: 'ticketleap', pattern: /^(?:https?:\/\/)?(?:www\.)?ticketleap\.events\/tickets\/[A-Za-z0-9_-]{2,120}(?:[/?#]|$)/i, desc: 'TicketLeap event links' },
    { name: 'eventzilla', pattern: /^(?:https?:\/\/)?(?:www\.)?eventzilla\.net\/e\//i, desc: 'Eventzilla event links' },
    { name: 'universe',   pattern: /^(?:https?:\/\/)?(?:www\.)?universe\.com\/(?:events\/)?[A-Za-z0-9_-]+-tickets-[A-Za-z0-9]+(?:[/?#]|$)/i, desc: 'Universe event links' },
    { name: 'loom',       pattern: /^(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/[a-f0-9]{32}(?:[/?#]|$)/i, desc: 'Loom recording shares' },
    { name: 'medal',      pattern: /^(?:https?:\/\/)?(?:www\.)?medal\.tv\/.+\/clips\/[A-Za-z0-9_-]{8,}(?:[/?#]|$)/i, desc: 'Medal.tv game clips' },
    { name: 'telegram',   pattern: /t\.me\/joinchat\//i,                                         desc: 'Telegram join links' },
    { name: 'twitch',    pattern: /(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)/i,               desc: 'Twitch clips (reveals clipper)' },
    { name: 'reddit',    pattern: /reddit\.com\/r\/\w+\/s\//i,                                      desc: 'Reddit mobile share links' },
];

export function detectPlatform(url) {
    for (const p of PLATFORMS) {
        if (p.pattern.test(url)) return p;
    }
    return null;
}

export function listPlatforms() {
    return PLATFORMS.map(p => ({ name: p.name, desc: p.desc }));
}

export async function loadParser(name) {
    const mod = await import(`./modules/${name}.js`);
    return mod.default;
}
