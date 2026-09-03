'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (_) { /* handled below */ }

const ROOT = path.join(__dirname, '..');
const load = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Build a browser-like environment with the real app scripts evaluated in it.
function makeApp() {
  const dom = new JSDOM(load('index.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://example.test/'
  });
  const { window } = dom;
  // jsdom has no 2D canvas; stub just enough that drawPianoRoll is a no-op.
  window.HTMLCanvasElement.prototype.getContext = () => null;

  // Concatenate so every top-level declaration shares one script scope,
  // the way separate <script> tags do in a real browser.
  const bundle = [
    'data/config.js', 'data/aminoacids.js', 'js/sequence.js',
    'data/diseases.js', 'data/quiz.js',
    'js/audio.js', 'js/render.js', 'js/ai.js', 'js/app.js'
  ].map(load).join('\n;\n');
  // Expose the lexically-scoped globals (let/const) the tests read.
  const expose = `
    Object.defineProperty(window, 'chatHistory', { get: () => chatHistory, set: v => { chatHistory = v; } });
    Object.defineProperty(window, 'curDisease', { get: () => curDisease });
    Object.defineProperty(window, 'qScore', { get: () => qScore });
    window.DISEASES = DISEASES;
    window.QUIZ_DATA = QUIZ_DATA;
    init();
  `;
  window.eval(bundle + '\n;\n' + expose);
  return window;
}

const hasJsdom = !!JSDOM;

test('P0: a chat message with HTML is shown as text, never parsed', { skip: !hasJsdom && 'jsdom not installed' }, () => {
  const window = makeApp();
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  window.chatHistory.push({ role: 'user', content: evil });
  window.chatHistory.push({ role: 'assistant', content: 'Line one\nLine two <b>not bold</b>' });
  window.renderChat();

  const body = window.document.getElementById('chat-body');
  assert.equal(body.querySelectorAll('img, script, b').length, 0, 'no markup nodes created');
  assert.ok(body.textContent.includes(evil), 'raw text preserved verbatim');
  assert.ok(body.textContent.includes('<b>not bold</b>'), 'AI markup shown as literal text');
});

test('P0: custom-sequence result uses textContent', { skip: !hasJsdom && 'jsdom not installed' }, () => {
  const window = makeApp();
  const el = window.document.getElementById('custom-result');
  el.textContent = '<svg onload=alert(1)>';
  assert.equal(el.querySelectorAll('svg').length, 0);
});

test('basic render: amino-acid strip has one block per residue, gap for deletion', { skip: !hasJsdom && 'jsdom not installed' }, () => {
  const window = makeApp();
  window.loadDisease('cf');                       // the deletion example
  const strip = window.document.getElementById('strip-m');
  const align = window.curAlignment;
  assert.equal(strip.children.length, align.alignedMutant.length);
  assert.equal(strip.querySelectorAll('.aa-block.gap').length, 1, 'deleted position renders as a gap');
});

test('basic render: disease buttons are real <button>s and switch disease', { skip: !hasJsdom && 'jsdom not installed' }, () => {
  const window = makeApp();
  const grid = window.document.getElementById('d-grid');
  const buttons = grid.querySelectorAll('button.d-card');
  assert.ok(buttons.length >= 4);
  buttons[1].click();
  assert.equal(window.curDisease, Object.keys(window.DISEASES)[1]);
});

test('quiz: answering correctly increments the score and shows feedback', { skip: !hasJsdom && 'jsdom not installed' }, () => {
  const window = makeApp();
  window.switchTab('quiz', window.document.getElementById('tab-quiz'));
  const q = window.QUIZ_DATA[0];
  window.answerQuiz(q.ans);
  assert.equal(window.qScore, 1);
  assert.ok(window.document.querySelector('.quiz-feedback').textContent.includes(q.exp));
});

test('tabs: switching sets aria-selected and hides other panels', { skip: !hasJsdom && 'jsdom not installed' }, () => {
  const window = makeApp();
  window.switchTab('compare', window.document.getElementById('tab-compare'));
  assert.equal(window.document.getElementById('tab-compare').getAttribute('aria-selected'), 'true');
  assert.equal(window.document.getElementById('tab-listen').getAttribute('aria-selected'), 'false');
  assert.equal(window.document.getElementById('pane-listen').hidden, true);
});

test('AI degrades cleanly when no backend is configured', { skip: !hasJsdom && 'jsdom not installed' }, async () => {
  const window = makeApp();
  window.document.getElementById('chat-in').value = 'What is this?';
  await window.doChat();
  const last = window.chatHistory[window.chatHistory.length - 1];
  assert.equal(last.role, 'assistant');
  assert.match(last.content, /not configured/i);
});
