// Steam trade offer link parser.

import { compactData, normalizeUrl } from './_helpers.js';

const STEAM_ID64_BASE = 76561197960265728n;

export default async function steamtrade(url) {
    try {
        const parsed = normalizeUrl(url, 'https://steamcommunity.com');
        if (!parsed || parsed.hostname.toLowerCase() !== 'steamcommunity.com' || !/^\/tradeoffer\/new\/?$/i.test(parsed.pathname)) {
            return { error: 'Invalid Steam trade offer URL' };
        }

        const partner = parsed.searchParams.get('partner');
        const token = parsed.searchParams.get('token');
        if (!partner || !/^\d+$/.test(partner)) {
            return { error: 'Steam trade URL does not include a numeric partner account ID' };
        }

        const steamId64 = (STEAM_ID64_BASE + BigInt(partner)).toString();
        return { data: compactData({
            account_id: partner,
            user_id: steamId64,
            share_token: token,
            profile_url: `https://steamcommunity.com/profiles/${steamId64}`,
            share_type: 'trade-link',
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
