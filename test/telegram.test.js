import test from 'node:test';
import assert from 'node:assert/strict';

import telegram from '../src/modules/telegram.js';

test('Telegram invite hashes are treated as opaque, not decoded into fake creator IDs', async () => {
    const result = await telegram('https://t.me/joinchat/AQAAAA');
    assert.equal(result.data, undefined);
    assert.match(result.error, /opaque|does not encode|cannot.*creator/i);
});
