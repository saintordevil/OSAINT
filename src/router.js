const PLATFORMS = [
    { name: 'tiktok',     pattern: /(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\//i,   desc: 'TikTok share links' },
    { name: 'instagram',  pattern: /instagram\.com\/(reel|p)\//i,                              desc: 'Instagram reels & posts' },
    { name: 'discord',    pattern: /(?:discord\.com\/invite|discord\.gg)\//i,                   desc: 'Discord invite links' },
    { name: 'claude',     pattern: /claude\.ai\/share\/[a-f0-9-]+/i,                            desc: 'Claude shared conversations' },
    { name: 'perplexity', pattern: /perplexity\.ai\/search\//i,                                 desc: 'Perplexity search threads' },
    { name: 'microsoft',  pattern: /sharepoint\.com\/:[a-z]:\/g\/personal\//i,                  desc: 'SharePoint / OneDrive links' },
    { name: 'pinterest',  pattern: /pin\.it\//i,                                                desc: 'Pinterest share links' },
    { name: 'substack',   pattern: /substack\.com\/@[\w-]+\/note\//i,                            desc: 'Substack referral links' },
    { name: 'suno',       pattern: /suno\.com\/s\//i,                                            desc: 'Suno music share links' },
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
