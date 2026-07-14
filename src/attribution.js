// Stable role labels keep link-derived identities distinct from original
// content owners, profile targets, event organizers, and artifact creators.

const IDENTITY_ROLES = Object.freeze({
    tiktok: 'sharer_account',
    instagram: 'sharer_account',
    xiaohongshu: 'sharer_account',
    bilibili: 'sharer_account',
    baidu: 'share_owner',
    netease: 'sharer_account',
    zhihu: 'sharer_account',
    discord: 'invite_creator',
    claude: 'share_creator',
    perplexity: 'thread_author',
    microsoft: 'sharepoint_owner',
    pinterest: 'sharer_account',
    substack: 'referral_account',
    suno: 'sharer_account',
    spotify: 'actual_sharer',
    youtube: 'clip_creator',
    googlephotos: 'album_owner',
    partiful: 'event_host',
    luma: 'event_host',
    eventbrite: 'event_organizer',
    teams: 'meeting_organizer',
    whatsapp: 'recipient_account',
    qqcontact: 'recipient_account',
    steamtrade: 'trade_offer_owner',
    onedrive: 'storage_owner',
    cashapp: 'profile_target',
    venmo: 'profile_target',
    paypalme: 'profile_target',
    kofi: 'profile_target',
    buymeacoffee: 'profile_target',
    patreon: 'profile_target',
    linktree: 'profile_target',
    beacons: 'profile_target',
    calendly: 'booking_owner',
    calcom: 'booking_owner',
    tidycal: 'booking_owner',
    youcanbookme: 'booking_owner',
    savvycal: 'booking_owner',
    acuity: 'booking_owner',
    tickettailor: 'event_organizer',
    humanitix: 'event_organizer',
    meetup: 'event_organizer',
    ticketleap: 'event_organizer',
    eventzilla: 'event_organizer',
    universe: 'event_organizer',
    loom: 'recording_owner',
    medal: 'clip_creator',
    telegram: 'unavailable',
    twitch: 'clip_creator',
    reddit: 'sharer_signal',
    stackexchange: 'referral_account',
});

const REQUIRED_IDENTITY_FIELDS = Object.freeze({
    tiktok: ['user_id', 'username', 'name', 'profile_url'],
    instagram: ['user_id', 'username', 'name', 'profile_url'],
    xiaohongshu: ['user_id', 'profile_url'],
    bilibili: ['user_id', 'profile_url'],
    netease: ['user_id', 'profile_url'],
    zhihu: ['user_id', 'profile_url'],
    pinterest: ['user_id', 'username', 'name', 'profile_url'],
    substack: ['user_id', 'handle', 'name', 'profile_url'],
    suno: ['user_id', 'username', 'name', 'profile_url', 'avatar_url'],
    twitch: ['user_id', 'username', 'name', 'profile_url'],
    luma: ['user_id', 'name'],
});

const SHARER_IDENTITY_ROLES = new Set([
    'actual_sharer',
    'sharer_account',
    'sharer_signal',
    'referral_account',
]);

export function identityRoleFor(platform) {
    return IDENTITY_ROLES[platform] || 'related_account';
}

export function isSharerIdentityRole(role) {
    return SHARER_IDENTITY_ROLES.has(role);
}

function hasAnyField(data, fields) {
    return fields.some(field => {
        const value = data?.[field];
        return value !== null && value !== undefined && String(value).trim() !== '';
    });
}

export function annotateResult(platform, result) {
    if (!result?.data || typeof result.data !== 'object' || Array.isArray(result.data)) return result;

    const required = REQUIRED_IDENTITY_FIELDS[platform];
    if (required && !hasAnyField(result.data, required)) {
        return { error: `${platform} response did not contain an attributable identity` };
    }

    const identityRole = result.data.identity_role || identityRoleFor(platform);
    return {
        ...result,
        data: {
            ...result.data,
            identity_role: identityRole,
            is_sharer_identity: result.data.is_sharer_identity ?? isSharerIdentityRole(identityRole),
        },
    };
}
