// ─── AI BACKEND ─────────────────────────────────────
// Serverless function (Vercel / Netlify Node runtime style).
// The Groq API key is read from the environment and never
// leaves this process. Deploy this and set DDM_CONFIG.apiBase
// in data/config.js to the deployment origin.
//
// Local dev:  `node server.js`  (see server.js) exposes the
// same handler at http://localhost:8787/api/chat.

const { DISEASES } = require('../data/diseases.js');

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
// Groq retires models over time. Override with the GROQ_MODEL env var
// if this one is decommissioned — see `curl .../openai/v1/models`.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const MAX_MESSAGES     = 12;
const MAX_MESSAGE_CHARS = 500;
const MAX_SEQUENCE_CHARS = 500;
const MAX_REPLY_TOKENS  = 800;   // headroom: reasoning models spend some of this internally

// Very small in-memory rate limiter (per warm instance).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX       = 20;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const bucket = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  bucket.push(now);
  hits.set(ip, bucket);
  return bucket.length > RATE_MAX;
}

function allowOrigin(origin) {
  const list = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return null;             // same-origin only
  return list.includes(origin) ? origin : false;
}

const DISCLAIMER =
  'Rules: This is an educational demo. Do not diagnose, do not give medical advice, '
  + 'and do not claim to identify a protein with certainty from a short sequence or its '
  + 'amino-acid composition alone. Be explicit about uncertainty. If asked what a sequence '
  + 'is, explain that reliable identification needs sequence-alignment/database tools such '
  + 'as BLAST or a UniProt search. Keep answers to 3–5 plain-English sentences.';

function diseasePrompt(key) {
  const d = DISEASES[key];
  if (!d) return null;
  const m = d.mutation;
  const change = m.type === 'deletion'
    ? `deletion of ${m.from} at position ${m.biologicalPosition}`
    : `${m.from}${m.biologicalPosition}${m.to} substitution`;
  return `You are a warm science guide inside "Disease in D Minor", an app that turns `
    + `protein mutations into music using a simplified educational mapping of amino-acid `
    + `chemical groups to pitch (this mapping is illustrative, not a physical measurement). `
    + `The user is exploring ${d.name}. Mutation: ${change}. `
    + `Healthy window: ${d.healthy.seq}. `
    + `Connect biology to the musical change when it helps. ${DISCLAIMER}`;
}

function customPrompt(sequence, stats) {
  return `You are a biology guide in a protein sonification app. The user pasted an `
    + `amino-acid sequence. You are given only its composition, not its identity. `
    + `Sequence (${sequence.length} residues): ${sequence}. `
    + `Composition — nonpolar ${stats.nonpolar}, polar ${stats.polar}, `
    + `positive ${stats.positive}, negative ${stats.negative}, `
    + `simplified charge balance ${stats.chargeBalance}. `
    + `Describe what the composition suggests in general terms (e.g. hydrophobic vs charged `
    + `character), and what is musically interesting about the pattern under this app's `
    + `mapping. Do NOT guess a specific protein name or function with confidence. `
    + `End by noting that real identification needs BLAST or a UniProt search. ${DISCLAIMER}`;
}

function isMessageArray(x) {
  return Array.isArray(x) && x.length > 0 && x.length <= MAX_MESSAGES
    && x.every(m => m && (m.role === 'user' || m.role === 'assistant')
      && typeof m.content === 'string'
      && m.content.length > 0 && m.content.length <= MAX_MESSAGE_CHARS);
}

async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = allowOrigin(origin);
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' })); }
  if (allowed === false) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'Origin not allowed' })); }

  if (!process.env.GROQ_API_KEY || !process.env.GROQ_API_KEY.startsWith('gsk_')) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Backend has no valid GROQ_API_KEY set' }));
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
  }

  let body = req.body;
  if (typeof body === 'string' || body == null) {
    try { body = JSON.parse(body || '{}'); }
    catch (_) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid JSON' })); }
  }

  let systemPrompt, messages;

  // Infer the mode if a stale client omitted it.
  const mode = body.mode
    || (typeof body.sequence === 'string' ? 'custom' : null)
    || (Array.isArray(body.messages) ? 'disease' : null);

  if (mode === 'disease') {
    systemPrompt = diseasePrompt(body.disease);
    if (!systemPrompt) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Unknown disease' })); }
    if (!isMessageArray(body.messages)) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid messages' })); }
    messages = body.messages;
  } else if (mode === 'custom') {
    const seq = typeof body.sequence === 'string' ? body.sequence.toUpperCase() : '';
    if (!/^[ACDEFGHIKLMNPQRSTVWY]{3,}$/.test(seq) || seq.length > MAX_SEQUENCE_CHARS) {
      res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid sequence' }));
    }
    const s = body.stats || {};
    const stats = {
      nonpolar: +s.nonpolar || 0, polar: +s.polar || 0,
      positive: +s.positive || 0, negative: +s.negative || 0,
      chargeBalance: Number.isFinite(+s.chargeBalance) ? +s.chargeBalance : 0
    };
    systemPrompt = customPrompt(seq, stats);
    messages = [{ role: 'user', content: `Explain this sequence's composition and how it would sound.` }];
  } else {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Request must include mode "disease" or "custom"' }));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let groqRes;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: MAX_REPLY_TOKENS,
        // gpt-oss / qwen are reasoning models; keep the hidden reasoning
        // short so the visible answer fits inside max_tokens.
        reasoning_effort: 'low',
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeout);
    res.statusCode = err.name === 'AbortError' ? 504 : 502;
    return res.end(JSON.stringify({ error: 'Upstream AI request failed' }));
  }
  clearTimeout(timeout);

  if (!groqRes.ok) {
    let upstream = '';
    try { upstream = (await groqRes.json())?.error?.message || ''; } catch (_) { /* ignore */ }
    res.statusCode = groqRes.status === 429 ? 429 : 502;
    return res.end(JSON.stringify({
      error: upstream ? `Upstream AI error: ${upstream}` : `Upstream AI error (${groqRes.status})`
    }));
  }

  let data;
  try { data = await groqRes.json(); }
  catch (_) { res.statusCode = 502; return res.end(JSON.stringify({ error: 'Unreadable AI response' })); }

  const msg = data?.choices?.[0]?.message || {};
  const reply = (msg.content && msg.content.trim()) || (msg.reasoning && msg.reasoning.trim());
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ reply: reply || 'Sorry — no answer came back. Please try again.' }));
}

module.exports = handler;
module.exports.default = handler;
