import test from 'node:test';
import assert from 'node:assert/strict';

import { annotateResult, identityRoleFor, isSharerIdentityRole } from '../src/attribution.js';

test('attribution roles distinguish actual sharers from owners, targets, and artifact creators', () => {
    assert.equal(identityRoleFor('stackexchange'), 'referral_account');
    assert.equal(identityRoleFor('spotify'), 'actual_sharer');
    assert.equal(identityRoleFor('youtube'), 'clip_creator');
    assert.equal(identityRoleFor('whatsapp'), 'recipient_account');
    assert.equal(identityRoleFor('eventbrite'), 'event_organizer');
    assert.equal(isSharerIdentityRole('referral_account'), true);
    assert.equal(isSharerIdentityRole('clip_creator'), false);
});

test('identity-required platforms fail closed on metadata-only responses', () => {
    for (const [platform, data] of [
        ['tiktok', { country: 'United States', share_token: 'opaque' }],
        ['pinterest', { share_id: '123' }],
        ['substack', { share_token: 'abc' }],
        ['suno', { title: 'Song title' }],
        ['twitch', { clip_id: 'Clip', channel: 'OriginalStreamer' }],
        ['luma', { event_id: 'event', share_type: 'event-invite' }],
    ]) {
        const result = annotateResult(platform, { data });
        assert.equal(result.data, undefined, `${platform} accepted metadata without an identity`);
        assert.match(result.error, /identity/i);
    }
});

test('successful parser results gain a stable identity role without overwriting module evidence', () => {
    assert.deepEqual(annotateResult('tiktok', { data: { username: 'alice' } }), {
        data: { username: 'alice', identity_role: 'sharer_account', is_sharer_identity: true },
    });
    assert.deepEqual(annotateResult('youtube', { data: { name: 'clipper', identity_role: 'clip_creator' } }), {
        data: { name: 'clipper', identity_role: 'clip_creator', is_sharer_identity: false },
    });
});
