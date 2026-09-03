// ─── AI CLIENT ──────────────────────────────────────
// Talks to a small server-side endpoint (api/chat.js), never
// to the AI provider directly. No API key is present in this
// file or anywhere else in the browser bundle.
//
// If no backend is configured (MM_CONFIG.apiBase is empty),
// the AI features degrade to a clear "not configured" message
// and the rest of the app is unaffected.

let chatHistory = [];
let aiRequestInFlight = false;

function aiConfig() {
  return window.MM_CONFIG || {};
}

function aiBackendConfigured() {
  return typeof aiConfig().apiBase === 'string' && aiConfig().apiBase.trim().length > 0;
}

function setAiStatus(text) {
  const el = document.getElementById('ai-status-text');
  if (el) el.textContent = text;
}

const AI_UNAVAILABLE_MSG =
  'The AI backend is not configured for this deployment, so explanations are turned off here. '
  + 'Every other feature — listening, comparing, custom sequences and the quiz — works without it. '
  + 'See the README ("AI backend") to enable it.';

// POST to the backend. Returns { reply } or throws a friendly Error.
async function requestAi(payload) {
  const cfg = aiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.requestTimeoutMs || 20000);

  let response;
  try {
    response = await fetch(cfg.apiBase.replace(/\/$/, '') + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('The AI request timed out. Please try again.');
    throw new Error('Could not reach the AI backend. Check your connection and try again.');
  }
  clearTimeout(timeout);

  if (response.status === 429) throw new Error('The AI backend is rate-limited right now. Wait a moment and try again.');
  if (response.status === 401 || response.status === 403) throw new Error('The AI backend rejected the request (auth). This is a deployment configuration issue.');
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error || ''; } catch (_) { /* ignore */ }
    throw new Error(detail
      ? `AI backend error (${response.status}): ${detail}`
      : `The AI backend returned an error (${response.status}).`);
  }

  let data;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error('The AI backend sent an unreadable response.');
  }
  const reply = data && typeof data.reply === 'string' ? data.reply.trim() : '';
  if (!reply) throw new Error('The AI backend sent an empty response.');
  return reply;
}

// ─── CHAT ────────────────────────────────────────────
async function doChat() {
  const input   = document.getElementById('chat-in');
  const sendBtn = document.getElementById('ask-btn');
  const cfg     = aiConfig();

  const question = input.value.trim().slice(0, cfg.maxChatChars || 500);
  if (!question || aiRequestInFlight) return;

  input.value = '';
  chatHistory.push({ role: 'user', content: question });
  renderChat();

  if (!aiBackendConfigured()) {
    chatHistory.push({ role: 'assistant', content: AI_UNAVAILABLE_MSG });
    renderChat();
    return;
  }

  aiRequestInFlight = true;
  sendBtn.disabled = true;
  setAiStatus('Thinking…');

  const chatBody = document.getElementById('chat-body');
  const loader = document.createElement('div');
  loader.className = 'msg';
  loader.id = 'loader-msg';
  const who = document.createElement('div');
  who.className = 'msg-who ai';
  who.textContent = 'AI guide';
  const dots = document.createElement('div');
  dots.className = 'msg-text';
  dots.innerHTML = '<div class="dot-loader"><div class="dl"></div><div class="dl"></div><div class="dl"></div></div>';
  loader.append(who, dots);
  chatBody.appendChild(loader);
  chatBody.scrollTop = chatBody.scrollHeight;

  const maxHistory = cfg.maxChatHistory || 12;
  try {
    const reply = await requestAi({
      mode: 'disease',
      disease: curDisease,
      messages: chatHistory.slice(-maxHistory).map(m => ({ role: m.role, content: m.content }))
    });
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    chatHistory.push({ role: 'assistant', content: err.message });
  } finally {
    document.getElementById('loader-msg')?.remove();
    renderChat();
    aiRequestInFlight = false;
    sendBtn.disabled = false;
    setAiStatus('Ready');
  }
}

// ─── CUSTOM SEQUENCE ─────────────────────────────────
async function doCustomAnalysis() {
  const input    = document.getElementById('seq-in');
  const goBtn    = document.getElementById('go-btn');
  const errorEl  = document.getElementById('seq-err');
  const resultEl = document.getElementById('custom-result');
  const visualEl = document.getElementById('custom-visual');

  errorEl.textContent = '';

  const result = validateSequence(input.value);
  if (!result.ok) {
    errorEl.textContent = result.message;
    return;
  }
  const raw = result.sequence;

  // Always draw the visualisation — it does not need the AI.
  renderCustomVisual(visualEl, raw);

  if (!aiBackendConfigured()) {
    resultEl.textContent = AI_UNAVAILABLE_MSG;
    return;
  }

  if (aiRequestInFlight) return;
  aiRequestInFlight = true;
  goBtn.disabled = true;
  resultEl.textContent = 'Analysing composition…';

  const stats = calculateSequenceStats(raw);
  try {
    const reply = await requestAi({
      mode: 'custom',
      sequence: raw,
      stats
    });
    resultEl.textContent = reply;               // textContent: never executes
  } catch (err) {
    resultEl.textContent = err.message;
  } finally {
    aiRequestInFlight = false;
    goBtn.disabled = false;
  }
}

function renderCustomVisual(visualEl, raw) {
  visualEl.textContent = '';

  const heading = document.createElement('div');
  heading.className = 'custom-visual-hdr';
  heading.textContent = 'Your sequence';
  visualEl.appendChild(heading);

  const rollWrap = document.createElement('div');
  rollWrap.className = 'roll-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'roll-canvas';
  canvas.id = 'cv-custom';
  rollWrap.appendChild(canvas);
  visualEl.appendChild(rollWrap);

  const strip = document.createElement('div');
  strip.className = 'aa-strip';
  strip.id = 'strip-custom';
  visualEl.appendChild(strip);

  const playRow = document.createElement('div');
  playRow.className = 'custom-play-row';
  const playBtn = document.createElement('button');
  playBtn.className = 'play-btn h-btn';
  playBtn.type = 'button';
  playBtn.textContent = '▶ Play your sequence';
  playBtn.onclick = () => playCustomSequence(raw);
  playRow.appendChild(playBtn);
  visualEl.appendChild(playRow);

  window._customSeq = raw;
  renderAminoStrip('strip-custom', raw.split(''), []);
  // Canvas needs layout to measure width; defer, with a fallback for
  // when rAF is paused (e.g. a background tab).
  requestAnimationFrame(() => drawPianoRoll('cv-custom', raw.split(''), [], 'rgba(139,124,248,0.8)'));
  setTimeout(() => drawPianoRoll('cv-custom', raw.split(''), [], 'rgba(139,124,248,0.8)'), 60);
}
