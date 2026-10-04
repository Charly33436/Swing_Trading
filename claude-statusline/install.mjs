#!/usr/bin/env node
// Copies statusline.js to ~/.claude/ and registers it in settings.json.
// Usage: node install.mjs [--project]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = process.argv.includes('--project');
const claudeDir = project ? path.join(process.cwd(), '.claude') : path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const target = path.join(claudeDir, 'statusline.js');
const toPosix = (p) => p.split(path.sep).join('/');

fs.mkdirSync(claudeDir, { recursive: true });
fs.copyFileSync(path.join(here, 'statusline.js'), target);
try { fs.chmodSync(target, 0o755); } catch { /* windows */ }

let settings = {};
if (fs.existsSync(settingsPath)) {
  const raw = fs.readFileSync(settingsPath, 'utf8');
  try {
    settings = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    console.error(`✖ ${settingsPath} is not valid JSON — fix it and re-run.`);
    process.exit(1);
  }
  fs.writeFileSync(`${settingsPath}.bak`, raw);
}

settings.statusLine = {
  type: 'command',
  command: `node "${toPosix(target)}"`,
  padding: 0,
};
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

console.log(`✔ statusline.js copied to ${target}`);
console.log(`✔ statusLine registered in ${settingsPath}`);
console.log('→ Restart Claude Code (or send a message) to see it.');
