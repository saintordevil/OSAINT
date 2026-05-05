import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildControls, compareControlPresence } from '../src/research/controls.js';
import { classifyCandidate } from '../src/research/classifyCandidate.js';
import { extractTokens, inferPlatform } from '../src/research/tokenUtils.js';
import { markTokenDependence } from '../scripts/research-share-leaks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('extracts YouTube and Spotify tracking tokens from exact samples', () => {
    const youtube = extractTokens('https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh', 'youtube');
    assert.equal(inferPlatform(youtube.input_url), 'youtube');
    assert.equal(youtube.tokens.si, '23gLArT_zXKhlYBh');
    assert.equal(youtube.tokens.decoded_si_hex, 'db780b02b4ffcd72a1958061');
    assert.equal(youtube.content_ids.video_id, '9_pGtoazuSc');

    const spotify = extractTokens('https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7', 'spotify');
    assert.equal(inferPlatform(spotify.input_url), 'spotify');
    assert.equal(spotify.tokens.sp_cid, '5b2987d8f6445a4e836ee3cb02abd98c');
    assert.equal(spotify.tokens.dlsi, '058d65493af24ff7');
    assert.deepEqual(spotify.token_values, [
        '5b2987d8f6445a4e836ee3cb02abd98c',
        '058d65493af24ff7',
    ]);
    assert.equal(spotify.all_token_values.includes('desktop'), true);
    assert.equal(spotify.token_values.includes('desktop'), false);
    assert.equal(spotify.token_values.includes('1'), false);
    assert.equal(spotify.content_ids.content_type, 'playlist');
    assert.equal(spotify.content_ids.content_id, '5EainjSN9gBbm2L7YzlUsR');
});

test('builds negative controls for exact token probes', () => {
    const input = 'https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh';
    const tokens = extractTokens(input, 'youtube').tokens;
    const controls = buildControls(input, 'youtube', tokens);
    assert.deepEqual(controls.map(c => c.name), [
        'exact',
        'si_removed',
        'si_random_same_shape',
        'si_one_char_mutated',
    ]);
});

test('builds controls for each Spotify tracking token present', () => {
    const input = 'https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7';
    const tokens = extractTokens(input, 'spotify').tokens;
    const controls = buildControls(input, 'spotify', tokens);
    assert.deepEqual(controls.map(c => c.name), [
        'exact',
        'tracking_removed',
        'sp_cid_removed',
        'sp_cid_random_same_shape',
        'sp_cid_one_char_mutated',
        'dlsi_removed',
        'dlsi_random_same_shape',
        'dlsi_one_char_mutated',
    ]);
});

test('compares exact and control candidates without control label noise', () => {
    const exactCandidates = [{
        endpoint: 'exact desktop fetch',
        field_path: '$.videoDetails.author',
        value: 'Uploader',
    }];
    const controlCandidates = [{
        endpoint: 'si_removed desktop fetch',
        field_path: '$.videoDetails.author',
        value: 'Uploader',
    }];

    assert.deepEqual(compareControlPresence(exactCandidates, controlCandidates), {
        exact_count: 1,
        control_count: 1,
        exact_unique_count: 0,
        shared_count: 1,
    });
});

test('marks token dependence by token family for multi-token Spotify links', () => {
    const controls = [
        { name: 'exact' },
        { name: 'tracking_removed' },
        { name: 'sp_cid_removed' },
        { name: 'sp_cid_random_same_shape' },
        { name: 'sp_cid_one_char_mutated' },
        { name: 'dlsi_removed' },
        { name: 'dlsi_random_same_shape' },
        { name: 'dlsi_one_char_mutated' },
    ];
    const exact = {
        endpoint: 'exact desktop fetch',
        control: 'exact',
        field_path: '$.sender.profile.username',
        value: 'actual-user',
    };
    const survivesOtherTokenRemoval = {
        ...exact,
        endpoint: 'sp_cid_removed desktop fetch',
        control: 'sp_cid_removed',
    };
    const requests = [
        { control: 'tracking_removed', label: 'tracking_removed desktop fetch', ok: true, parsed: true },
        { control: 'sp_cid_removed', label: 'sp_cid_removed desktop fetch', ok: true, parsed: true },
        { control: 'sp_cid_random_same_shape', label: 'sp_cid_random_same_shape desktop fetch', ok: true, parsed: true },
        { control: 'sp_cid_one_char_mutated', label: 'sp_cid_one_char_mutated desktop fetch', ok: true, parsed: true },
        { control: 'dlsi_removed', label: 'dlsi_removed desktop fetch', ok: true, parsed: true },
        { control: 'dlsi_random_same_shape', label: 'dlsi_random_same_shape desktop fetch', ok: true, parsed: true },
        { control: 'dlsi_one_char_mutated', label: 'dlsi_one_char_mutated desktop fetch', ok: true, parsed: true },
    ];

    const [marked] = markTokenDependence([exact, survivesOtherTokenRemoval], controls, requests);
    assert.equal(marked.token_dependent, true);
    assert.deepEqual(marked.token_dependencies, ['dlsi', 'all_tracking_tokens']);
});

test('does not treat missing or failed controls as token-dependence proof', () => {
    const controls = [
        { name: 'exact' },
        { name: 'si_removed' },
        { name: 'si_random_same_shape' },
        { name: 'si_one_char_mutated' },
    ];
    const exact = {
        endpoint: 'exact desktop fetch',
        control: 'exact',
        field_path: '$.sender.profile.username',
        value: 'actual-user',
    };

    const [noRequests] = markTokenDependence([exact], controls, []);
    assert.equal(noRequests.token_dependent, false);
    assert.deepEqual(noRequests.token_dependencies, []);
    assert.deepEqual(noRequests.inconclusive_token_dependencies, ['si']);

    const failedRequests = [
        { control: 'si_removed', label: 'si_removed desktop fetch', ok: false, parsed: false },
        { control: 'si_random_same_shape', label: 'si_random_same_shape desktop fetch', ok: false, parsed: false },
        { control: 'si_one_char_mutated', label: 'si_one_char_mutated desktop fetch', ok: false, parsed: false },
    ];
    const [failedControls] = markTokenDependence([exact], controls, failedRequests);
    assert.equal(failedControls.token_dependent, false);
    assert.deepEqual(failedControls.inconclusive_token_dependencies, ['si']);
});

test('fixture false positives are rejected with expected classes', async () => {
    const fixtures = [
        'fixtures/youtube/unsupported-si.json',
        'fixtures/spotify/unsupported-si.json',
        'fixtures/spotify/playlist-owner-false-positive.json',
        'fixtures/spotify/generated-share-false-positive.json',
    ];

    for (const fixturePath of fixtures) {
        const fixture = JSON.parse(await readFile(path.join(ROOT, fixturePath), 'utf8'));
        const tokens = extractTokens(fixture.input_url, fixture.platform);
        for (const candidate of fixture.candidates) {
            const classification = classifyCandidate({
                platform: fixture.platform,
                endpoint: 'fixture',
                field_path: candidate.field_path,
                value: candidate.value,
                nearby_object: {},
            }, {
                platform: fixture.platform,
                content_ids: tokens.content_ids,
                public_no_auth: true,
                token_dependent: true,
            });
            assert.equal(classification.accepted, false, `${fixturePath} should reject ${candidate.field_path}`);
            assert.equal(classification.class, candidate.expected_class, `${fixturePath} class mismatch for ${candidate.field_path}`);
        }
    }
});

test('strict sharer requires sender-like field plus token-dependent public proof', () => {
    const accepted = classifyCandidate({
        platform: 'spotify',
        endpoint: 'public endpoint',
        field_path: '$.sender.profile.username',
        value: 'actual-user',
    }, {
        platform: 'spotify',
        public_no_auth: true,
        token_dependent: true,
    });
    assert.equal(accepted.accepted, true);
    assert.equal(accepted.class, 'strict_sharer');

    const missingProof = classifyCandidate({
        platform: 'spotify',
        endpoint: 'public endpoint',
        field_path: '$.sender.profile.username',
        value: 'actual-user',
    }, {
        platform: 'spotify',
        public_no_auth: true,
        token_dependent: false,
    });
    assert.equal(missingProof.accepted, false);
    assert.equal(missingProof.class, 'unknown');
});

test('strict sharer proof requires an identity leaf, not just sharer context', () => {
    for (const field_path of ['$.sender', '$.sender.url', '$.invitee.profile.username']) {
        const classification = classifyCandidate({
            platform: 'spotify',
            endpoint: 'public endpoint',
            field_path,
            value: field_path === '$.sender' ? { username: 'actual-user' } : 'actual-user',
        }, {
            platform: 'spotify',
            public_no_auth: true,
            token_dependent: true,
        });
        assert.equal(classification.accepted, false, field_path);
    }

    const profileUrl = classifyCandidate({
        platform: 'spotify',
        endpoint: 'public endpoint',
        field_path: '$.sender.profile.url',
        value: 'https://open.spotify.com/user/actual-user',
    }, {
        platform: 'spotify',
        public_no_auth: true,
        token_dependent: true,
    });
    assert.equal(profileUrl.accepted, true);
});

test('current viewer paths are rejected even without a known viewer object', () => {
    const classification = classifyCandidate({
        platform: 'youtube',
        endpoint: 'public endpoint',
        field_path: '$.currentUser.sender.profile.username',
        value: 'logged-in-viewer',
    }, {
        platform: 'youtube',
        public_no_auth: true,
        token_dependent: true,
    });
    assert.equal(classification.accepted, false);
    assert.equal(classification.class, 'current_viewer');
});

test('does not accept incidental host substrings as strict sharer proof', () => {
    for (const field_path of [
        '$.EXPERIMENT_FLAGS.web_enable_ghost_cards_for_chip_bar',
        '$.GAPI_HOST',
        '$.INNERTUBE_CONTEXT.client.remoteHost',
        '$.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_WATCH.hostLanguage',
    ]) {
        const classification = classifyCandidate({
            platform: 'youtube',
            endpoint: 'fixture',
            field_path,
            value: 'not-a-sharer',
        }, {
            platform: 'youtube',
            public_no_auth: true,
            token_dependent: true,
        });
        assert.equal(classification.accepted, false, field_path);
    }
});
