import spinners from 'unicode-animations';
import { C, G, R, DG, W, DIM, RST, CLR, HIDE, SHOW } from './colors.js';

const MIN_DISPLAY_MS = 1200;

// ─── PERSISTENT SPINNER ──────────────────────────────────────────────────────
// Two animation types:
//   scan = loading / active work (moving bar)
//   rain = completed / idle (falling dots)
//
// How it works: completed steps are tracked in _lines[]. On every frame,
// we cursor-up to the first tracked line, redraw all of them with the current
// rain frame, then redraw the active line at the bottom with scan.

export class Spinner {
    constructor() {
        this._timer = null;
        this._fi = 0;
        this._msg = '';
        this._running = false;
        this._mode = 'scan';
        this._lines = [];       // {text, isError} - completed step lines
        this._linesOnScreen = 0; // how many lines are currently rendered
    }

    // Start spinner with a loading message
    loading(msg) {
        this._msg = msg;
        this._mode = 'scan';
        if (!this._running) {
            this._running = true;
            this._fi = 0;
            this._linesOnScreen = 0;
            process.stdout.write(HIDE);
        }
        this._restartTimer();
    }

    // Switch to idle rain animation
    idle(msg) {
        this._msg = msg || '';
        this._mode = 'rain';
        if (!this._running) {
            this._running = true;
            this._fi = 0;
            process.stdout.write(HIDE);
        }
        this._restartTimer();
    }

    // Mark current step as done, track it for rain animation
    done(msg) {
        this._lines.push({ text: msg, isError: false });
        // Print new completed line - push active line down
        this._clearTimer();
        process.stdout.write(`\r${CLR}\n`); // blank line for new active position
        this._linesOnScreen = this._lines.length;
        this._restartTimer();
    }

    // Mark current step as failed
    fail(msg, detail) {
        const text = detail ? `${msg} ${DG}:: ${DIM}${W}${detail}${RST}` : msg;
        this._lines.push({ text, isError: true });
        this._clearTimer();
        process.stdout.write(`\r${CLR}\n`);
        this._linesOnScreen = this._lines.length;
        this._restartTimer();
    }

    update(msg) { this._msg = msg; }

    // Stop all animation and show cursor
    stop() {
        if (!this._running) return;
        this._running = false;
        this._clearTimer();
        process.stdout.write(`\r${CLR}${SHOW}`);
    }

    // Reset tracked lines for a new analysis
    reset() {
        this._lines = [];
        this._linesOnScreen = 0;
    }

    _clearTimer() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
    }

    _restartTimer() {
        this._clearTimer();
        this._timer = setInterval(() => this._draw(), 100);
    }

    _draw() {
        const rainFrames = spinners.rain.frames;
        const scanFrames = spinners.scan.frames;
        const rf = rainFrames[this._fi % rainFrames.length];
        const sf = scanFrames[this._fi % scanFrames.length];

        // Move cursor up to redraw all tracked lines + active line
        const upCount = this._linesOnScreen; // lines above the active line
        if (upCount > 0) {
            process.stdout.write(`\x1b[${upCount}A`);
        }

        // Redraw all completed lines with rain
        for (const ln of this._lines) {
            const color = ln.isError ? R : C;
            const textColor = ln.isError ? R : W;
            process.stdout.write(`\r${CLR}   ${color}${rf}${RST}  ${textColor}${ln.text}${RST}\n`);
        }

        // Redraw active line
        if (this._msg) {
            const frame = this._mode === 'scan' ? sf : rf;
            process.stdout.write(`\r${CLR}   ${C}${frame}${RST}  ${DIM}${W}${this._msg}${RST}`);
        } else {
            process.stdout.write(`\r${CLR}`);
        }

        this._fi++;
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
        if (elapsed < MIN_DISPLAY_MS) {
            await new Promise(r => setTimeout(r, MIN_DISPLAY_MS - elapsed));
        }
        s.done(opts.doneMsg || label);
        return result;
    } catch (err) {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_DISPLAY_MS) {
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
