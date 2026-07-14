import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../osaint.js', import.meta.url));

function runCli(args, timeout = 10_000) {
    return spawnSync(process.execPath, [cliPath, ...args], {
        encoding: 'utf8',
        timeout,
        windowsHide: true,
    });
}

test('CLI returns script-friendly status codes for usage and parser failures', () => {
    const missing = runCli(['--json']);
    assert.equal(missing.status, 2);
    assert.match(JSON.parse(missing.stdout).error, /No URL/i);

    const unsupported = runCli(['https://evil.example/', '--json']);
    assert.equal(unsupported.status, 2);
    assert.match(JSON.parse(unsupported.stdout).error, /Unsupported/i);

    const unavailable = runCli(['https://teams.microsoft.com/l/meetup-join/not-a-meeting/0', '--json']);
    assert.equal(unavailable.status, 1);
    assert.match(JSON.parse(unavailable.stdout).error, /meeting thread ID/i);
});

test('successful offline extraction returns zero and machine-readable JSON', () => {
    const url = 'https://wa.me/447700900000';
    const result = runCli([url, '--json']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).phone_number, '447700900000');
});

test('piped human output avoids interactive animation sleeps', () => {
    const url = 'https://wa.me/447700900000';
    const started = Date.now();
    const result = runCli([url]);
    const elapsed = Date.now() - started;
    assert.equal(result.status, 0, result.stderr);
    assert.ok(elapsed < 1_500, `non-TTY CLI took ${elapsed}ms`);
});

test('invalid customization arguments return usage errors and reject numeric suffix junk', () => {
    assert.equal(runCli(['--set-banner=999']).status, 2);
    assert.equal(runCli(['--set-loading=1junk']).status, 2);
    assert.equal(runCli(['--set-idle=0']).status, 2);
    assert.equal(runCli(['--anim-demo=999']).status, 2);
});
