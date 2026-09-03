// ─── APP CONTROLLER ─────────────────────────────────
// State, tab switching (with a proper ARIA tab pattern),
// disease loading, and quiz logic.

let curDisease = 'sickle';
let qIdx   = 0;
let qScore = 0;

const TAB_ORDER = ['listen', 'compare', 'ai', 'custom', 'quiz'];

// ─── TABS ────────────────────────────────────────────
function switchTab(tabId, clickedBtn) {
  const btns = Array.from(document.querySelectorAll('.tab-btn'));

  document.querySelectorAll('.pane').forEach(p => {
    p.classList.remove('on');
    p.hidden = true;
  });
  btns.forEach(b => {
    b.classList.remove('on');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
  });

  const pane = document.getElementById('pane-' + tabId);
  if (pane) { pane.classList.add('on'); pane.hidden = false; }

  const btn = clickedBtn || btns[TAB_ORDER.indexOf(tabId)];
  if (btn) {
    btn.classList.add('on');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
  }

  if (tabId === 'quiz') loadQuiz();

  // Canvases measured while their pane was hidden read a 0 width; redraw
  // now that the Listen pane has layout.
  if (tabId === 'listen') {
    const a = window.curAlignment;
    if (a) requestAnimationFrame(() => {
      drawPianoRoll('cv-h', a.alignedHealthy, a.healthyHighlight, 'rgba(29,185,122,0.8)');
      drawPianoRoll('cv-m', a.alignedMutant, a.mutantHighlight, 'rgba(226,75,74,0.8)');
    });
  }
}

// Keyboard support for the tablist: Left/Right/Home/End.
function onTabKey(e) {
  const btns = Array.from(document.querySelectorAll('.tab-btn'));
  const i = btns.indexOf(e.currentTarget);
  let next = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % btns.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + btns.length) % btns.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = btns.length - 1;
  if (next === null) return;
  e.preventDefault();
  btns[next].focus();
  switchTab(TAB_ORDER[next], btns[next]);
}

// ─── LOAD DISEASE ────────────────────────────────────
function loadDisease(key) {
  curDisease = key;
  chatHistory = [];
  stopAll();

  const d = DISEASES[key];
  const align = buildAlignment(d.healthy.seq, d.mutation);
  window.curAlignment = align;

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('story-quote', d.quote);
  set('mut-text', d.summary);
  set('h-name', d.healthy.name);
  set('m-name', mutantLabel(d));

  const tagsEl = document.getElementById('story-tags');
  if (tagsEl) {
    tagsEl.textContent = '';
    d.facts.forEach(f => {
      const span = document.createElement('span');
      span.className = 's-tag';
      span.textContent = f;
      tagsEl.appendChild(span);
    });
  }

  renderAminoStrip('strip-h', align.alignedHealthy, align.healthyHighlight);
  renderAminoStrip('strip-m', align.alignedMutant, align.mutantHighlight);
  renderLegend();
  renderDiseaseGrid();
  renderCompare();
  renderSources(d);
  renderChat();

  const drawRolls = () => {
    drawPianoRoll('cv-h', align.alignedHealthy, align.healthyHighlight, 'rgba(29,185,122,0.8)');
    drawPianoRoll('cv-m', align.alignedMutant, align.mutantHighlight, 'rgba(226,75,74,0.8)');
  };
  requestAnimationFrame(drawRolls);
  setTimeout(drawRolls, 60);   // fallback when rAF is paused (background tab)
}

function mutantLabel(d) {
  const m = d.mutation;
  if (m.type === 'deletion') return `${d.mutant ? d.mutant.name : d.healthy.name} · Δ${m.from}${m.biologicalPosition}`;
  return `${m.from}${m.biologicalPosition}${m.to}`;
}

// ─── QUIZ ────────────────────────────────────────────
function loadQuiz() {
  const el = document.getElementById('quiz-body');
  if (!el) return;
  el.textContent = '';

  if (qIdx >= QUIZ_DATA.length) {
    const wrap = document.createElement('div');
    wrap.className = 'quiz-result';
    const score = document.createElement('div');
    score.className = 'quiz-result-score';
    score.textContent = `${qScore} / ${QUIZ_DATA.length}`;
    const msg = document.createElement('div');
    msg.className = 'quiz-result-msg';
    msg.textContent = qScore === QUIZ_DATA.length
      ? 'Perfect — you have the core idea down.'
      : qScore >= 3
      ? 'Solid. Explore the diseases and try again.'
      : 'Keep listening and give it another go.';
    const again = document.createElement('button');
    again.className = 'quiz-next';
    again.type = 'button';
    again.textContent = 'Try again';
    again.onclick = () => { qIdx = 0; qScore = 0; updateScore(); loadQuiz(); };
    wrap.append(score, msg, again);
    el.appendChild(wrap);
    return;
  }

  const q = QUIZ_DATA[qIdx];
  const question = document.createElement('div');
  question.className = 'quiz-q';
  question.textContent = q.q;
  el.appendChild(question);

  const opts = document.createElement('div');
  opts.className = 'quiz-opts';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.type = 'button';
    btn.textContent = opt;
    btn.onclick = () => answerQuiz(i);
    opts.appendChild(btn);
  });
  el.appendChild(opts);
}

function answerQuiz(selectedIndex) {
  const q = QUIZ_DATA[qIdx];
  const btns = document.querySelectorAll('.quiz-opt');

  btns.forEach(b => { b.disabled = true; });
  btns[selectedIndex].classList.add(selectedIndex === q.ans ? 'correct' : 'wrong');
  if (selectedIndex !== q.ans) btns[q.ans].classList.add('correct');

  if (selectedIndex === q.ans) qScore++;
  updateScore();

  const body = document.getElementById('quiz-body');

  const feedback = document.createElement('div');
  feedback.className = 'quiz-feedback';
  feedback.setAttribute('role', 'status');
  feedback.textContent = (selectedIndex === q.ans ? 'Correct. ' : 'Not quite. ') + q.exp;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'quiz-next';
  nextBtn.type = 'button';
  nextBtn.textContent = qIdx < QUIZ_DATA.length - 1 ? 'Next question →' : 'See results →';
  nextBtn.onclick = () => { qIdx++; loadQuiz(); };

  body.append(feedback, nextBtn);
}

function updateScore() {
  const el = document.getElementById('quiz-score');
  if (el) el.textContent = `Score: ${qScore} / ${QUIZ_DATA.length}`;
}

// ─── INIT ────────────────────────────────────────────
let appInitialised = false;
function init() {
  if (appInitialised) return;
  appInitialised = true;

  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('keydown', onTabKey));

  renderDiseaseGrid();
  renderChips();
  loadDisease('sickle');
  updateTempo(document.getElementById('tempo-sl')?.value || 2);

  // First user gesture anywhere unlocks audio on browsers that suspend it.
  const unlock = () => { resumeAudio(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const a = window.curAlignment;
      if (!a) return;
      drawPianoRoll('cv-h', a.alignedHealthy, a.healthyHighlight, 'rgba(29,185,122,0.8)');
      drawPianoRoll('cv-m', a.alignedMutant, a.mutantHighlight, 'rgba(226,75,74,0.8)');
    }, 150);
  });
}

window.addEventListener('DOMContentLoaded', init);
