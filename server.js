// ─── LOCAL DEV SERVER ───────────────────────────────
// One command for local development:
//
//   1. put your Groq key in .env   (copy from .env.example)
//   2. node server.js
//   3. open http://localhost:8787
//
// It serves the static site AND the AI endpoint from the same
// origin, so the "Ask AI" and "My sequence" analysis work with
// no extra setup. Requires Node 18+ (built-in fetch).

const http = require('http');
const fs = require('fs');
const path = require('path');

// Minimal .env loader (no dependency).
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split(/\r?\n/)
    .forEach(line => {
      if (/^\s*#/.test(line)) return;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    });
} catch (_) { /* no .env — rely on the real environment */ }

const handler = require('./api/chat.js');
const PORT = process.env.PORT || 8787;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.md': 'text/markdown'
};

function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const abs = path.join(__dirname, path.normalize(rel));
  // Never serve outside the project or from sensitive files.
  if (!abs.startsWith(__dirname) || /(^|[\\/])\.env/.test(rel) || rel.includes('.git')) {
    res.statusCode = 403; return res.end('Forbidden');
  }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(abs)] || 'application/octet-stream');
    // Dev server: never let the browser cache stale JS/CSS between edits.
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  });
}

const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/api/chat')) {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      req.body = raw;
      handler(req, res).catch(err => {
        console.error(err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Server error' }));
      });
    });
    return;
  }
  serveStatic(req, res);
});

srv.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✖  Port ${PORT} is already in use — a server is probably still running.\n`);
    console.error(`     Close the other terminal, or run on another port:  PORT=8788 node server.js`);
    console.error(`     (Windows PowerShell:  $env:PORT=8788; node server.js )\n`);
    process.exit(1);
  }
  throw err;
});

srv.listen(PORT, () => {
  console.log(`\n  ▶  Mutant Melody running at  http://localhost:${PORT}\n`);
  const key = process.env.GROQ_API_KEY || '';
  if (!key.startsWith('gsk_')) {
    console.warn('  ⚠  No valid Groq key in .env yet — the AI tabs will show an error.');
    console.warn('     Open .env and replace PASTE_YOUR_NEW_KEY_HERE with a real key,');
    console.warn('     then restart this command. Everything else works without it.\n');
  } else {
    console.log('  ✓  Groq key loaded — the AI tabs are enabled.\n');
  }
});
