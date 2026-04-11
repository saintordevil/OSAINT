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

// Strip ANSI codes for length calculation
const ANSI_RE = /\x1b\[[^m]*m/g;
export function stripAnsi(s) {
    return s.replace(ANSI_RE, "");
}
export function visLen(s) {
    return stripAnsi(s).length;
}
