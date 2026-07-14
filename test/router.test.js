import test from 'node:test';
import assert from 'node:assert/strict';

import { detectPlatform } from '../src/router.js';

const maliciousEmbeds = [
    ['tiktok', 'https://vm.tiktok.com/abc/'],
    ['instagram', 'https://www.instagram.com/reel/abc/'],
    ['xiaohongshu', 'https://xhslink.com/a/abc'],
    ['discord', 'https://discord.gg/example'],
    ['claude', 'https://claude.ai/share/00000000-0000-0000-0000-000000000000'],
    ['perplexity', 'https://www.perplexity.ai/search/example'],
    ['pinterest', 'https://pin.it/example'],
    ['substack', 'https://substack.com/@author/note/c-123'],
    ['suno', 'https://suno.com/s/example'],
    ['telegram', 'https://t.me/joinchat/AQAAAA'],
    ['twitch', 'https://clips.twitch.tv/Example'],
    ['reddit', 'https://www.reddit.com/r/test/s/example'],
];

test('platform detection only examines the submitted URL host and path', () => {
    for (const [platform, embedded] of maliciousEmbeds) {
        const input = `https://evil.example/redirect?next=${embedded}`;
        assert.equal(detectPlatform(input), null, `${platform} false-routed an unrelated URL`);
    }
});

test('valid supported URLs still route with and without an explicit scheme', () => {
    assert.equal(detectPlatform('https://vm.tiktok.com/ZMexample/')?.name, 'tiktok');
    assert.equal(detectPlatform('www.instagram.com/reel/example/')?.name, 'instagram');
    assert.equal(detectPlatform('https://www.youtube.com/clip/UgkxExample')?.name, 'youtube');
    assert.equal(detectPlatform('https://music.163.com/#/song?id=123&userid=456')?.name, 'netease');
});

test('non-web and credential-confused URLs are rejected', () => {
    assert.equal(detectPlatform('javascript:https://vm.tiktok.com/example/'), null);
    assert.equal(detectPlatform('https://vm.tiktok.com@evil.example/example/'), null);
    assert.equal(detectPlatform('ftp://vm.tiktok.com/example/'), null);
    assert.equal(detectPlatform('http://vm.tiktok.com/example/'), null);
});
