const STRICT_SHARER_HINTS = [
    'sender', 'sharer', 'sharedby', 'shared_by', 'sharinguser', 'sourceuser',
    'source_user', 'referringuser', 'inviter', 'sharecreator',
    'share_creator', 'referrerprofile', 'referreruser',
];

const IDENTITY_HINTS = [
    'profile', 'user', 'account', 'avatar', 'displayname', 'display_name',
    'username', 'handle', 'userid', 'user_id', 'profileurl', 'profile_url',
    'channelid', 'channel_id', 'owner', 'creator', 'author', 'artist', 'publisher',
    'added_by', 'sharinginfo', 'shareid', 'shareurl',
];

const ANALYTICS_HINTS = [
    'analytics', 'tracking', 'visitor', 'session', 'device', 'campaign', 'click',
    'gabo', 'branch', 'match_id', 'sp_cid', 'dlsi', 'utm_', 'deeplink', 'navigation',
];

const GENERATED_SHARE_HINTS = [
    'sharinginfo', 'shareurl', 'share_url', 'shorturl', 'short_url',
    'get_share_panel', 'url-dispenser', 'generated',
];

const YOUTUBE_CONTENT_OWNER_PATHS = [
    'videodetails.author',
    'videodetails.channelid',
    'playerMicroformatRenderer.ownerChannelName',
    'shortBylineText',
    'ownerText',
    'ownerBadges',
    'oembed.author_name',
    'oembed.author_url',
    'microformat.playerMicroformatRenderer.owner',
    'metadataRowContainer',
];

const SPOTIFY_CONTENT_OWNER_PATHS = [
    'artist',
    'artists',
    'album.artists',
    'show.publisher',
    'episode.show.publisher',
    'playlist.owner',
    'ownerv2',
    'owner',
    'tracks.items.added_by',
    'added_by',
    'collaborators',
    'contentcreator',
];

export function classifyCandidate(candidate, context = {}) {
    const platform = context.platform || candidate.platform;
    const path = String(candidate.field_path || '').toLowerCase();
    const endpoint = String(candidate.endpoint || '').toLowerCase();
    const combined = `${endpoint}.${path}`;
    const analyticsContext = hasAny(path, ANALYTICS_HINTS) || hasAny(endpoint, ['analytics', 'gabo', 'branch', 'url-dispenser', 'deeplink']);
    const value = stringifyValue(candidate.value).toLowerCase();

    if (isCurrentViewer(combined, value, context)) {
        return reject('current_viewer', 'field matches current viewer or account context');
    }

    if (analyticsContext) {
        return reject('analytics', 'field path belongs to analytics, tracking, deep-link, or session context');
    }

    if (hasAny(combined, GENERATED_SHARE_HINTS)) {
        return reject('generated_share', 'field describes a generated share URL or generated share metadata');
    }

    if (platform === 'youtube' && hasAnyPath(combined, YOUTUBE_CONTENT_OWNER_PATHS)) {
        return reject('content_owner', 'YouTube field is video, channel, or uploader metadata');
    }

    if (platform === 'spotify' && hasAnyPath(combined, SPOTIFY_CONTENT_OWNER_PATHS)) {
        return reject('content_owner', 'Spotify field is content, playlist owner, artist, or added_by metadata');
    }

    if (matchesKnownContentTarget(value, context)) {
        return reject('content_owner', 'candidate value matches known content target identity');
    }

    const strictHint = hasStrictSharerHint(path);
    const identityHint = strictHint || hasAny(path, IDENTITY_HINTS);
    if (!identityHint) {
        return reject('unknown', 'field does not have a useful identity shape');
    }

    if (strictHint && !hasIdentityLeaf(candidate.field_path, candidate.value)) {
        return reject('unknown', 'field path has sharer context but is not an identity leaf');
    }

    if (strictHint && context.token_dependent === true && context.public_no_auth === true) {
        return {
            accepted: true,
            class: 'strict_sharer',
            reason: 'field path indicates sender/sharer/referrer and appears token-dependent in public no-auth controls',
        };
    }

    return reject('unknown', strictHint
        ? 'field path looks relevant, but token-dependent public proof is missing'
        : 'identity-shaped field is not semantically tied to the sharer');
}

export function classifyCandidates(candidates, context = {}) {
    return candidates.map(candidate => ({
        ...candidate,
        classification: classifyCandidate(candidate, context),
    }));
}

export function isIdentityPath(fieldPath) {
    const path = String(fieldPath || '').toLowerCase();
    return hasAny(path, [...STRICT_SHARER_HINTS, ...IDENTITY_HINTS]);
}

function reject(className, reason) {
    return { accepted: false, class: className, reason };
}

function hasAny(value, needles) {
    return needles.some(needle => value.includes(needle.toLowerCase()));
}

function hasStrictSharerHint(value) {
    const segments = String(value)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
    const segmentSet = new Set(segments);
    return STRICT_SHARER_HINTS.some(needle => {
        const parts = needle.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        if (parts.length === 1) return segmentSet.has(parts[0]);
        return segments.join(' ').includes(parts.join(' '));
    });
}

function hasAnyPath(value, needles) {
    const normalized = value.replace(/\[(\d+)\]/g, '').toLowerCase();
    return needles.some(needle => normalized.includes(needle.toLowerCase()));
}

function stringifyValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function hasIdentityLeaf(fieldPath, value) {
    if (value && typeof value === 'object') return false;

    const path = String(fieldPath || '')
        .replace(/\[(\d+)\]/g, '')
        .toLowerCase();
    const parts = path.split('.').filter(Boolean);
    const leaf = parts.at(-1) || '';
    const text = parts.join('.');

    if (['url', 'uri', 'href'].includes(leaf)) {
        return /(?:profile|account|user|channel)[._-]?(?:url|uri|href)?$/.test(text)
            || /\.(?:profile|account|user|channel)\.(?:url|uri|href)$/.test(text);
    }

    return [
        'profile', 'user', 'account', 'avatar', 'avatarurl', 'displayname',
        'display_name', 'username', 'handle', 'userid', 'user_id', 'profileurl',
        'profile_url', 'channelid', 'channel_id', 'accountid', 'account_id',
        'id', 'name',
    ].some(hint => leaf === hint || text.endsWith(`.${hint}`));
}

function matchesKnownContentTarget(value, context) {
    const targets = Object.values(context.content_ids || {}).filter(Boolean).map(v => String(v).toLowerCase());
    return targets.length > 0 && targets.some(target => value.includes(target));
}

function isCurrentViewer(path, value, context) {
    if (/(^|[._-])(currentuser|current_user|viewer|viewerprofile|viewer_profile|loggedinuser|logged_in_user|me)([._-]|$)/i.test(path)) {
        return true;
    }

    const viewer = context.current_viewer;
    if (!viewer) return false;
    const values = Object.values(viewer).filter(Boolean).map(v => String(v).toLowerCase());
    return values.some(v => value.includes(v)) || path.includes('currentuser') || path.includes('current_user');
}
