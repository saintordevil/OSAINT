import test from 'node:test';
import assert from 'node:assert/strict';

import reddit from '../src/modules/reddit.js';

test('Reddit rejects cleartext mobile-share URLs before starting TLS work', async () => {
    const result = await reddit('http://www.reddit.com/r/test/s/example');
    assert.match(result.error, /Invalid Reddit/i);
});
