// ─── ANSI COLORS ─────────────────────────────────────────────────────────────

export const R   = "\x1b[31m";
export const G   = "\x1b[32m";
export const Y   = "\x1b[33m";
export const B   = "\x1b[34m";
export const M   = "\x1b[35m";
export const C   = "\x1b[36m";
export const W   = "\x1b[37m";
export const DG  = "\x1b[90m";
export const BR  = "\x1b[91m";
export const BG  = "\x1b[92m";
export const BY  = "\x1b[93m";
export const BB  = "\x1b[94m";
export const BM  = "\x1b[95m";
export const BC  = "\x1b[96m";
export const BW  = "\x1b[97m";
export const BOLD = "\x1b[1m";
export const DIM  = "\x1b[2m";
export const RST  = "\x1b[0m";
export const CLR  = "\x1b[2K";
export const HIDE = "\x1b[?25l";
export const SHOW = "\x1b[?25h";

// Strip terminal escape sequences before measuring or displaying remote text.
const OSC_RE = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
const CSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ESC_RE = /\x1b[@-_]/g;
const BIDI_CONTROL_RE = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gi;
const TERMINAL_JSON_ESCAPE_RE = /[\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/gi;
export function stripAnsi(s) {
    return String(s).replace(OSC_RE, '').replace(CSI_RE, '').replace(ESC_RE, '');
}
export function escapeJsonForTerminal(s) {
    return String(s).replace(TERMINAL_JSON_ESCAPE_RE, char =>
        `\\u${char.codePointAt(0).toString(16).padStart(4, '0')}`,
    );
}
export function sanitizeTerminalText(s) {
    return stripAnsi(s)
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '')
        .replace(BIDI_CONTROL_RE, '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
export function visLen(s) {
    return stripAnsi(s).length;
}
