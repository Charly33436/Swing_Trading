#!/usr/bin/env node
// Preview the status line with sample payloads, without Claude Code.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'statusline.js');
const base = {
  model: { id: 'claude-sonnet-4-5', display_name: 'Sonnet' },
  workspace: { current_dir: process.cwd() },
  cost: { total_cost_usd: 1.87, total_duration_ms: 252000 },
};
const samples = [
  ['Healthy', { ...base, effort: { level: 'high' }, context_window: { used_percentage: 42 }, rate_limits: { five_hour: { used_percentage: 20 }, seven_day: { used_percentage: 35 } } }],
  ['Warning', { ...base, model: { display_name: 'Opus' }, effort: { level: 'xhigh' }, context_window: { used_percentage: 76 }, rate_limits: { five_hour: { used_percentage: 55 }, seven_day: { used_percentage: 82 } } }],
  ['Critical', { ...base, effort: { level: 'max' }, context_window: { used_percentage: 94 }, rate_limits: { five_hour: { used_percentage: 97 }, seven_day: { used_percentage: 91 } } }],
  ['No rate limits / no effort', { ...base, context_window: { context_window_size: 200000, current_usage: { input_tokens: 30000, cache_read_input_tokens: 20000 } } }],
  ['Empty payload', {}],
];
const variants = [['default', {}], ['one line', { CCSL_LINES: '1' }], ['no emoji', { CCSL_NO_EMOJI: '1' }]];

for (const [vname, venv] of variants) {
  console.log(`\n=== ${vname} ===`);
  for (const [name, payload] of samples) {
    const r = spawnSync(process.execPath, [script], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, ...venv } });
    console.log(`\n-- ${name}`);
    process.stdout.write(r.stdout || r.stderr);
  }
}
