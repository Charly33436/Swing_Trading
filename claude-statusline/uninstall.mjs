#!/usr/bin/env node
// Removes the statusLine key from settings.json. Usage: node uninstall.mjs [--project]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const project = process.argv.includes('--project');
const claudeDir = project ? path.join(process.cwd(), '.claude') : path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');

if (!fs.existsSync(settingsPath)) {
  console.log(`Nothing to do: ${settingsPath} not found.`);
  process.exit(0);
}
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
if (!('statusLine' in settings)) {
  console.log('Nothing to do: no statusLine configured.');
  process.exit(0);
}
delete settings.statusLine;
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log(`✔ statusLine removed from ${settingsPath}`);
console.log(`  (delete ${path.join(claudeDir, 'statusline.js')} manually for a full cleanup)`);
