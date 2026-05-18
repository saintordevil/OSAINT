// WhatsApp click-to-chat parser.

import { compactData, normalizeUrl } from './_helpers.js';

export default async function whatsapp(url) {
    try {
        const parsed = normalizeUrl(url, 'https://wa.me');
        if (!parsed) return { error: 'Invalid WhatsApp click-to-chat URL' };

        const host = parsed.hostname.toLowerCase();
        let phone = null;
        if (host === 'wa.me') {
            phone = parsed.pathname.replace(/\D/g, '');
        } else if (host === 'api.whatsapp.com') {
            phone = (parsed.searchParams.get('phone') || '').replace(/\D/g, '');
        }

        if (!phone || !/^\d{7,15}$/.test(phone)) {
            return { error: 'WhatsApp link does not include a valid phone/account ID' };
        }

        return { data: compactData({
            user_id: phone,
            phone_number: phone,
            profile_url: `https://wa.me/${phone}`,
            share_type: 'contact-link',
        }) };
    } catch (err) {
        return { error: err.message };
    }
}
