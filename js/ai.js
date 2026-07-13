// ─── AI ENGINE ──────────────────────────────────────
// Handles all calls to Groq's free AI API

// 
const GROQ_KEY = 'Add your Groq key here (https://groq.com/)';

let chatHistory = [];
let groqKeyWarningShown = false;

function hasValidGroqKey() {
  return typeof GROQ_KEY === 'string'
    && GROQ_KEY.trim().length > 0
    && !GROQ_KEY.startsWith('Add your Groq key');
}

// ─── LOCAL CACHE ─────────────────────────────────────
// Avoids repeat Groq calls for a question/sequence already asked before.
// Bump the version suffix if the prompts below change, to invalidate old entries.
const AI_CACHE_PREFIX = 'ddm_ai_cache_v1_';

function getCachedAI(key) {
  try {
    const raw = localStorage.getItem(AI_CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedAI(key, value) {
  try {
    localStorage.setItem(AI_CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (quota, private mode) — caching is best-effort
  }
}

async function callGroq(messages, systemPrompt) {
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_KEY,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        model:      'llama-3.1-8b-instant',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    }
  );

  const data = await response.json();
  return data.choices?.[0]?.message?.content
    || 'Sorry, I had trouble with that. Please try again.';
}

async function doChat() {
  const input   = document.getElementById('chat-in');
  const sendBtn = document.getElementById('ask-btn');
  const question = input.value.trim();

  if (!question || sendBtn.disabled) return;

  input.value      = '';
  sendBtn.disabled = true;

  const d = DISEASES[curDisease];
  chatHistory.push({ role: 'user', content: question });
  renderChat();

  if (!hasValidGroqKey()) {
    chatHistory.push({
      role: 'assistant',
      content: groqKeyWarningShown
        ? 'Groq key still not set — see js/ai.js.'
        : '⚠ No Groq API key configured yet. Add yours in js/ai.js — see SETUP.md for the 2-minute walkthrough.'
    });
    groqKeyWarningShown = true;
    renderChat();
    sendBtn.disabled = false;
    return;
  }

  // A cached reply is only safe for the first message of a conversation —
  // later messages depend on prior turns, which the cache key doesn't capture.
  const isFirstMessage = chatHistory.length === 1;
  const cacheKey = 'chat_' + curDisease + '_' + question.toLowerCase().trim();
  if (isFirstMessage) {
    const cached = getCachedAI(cacheKey);
    if (cached) {
      chatHistory.push({ role: 'assistant', content: cached });
      renderChat();
      sendBtn.disabled = false;
      return;
    }
  }

  // Show loading dots
  const chatBody = document.getElementById('chat-body');
  const loader   = document.createElement('div');
  loader.className = 'msg';
  loader.id        = 'loader-msg';
  loader.innerHTML = `
    <div class="msg-who ai">AI guide</div>
    <div class="msg-text">
      <div class="dot-loader">
        <div class="dl"></div><div class="dl"></div><div class="dl"></div>
      </div>
    </div>`;
  chatBody.appendChild(loader);
  chatBody.scrollTop = chatBody.scrollHeight;

  const systemPrompt = `You are a warm, engaging science guide inside "Disease in D Minor" — an interactive app that teaches genetic mutations through music. The user is exploring ${d.name}. The mutation: ${d.mutation.replace(/<[^>]+>/g, '')}. Healthy sequence: ${d.healthy.seq}. Mutant sequence: ${d.mutant.seq}. Speak plain English — no jargon without explanation. Be concise (3–5 sentences). Connect biology to the music when relevant.`;

  try {
    const reply = await callGroq(
      chatHistory.map(m => ({ role: m.role, content: m.content })),
      systemPrompt
    );
    document.getElementById('loader-msg')?.remove();
    chatHistory.push({ role: 'assistant', content: reply });
    renderChat();
    if (isFirstMessage) setCachedAI(cacheKey, reply);
  } catch (err) {
    document.getElementById('loader-msg')?.remove();
    chatHistory.push({
      role: 'assistant',
      content: 'Connection error — check your Groq key in js/ai.js and try again.'
    });
    renderChat();
  }

  sendBtn.disabled = false;
}

async function doCustomAnalysis() {
  const input   = document.getElementById('seq-in');
  const goBtn   = document.getElementById('go-btn');
  const errorEl = document.getElementById('seq-err');
  const resultEl= document.getElementById('custom-result');
  const visualEl= document.getElementById('custom-visual');

  const raw = input.value.trim().toUpperCase().replace(/\s/g, '');
  errorEl.textContent = '';

  // Validate the sequence
  const isValid = raw.length >= 3 && raw.split('').every(c => AA_MAP[c]);
  if (!isValid) {
    errorEl.textContent = 'Please enter a valid sequence (at least 3 letters from: A C D E F G H I K L M N P Q R S T V W Y)';
    return;
  }

  if (!hasValidGroqKey()) {
    resultEl.textContent = groqKeyWarningShown
      ? 'Groq key still not set — see js/ai.js.'
      : '⚠ No Groq API key configured yet. Add yours in js/ai.js — see SETUP.md for the 2-minute walkthrough.';
    groqKeyWarningShown = true;
    return;
  }

  goBtn.disabled    = true;
  resultEl.textContent = 'Analyzing your sequence…';
  visualEl.innerHTML   = '';

  // Describe the sequence for the AI
  const details = raw.split('').map((aa, i) =>
    `${i + 1}:${AA_MAP[aa]?.n}(${AA_MAP[aa]?.g})`
  ).join(', ');

  const systemPrompt = `You are a biology guide in a protein sonification app. Given an amino acid sequence, explain in 4–5 warm plain-English sentences: what kind of protein this might be, what the chemical pattern (nonpolar/polar/charged mix) suggests about its role, and what is musically interesting about its pattern. End with one curiosity question.`;

  const cacheKey = 'custom_' + raw;

  try {
    const cached = getCachedAI(cacheKey);
    const reply  = cached || await callGroq(
      [{ role: 'user', content: `Sequence: ${raw}\nDetails: ${details}` }],
      systemPrompt
    );
    if (!cached) setCachedAI(cacheKey, reply);
    resultEl.innerHTML = reply.replace(/\n/g, '<br>');

    // Draw visualization for the custom sequence
    visualEl.innerHTML = `
      <div style="font-size:10px;font-weight:600;letter-spacing:.07em;
        text-transform:uppercase;color:var(--text3);margin-bottom:8px">
        Your sequence
      </div>`;

    const rollWrapper = document.createElement('div');
    rollWrapper.className = 'roll-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'roll-canvas';
    canvas.id        = 'cv-custom';
    rollWrapper.appendChild(canvas);
    visualEl.appendChild(rollWrapper);

    const strip = document.createElement('div');
    strip.className = 'aa-strip';
    strip.id        = 'strip-custom';
    visualEl.appendChild(strip);

    const playRow = document.createElement('div');
    playRow.style.cssText = 'margin-top:10px;display:flex;gap:8px';
    playRow.innerHTML = `
      <button class="play-btn h-btn"
        onclick="playCustomSequence(window._customSeq)"
        style="font-size:13px;padding:9px 18px">
        ▶ Play your sequence
      </button>
      <button class="fa-btn" aria-label="Save your sequence piano roll as image"
        onclick="downloadPianoRoll('cv-custom', 'custom-sequence.png')">
        ⭳ Save image
      </button>`;
    visualEl.appendChild(playRow);

    window._customSeq = raw;

    setTimeout(() => {
      drawPianoRoll('cv-custom', raw, [], 'rgba(139,124,248,0.8)');
      renderAminoStrip('strip-custom', raw, []);
    }, CONFIG.rollDrawDelayMs);

  } catch (err) {
    resultEl.textContent = 'Connection error — check your Groq key in js/ai.js and try again.';
  }

  goBtn.disabled = false;
}
