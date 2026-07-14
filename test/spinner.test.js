import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogUpdate } from 'log-update';

import { runStep, Spinner } from '../src/spinner.js';
import { stripAnsi } from '../src/colors.js';

const loadingAnimation = {
    frames: ['LOAD-0', 'LOAD-1'],
    interval: 80,
};

const idleAnimation = {
    frames: ['IDLE-0', 'IDLE-1'],
    interval: 100,
};

function createHarness({ isTTY = true } = {}) {
    const frames = [];
    const writes = [];
    const lifecycle = { clear: 0, done: 0 };
    const timers = { callback: null, scheduled: 0, cleared: 0 };

    const renderer = (text) => frames.push(String(text));
    renderer.clear = () => { lifecycle.clear++; };
    renderer.done = () => { lifecycle.done++; };

    const stream = {
        isTTY,
        columns: 80,
        rows: 24,
        write(chunk) {
            writes.push(String(chunk));
            return true;
        },
    };

    const spinner = new Spinner({
        stream,
        renderer,
        loadingAnimation,
        idleAnimation,
        setIntervalFn(callback) {
            timers.callback = callback;
            timers.scheduled++;
            return timers.scheduled;
        },
        clearIntervalFn() {
            timers.callback = null;
            timers.cleared++;
        },
    });

    return { spinner, frames, writes, lifecycle, timers };
}

test('managed live region refreshes continuously with the active row last', () => {
    const { spinner, frames, lifecycle, timers } = createHarness();

    try {
        spinner.loading('Loading module');
        assert.equal(timers.scheduled, 1);
        assert.match(stripAnsi(frames.at(-1)), /LOAD-0\s+Loading module/);

        timers.callback();
        assert.match(stripAnsi(frames.at(-1)), /LOAD-1\s+Loading module/);

        spinner.done('Module loaded');
        let rows = stripAnsi(frames.at(-1)).split('\n');
        assert.equal(rows.length, 1);
        assert.match(rows[0], /IDLE-[01]\s+Module loaded/);
        assert.doesNotMatch(rows[0], /Loading module/);

        const completedFrame = frames.at(-1);
        timers.callback();
        assert.notEqual(frames.at(-1), completedFrame);

        spinner.loading('Analyzing share link');
        assert.equal(timers.scheduled, 1);
        rows = stripAnsi(frames.at(-1)).split('\n');
        assert.equal(rows.length, 2);
        assert.match(rows[0], /IDLE-[01]\s+Module loaded/);
        assert.match(rows[1], /LOAD-[01]\s+Analyzing share link/);

        timers.callback();
        assert.notEqual(frames.at(-1), frames.at(-2));
    } finally {
        spinner.stop();
    }

    assert.equal(lifecycle.done, 1);
    assert.equal(timers.cleared, 1);
    assert.equal(timers.callback, null);
});

test('non-TTY mode prints completed steps once without animation control codes', () => {
    const { spinner, frames, writes, lifecycle, timers } = createHarness({ isTTY: false });

    spinner.loading('Hidden active work');
    spinner.done('First step');
    spinner.loading('Hidden failing work');
    spinner.fail('Second step', 'network unavailable');
    spinner.idle('');
    spinner.stop();

    const output = writes.join('');
    const lines = output.trimEnd().split('\n');

    assert.equal(timers.scheduled, 0);
    assert.equal(frames.length, 0);
    assert.equal(lifecycle.done, 0);
    assert.equal(lines.length, 2);
    assert.match(lines[0], /First step/);
    assert.match(lines[1], /Second step.*network unavailable/);
    assert.doesNotMatch(output, /\x1b\[[0-9;?]*[A-HJKSTfhilmn]/);
    assert.doesNotMatch(output, /\r/);
});

test('non-TTY steps do not incur cosmetic animation delays', async () => {
    const started = Date.now();
    await runStep('Fast non-TTY step', async () => 'done');
    assert.ok(Date.now() - started < 250, 'non-TTY step waited for the animation minimum');
});

test('reset clears a running live region and starts the next run cleanly', () => {
    const { spinner, frames, lifecycle, timers } = createHarness();

    try {
        spinner.loading('Old task');
        spinner.done('Old result');
        spinner.reset();

        assert.equal(lifecycle.clear, 1);
        assert.equal(lifecycle.done, 1);
        assert.equal(timers.callback, null);

        spinner.loading('New task');
        const rows = stripAnsi(frames.at(-1)).split('\n');
        assert.equal(rows.length, 1);
        assert.match(rows[0], /New task/);
        assert.doesNotMatch(rows[0], /Old result/);
    } finally {
        spinner.stop();
    }

    assert.equal(lifecycle.done, 2);
});

test('real log-update renderer handles wrapping and terminal width changes', () => {
    const chunks = [];
    const stream = {
        isTTY: true,
        columns: 24,
        rows: 6,
        write(chunk) {
            chunks.push(String(chunk));
            return true;
        },
    };
    const renderer = createLogUpdate(stream, { showCursor: true });
    let tick = null;
    const spinner = new Spinner({
        stream,
        renderer,
        loadingAnimation,
        idleAnimation,
        setIntervalFn(callback) {
            tick = callback;
            return 1;
        },
        clearIntervalFn() {
            tick = null;
        },
    });

    try {
        spinner.loading('Loading a deliberately long module name');
        tick();
        spinner.done('Long module loaded');
        stream.columns = 16;
        spinner.loading('Analyzing link');
        tick();
    } finally {
        spinner.stop();
    }

    const transcript = chunks.join('');
    const plain = transcript
        .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
        .replace(/\s+/g, ' ');
    const compact = plain.replace(/\s/g, '');
    assert.match(compact, /Loadingadeliberatelylongmodulename/);
    assert.match(compact, /Longmoduleloaded/);
    assert.match(compact, /Analyzinglink/);
    assert.match(transcript, /\x1b\[2K/);
    assert.equal(tick, null);
    assert.ok(chunks.length <= 6);
});
