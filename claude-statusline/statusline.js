#!/usr/bin/env node
// Claude Code status line — zero dependency, cross-platform (Node >= 18).
// Reads the JSON Claude Code pipes on stdin, prints one or two ANSI lines.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// ---------- config ----------
const env = process.env;
const NO_COLOR = Boolean(env.NO_COLOR);
const NO_EMOJI = env.CCSL_NO_EMOJI === '1';
const NERD = env.CCSL_NERD_FONTS === '1';
const HIDE = new Set((env.CCSL_HIDE || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
const BAR_WIDTH = clamp(parseInt(env.CCSL_BAR_WIDTH, 10) || 10, 4, 40);
const LINES = env.CCSL_LINES === '1' ? 1 : 2;
const GIT_TTL_MS = 5000;

// ---------- colors ----------
const code = (n) => (s) => (NO_COLOR || s === '' ? String(s) : `\x1b[${n}m${s}\x1b[0m`);
const c = {
  bold: code(1), dim: code(2),
  red: code(31), green: code(32), yellow: code(33), blue: code(34),
  magenta: code(35), cyan: code(36), gray: code(90),
  boldRed: code('1;31'), boldCyan: code('1;36'),
};

// ---------- icons ----------
const ICONS = NERD
  ? { model: '', dir: '', git: '', cost: '', time: '', five: '', week: '' }
  : NO_EMOJI
    ? { model: '*', dir: 'dir:', git: 'git:', cost: '', time: 't:', five: '', week: '' }
    : { model: '◆', dir: '📁', git: '🌿', cost: '💰', time: '⏱', five: '⏳', week: '📅' };
const ico = (k) => (ICONS[k] ? ICONS[k] + ' ' : '');
const SEP = c.gray(NO_EMOJI && !NERD ? ' | ' : '  ·  ');

// ---------- helpers ----------
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function pctColor(p) {
  if (p >= 90) return c.red;
  if (p >= 70) return c.yellow;
  return c.green;
}

function bar(pct, width = BAR_WIDTH) {
  const p = clamp(pct, 0, 100);
  const filled = Math.round((p / 100) * width);
  const full = NO_EMOJI && !NERD ? '#' : '█';
  const empty = NO_EMOJI && !NERD ? '-' : '░';
  return pctColor(p)(full.repeat(filled)) + c.gray(empty.repeat(width - filled));
}

function fmtPct(pct) { return pctColor(pct)(`${Math.round(pct)}%`); }

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtCost(usd) {
  return usd >= 10 ? `$${usd.toFixed(1)}` : `$${usd.toFixed(2)}`;
}

function shortModel(m) {
  const name = (m && (m.display_name || m.id)) || 'Claude';
  // "Claude Sonnet 4.5" -> "Sonnet 4.5"; "claude-opus-..." stays readable
  return String(name).replace(/^Claude\s+/i, '');
}

// ---------- effort ----------
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const EFFORT_COLOR = { low: c.green, medium: c.cyan, high: c.yellow, xhigh: c.magenta, max: c.boldRed };

function readEffort(d) {
  const candidates = [
    d.effort && typeof d.effort === 'object' ? d.effort.level : d.effort,
    d.model && d.model.effort,
    d.reasoning_effort,
    d.effort_level,
    env.CLAUDE_CODE_EFFORT_LEVEL,
  ];
  for (const v of candidates) {
    if (typeof v === 'string' && EFFORTS.includes(v.toLowerCase())) return v.toLowerCase();
  }
  return null;
}

function effortSegment(level, withDots) {
  const color = EFFORT_COLOR[level];
  let out = color(level);
  if (withDots) {
    const n = EFFORTS.indexOf(level) + 1;
    const on = NO_EMOJI && !NERD ? '*' : '●';
    const off = NO_EMOJI && !NERD ? '.' : '○';
    out += ' ' + color(on.repeat(n)) + c.gray(off.repeat(EFFORTS.length - n));
  }
  return out;
}

// ---------- context ----------
function contextPct(d) {
  const cw = d.context_window || {};
  const direct = num(cw.used_percentage);
  if (direct !== null) return direct;
  const size = num(cw.context_window_size);
  const u = cw.current_usage;
  if (size && u && typeof u === 'object') {
    const used = (num(u.input_tokens) || 0) + (num(u.cache_creation_input_tokens) || 0) + (num(u.cache_read_input_tokens) || 0);
    return (used / size) * 100;
  }
  const remaining = num(cw.remaining_percentage);
  return remaining !== null ? 100 - remaining : null;
}

// ---------- rate limits ----------
function ratePct(d, key) {
  const rl = d.rate_limits || {};
  const v = rl[key];
  if (v == null) return null;
  if (typeof v === 'number') return v;
  return num(v.used_percentage ?? v.utilization ?? v.percent);
}

// ---------- git (cached) ----------
function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
}

function gitInfo(cwd) {
  const key = crypto.createHash('md5').update(cwd).digest('hex').slice(0, 12);
  const cacheFile = path.join(os.tmpdir(), `ccsl-git-${key}.json`);
  try {
    const st = fs.statSync(cacheFile);
    if (Date.now() - st.mtimeMs < GIT_TTL_MS) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch { /* no cache */ }

  let info = null;
  try {
    const out = git(['status', '--porcelain=v1', '--branch'], cwd);
    const lines = out.split('\n').filter(Boolean);
    let branch = '';
    let staged = 0, modified = 0, untracked = 0;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        branch = line.slice(3).split('...')[0];
        if (branch.startsWith('No commits yet on ')) branch = branch.slice(18);
        if (branch.startsWith('HEAD (no branch)')) {
          try { branch = git(['rev-parse', '--short', 'HEAD'], cwd).trim(); } catch { branch = 'HEAD'; }
        }
        continue;
      }
      const x = line[0], y = line[1];
      if (x === '?' && y === '?') { untracked++; continue; }
      if (x !== ' ') staged++;
      if (y !== ' ') modified++;
    }
    info = { branch, staged, modified, untracked };
  } catch { info = null; }

  try { fs.writeFileSync(cacheFile, JSON.stringify(info)); } catch { /* ignore */ }
  return info;
}

function gitSegment(g) {
  let s = `${ICONS.git} ${c.boldCyan(g.branch)}`;
  const parts = [];
  if (g.staged) parts.push(c.green(`+${g.staged}`));
  if (g.modified) parts.push(c.yellow(`~${g.modified}`));
  if (g.untracked) parts.push(c.gray(`?${g.untracked}`));
  if (parts.length) s += ' ' + parts.join(' ');
  return s;
}

// ---------- render ----------
function render(d) {
  const cwd = (d.workspace && d.workspace.current_dir) || d.cwd || process.cwd();
  const oneLine = LINES === 1;

  // identity segments
  const ident = [];
  let model = `${c.magenta(ICONS.model)} ${c.bold(shortModel(d.model))}`;
  const effort = HIDE.has('effort') ? null : readEffort(d);
  if (effort) model += c.gray(' · ') + effortSegment(effort, !oneLine);
  ident.push(model);
  ident.push(`${ICONS.dir} ${c.blue(path.basename(cwd) || cwd)}`);
  if (!HIDE.has('git')) {
    const g = gitInfo(cwd);
    if (g && g.branch) ident.push(gitSegment(g));
  }

  // metric segments
  const metrics = [];
  const ctx = contextPct(d);
  if (!HIDE.has('context')) {
    metrics.push(ctx === null ? `${bar(0)} ${c.gray('--')}` : `${bar(ctx)} ${fmtPct(ctx)}`);
  }
  const cost = num(d.cost && d.cost.total_cost_usd);
  if (!HIDE.has('cost') && cost !== null) metrics.push(`${ico('cost')}${fmtCost(cost)}`);
  const dur = num(d.cost && d.cost.total_duration_ms);
  if (!HIDE.has('duration') && dur !== null) metrics.push(`${ico('time')}${fmtDuration(dur)}`);
  if (!HIDE.has('ratelimit')) {
    const five = ratePct(d, 'five_hour');
    if (five !== null) metrics.push(`${ico('five')}5h ${bar(five)} ${fmtPct(five)}`);
    const week = ratePct(d, 'seven_day');
    if (week !== null) metrics.push(`${ico('week')}7d ${bar(week)} ${fmtPct(week)}`);
  }

  const identLine = ident.join('   ');
  if (oneLine) return [identLine, ...metrics].join(SEP);
  return metrics.length ? `${identLine}\n${metrics.join(SEP)}` : identLine;
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    let data = {};
    try { data = input.trim() ? JSON.parse(input) : {}; } catch { data = {}; }
    try {
      process.stdout.write(render(data) + '\n');
    } catch (e) {
      process.stdout.write(`◆ Claude  ${c.red('statusline error')}\n`);
      if (env.CCSL_DEBUG) process.stderr.write(String(e && e.stack) + '\n');
    }
  });
}

if (require.main === module) main();
module.exports = { render };
