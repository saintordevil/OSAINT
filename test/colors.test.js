import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeJsonForTerminal, sanitizeTerminalText, stripAnsi } from '../src/colors.js';

test('terminal sanitization removes remote control sequences and row-breaking characters', () => {
    const malicious = 'Alice\x1b]8;;https://evil.example\x07click\x1b]8;;\x07\nforged\trow\x00\u061c\u202etxt\u2066safe\u2069';
    assert.equal(sanitizeTerminalText(malicious), 'Aliceclick forged rowtxtsafe');
});

test('ANSI stripping handles CSI and OSC sequences while preserving normal line breaks', () => {
    const value = '\x1b[31mred\x1b[0m\n\x1b]0;title\x07plain';
    assert.equal(stripAnsi(value), 'red\nplain');
});

test('JSON terminal escaping preserves values without active controls or separators', () => {
    const payload = { name: 'Alice\u0085\u061c\u2028\u2029\u202etxt\u2066safe\u2069' };
    const serialized = escapeJsonForTerminal(JSON.stringify(payload));

    assert.equal(serialized, '{"name":"Alice\\u0085\\u061c\\u2028\\u2029\\u202etxt\\u2066safe\\u2069"}');
    assert.deepEqual(JSON.parse(serialized), payload);
});
