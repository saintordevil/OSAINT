import { createLogUpdate } from 'log-update';
import { getSelectedAnimations } from './animations.js';
import { C, R, DG, W, DIM, RST, stripAnsi } from './colors.js';

const MIN_DISPLAY_MS = 1200;

// ─── PERSISTENT SPINNER ──────────────────────────────────────────────────────
// Two animation types:
//   loading = active work (configurable, default: scan)
//   idle    = completed / done lines (configurable, default: rain)
//
// A single managed live region contains completed rows and one active bottom
// row. log-update owns terminal wrapping and cursor restoration.

export class Spinner {
    constructor({
        stream = process.stdout,
        renderer = null,
        loadingAnimation = null,
        idleAnimation = null,
        setIntervalFn = setInterval,
        clearIntervalFn = clearInterval,
    } = {}) {
        this._stream = stream;
        this._isTTY = Boolean(stream.isTTY);
        this._setInterval = setIntervalFn;
        this._clearInterval = clearIntervalFn;
        this._timer = null;
        this._fi = 0;
        this._msg = '';
        this._running = false;
        this._mode = 'scan';
        this._lines = [];

        if (!loadingAnimation || !idleAnimation) {
            const selected = getSelectedAnimations();
            loadingAnimation ||= selected.loading;
            idleAnimation ||= selected.idle;
        }
        this._loadingAnim = loadingAnimation;
        this._idleAnim = idleAnimation;
        this._renderer = renderer || (
            this._isTTY ? createLogUpdate(this._stream, { showCursor: false }) : null
        );
    }

    get isTTY() {
        return this._isTTY;
    }

    // Start spinner with a loading message
    loading(msg) {
        this._msg = msg;
        this._mode = 'scan';
        this._start();
        this._draw();
    }

    // Switch to idle rain animation
    idle(msg) {
        this._msg = msg || '';
        this._mode = 'rain';
        this._start();
        this._draw();
    }

    // Mark current step as done, track it for rain animation
    done(msg) {
        const line = { text: msg, isError: false };
        this._lines.push(line);
        this._msg = '';
        if (this._isTTY) this._draw();
        else this._writeStatic(line);
    }

    // Mark current step as failed
    fail(msg, detail) {
        const text = detail ? `${msg} ${DG}:: ${DIM}${W}${detail}${RST}` : msg;
        const line = { text, isError: true };
        this._lines.push(line);
        this._msg = '';
        if (this._isTTY) this._draw();
        else this._writeStatic(line);
    }

    update(msg) {
        this._msg = msg;
        this._draw();
    }

    // Stop all animation and show cursor
    stop() {
        if (!this._running) return;
        this._running = false;
        this._clearTimer();
        if (this._isTTY && this._renderer) {
            this._draw();
            this._renderer.done();
        }
    }

    // Reset tracked lines for a new analysis
    reset() {
        const wasRunning = this._running;
        this._running = false;
        this._clearTimer();
        if (wasRunning && this._isTTY && this._renderer) {
            this._renderer.clear();
            this._renderer.done();
        }
        this._lines = [];
        this._msg = '';
        this._mode = 'scan';
        this._fi = 0;
    }

    _clearTimer() {
        if (this._timer) {
            this._clearInterval(this._timer);
            this._timer = null;
        }
    }

    _start() {
        if (!this._running) {
            this._running = true;
            this._fi = 0;
        }
        if (!this._isTTY || this._timer) return;
        const tick = Math.min(this._loadingAnim.interval, this._idleAnim.interval);
        this._timer = this._setInterval(() => this._draw(), tick);
    }

    _draw() {
        if (!this._isTTY || !this._renderer) return;
        const idleFrames    = this._idleAnim.frames;
        const loadingFrames = this._loadingAnim.frames;
        const rf = idleFrames[this._fi % idleFrames.length];
        const sf = loadingFrames[this._fi % loadingFrames.length];
        const rows = [];

        for (const ln of this._lines) {
            const color = ln.isError ? R : C;
            const textColor = ln.isError ? R : W;
            rows.push(`   ${color}${rf}${RST}  ${textColor}${ln.text}${RST}`);
        }

        if (this._msg) {
            const frame = this._mode === 'scan' ? sf : rf;
            rows.push(`   ${C}${frame}${RST}  ${DIM}${W}${this._msg}${RST}`);
        }

        if (rows.length) this._renderer(rows.join('\n'));
        else this._renderer.clear();
        this._fi++;
    }

    _writeStatic(line) {
        const frame = this._idleAnim.frames[0];
        const color = line.isError ? R : C;
        const textColor = line.isError ? R : W;
        const output = `   ${color}${frame}${RST}  ${textColor}${line.text}${RST}`;
        this._stream.write(`${stripAnsi(output)}\n`);
    }
}

// ─── STEP RUNNER ─────────────────────────────────────────────────────────────

let _shared = null;

export function getSpinner() {
    if (!_shared) _shared = new Spinner();
    return _shared;
}

export async function runStep(label, fn, opts = {}) {
    const s = getSpinner();
    s.loading(label);

    const start = Date.now();
    try {
        const result = await fn();
        const elapsed = Date.now() - start;
        if (s.isTTY && elapsed < MIN_DISPLAY_MS) {
            await new Promise(r => setTimeout(r, MIN_DISPLAY_MS - elapsed));
        }
        s.done(opts.doneMsg || label);
        return result;
    } catch (err) {
        const elapsed = Date.now() - start;
        if (s.isTTY && elapsed < MIN_DISPLAY_MS) {
            await new Promise(r => setTimeout(r, MIN_DISPLAY_MS - elapsed));
        }
        s.fail(label, err.message);
        throw err;
    }
}

export function resetSteps() {
    if (_shared) _shared.reset();
}

export { MIN_DISPLAY_MS };
