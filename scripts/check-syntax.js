'use strict';
// Parses every project .js file with `node --check` so a syntax
// error fails CI before the test run.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['data', 'js', 'api', 'tests', 'scripts'];
const FILES = ['server.js'];

let failed = 0;
const targets = [
  ...FILES.map(f => path.join(ROOT, f)),
  ...DIRS.flatMap(d => {
    const abs = path.join(ROOT, d);
    return fs.existsSync(abs)
      ? fs.readdirSync(abs).filter(f => f.endsWith('.js')).map(f => path.join(abs, f))
      : [];
  })
];

for (const file of targets) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log('  ok  ' + path.relative(ROOT, file));
  } catch (err) {
    failed++;
    console.error('FAIL  ' + path.relative(ROOT, file));
    console.error(String(err.stderr || err.message));
  }
}

console.log(`\n${targets.length - failed}/${targets.length} files parsed cleanly`);
process.exit(failed ? 1 : 0);
