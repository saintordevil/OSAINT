import test from 'node:test';
import assert from 'node:assert/strict';

import claude, { parseClaudeShareUrl } from '../src/modules/claude.js';
import { detectPlatform } from '../src/router.js';

test('Claude www share URLs route and parse through the same exact host contract', async () => {
    const url = 'https://www.claude.ai/share/00000000-0000-0000-0000-000000000000';
    assert.equal(detectPlatform(url)?.name, 'claude');
    assert.equal(parseClaudeShareUrl(url), '00000000-0000-0000-0000-000000000000');

    const result = await claude(url, {
        fetchTls: async () => ({
            ok: true,
            json: async () => ({ creator: { full_name: 'Alice', uuid: 'user-123' } }),
        }),
    });
    assert.deepEqual(result.data, { name: 'Alice', user_id: 'user-123' });
});

test('Claude parser rejects cleartext and lookalike hosts', () => {
    assert.equal(parseClaudeShareUrl('http://claude.ai/share/00000000-0000-0000-0000-000000000000'), null);
    assert.equal(parseClaudeShareUrl('https://claude.ai.evil.example/share/00000000-0000-0000-0000-000000000000'), null);
});
