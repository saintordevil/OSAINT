// QQ contact link parser.

import { compactData, normalizeUrl } from './_helpers.js';

export default async function qqcontact(url) {
    try {
        const parsed = normalizeUrl(url, 'https://wpa.qq.com');
        if (!parsed || parsed.hostname.toLowerCase() !== 'wpa.qq.com') {
            return { error: 'Invalid QQ contact URL' };
        }

        const uin = parsed.searchParams.get('uin');
        if (!uin || !/^\d{5,12}$/.test(uin)) {
            return { error: 'QQ contact link does not include a valid uin' };
        }

        return { data: compactData({
            user_id: uin,
            account_id: uin,
            profile_url: parsed.toString(),
            share_type: 'contact-link',
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
