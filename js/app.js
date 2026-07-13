// ─── APP CONTROLLER ─────────────────────────────────
// Main state, tab switching, disease loading, quiz logic

let curDisease = 'sickle';
let qIdx   = 0;
let qScore = 0;

// ─── TABS ────────────────────────────────────────────
function switchTab(tabId, clickedBtn) {
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('on');
    b.setAttribute('aria-selected', 'false');
  });
  document.getElementById('pane-' + tabId).classList.add('on');

  if (!clickedBtn) {
    const tabIndex = { listen: 0, compare: 1, ai: 2, custom: 3, quiz: 4 };
    const btns = document.querySelectorAll('.tab-btn');
    clickedBtn = btns[tabIndex[tabId]];
  }
  if (clickedBtn) {
    clickedBtn.classList.add('on');
    clickedBtn.setAttribute('aria-selected', 'true');
  }
  if (tabId === 'quiz') loadQuiz();
}

// ─── LOAD DISEASE ────────────────────────────────────
function loadDisease(key) {
  curDisease  = key;
  chatHistory = [];
  stopAll();

  const d = DISEASES[key];

  // Story card
  const quoteEl = document.getElementById('story-quote');
  if (quoteEl) quoteEl.textContent = d.quote;

  const tagsEl = document.getElementById('story-tags');
  if (tagsEl) {
    tagsEl.innerHTML = '';
    d.facts.forEach(f => {
      const span = document.createElement('span');
      span.className   = 's-tag';
      span.textContent = f;
      tagsEl.appendChild(span);
    });
  }

  // Mutation callout
  const mutEl = document.getElementById('mut-text');
  if (mutEl) mutEl.innerHTML = d.mutation;

  // Sequence header name
  const hName = document.getElementById('h-name');
  if (hName) hName.textContent = d.healthy.name;

  // Render everything
  renderAminoStrip('strip-h', d.healthy.seq, []);
  renderAminoStrip('strip-m', d.mutant.seq,  d.mut);
  renderLegend();
  renderDiseaseGrid();
  renderCompare();
  renderChat();

  // Draw piano rolls after layout
  setTimeout(() => {
    drawPianoRoll('cv-h', d.healthy.seq, [],    'rgba(29,185,122,0.8)');
    drawPianoRoll('cv-m', d.mutant.seq,  d.mut, 'rgba(226,75,74,0.8)');
  }, CONFIG.rollDrawDelayMs);
}

// ─── QUIZ ────────────────────────────────────────────
function loadQuiz() {
  const el = document.getElementById('quiz-body');
  if (!el) return;

  // All questions answered — show results
  if (qIdx >= QUIZ_DATA.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:2rem">
        <div style="font-size:28px;font-weight:700;color:var(--green);
          margin-bottom:8px;font-family:var(--font-display)">
          ${qScore} / ${QUIZ_DATA.length}
        </div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:20px">
          ${qScore === QUIZ_DATA.length
            ? 'Perfect! You understand protein sonification deeply.'
            : qScore >= 3
            ? 'Great — explore the diseases and come back!'
            : 'Keep listening and try again.'}
        </div>
        <button class="quiz-next" onclick="qIdx=0;qScore=0;updateScore();loadQuiz()">
          Try again
        </button>
      </div>`;
    return;
  }

  const q = QUIZ_DATA[qIdx];
  let html = `<div class="quiz-q">${q.q}</div><div class="quiz-opts">`;
  q.opts.forEach((opt, i) => {
    html += `<button class="quiz-opt" onclick="answerQuiz(${i})">${opt}</button>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

function answerQuiz(selectedIndex) {
  const q    = QUIZ_DATA[qIdx];
  const btns = document.querySelectorAll('.quiz-opt');

  // Disable all options
  btns.forEach(b => b.disabled = true);

  // Color correct / wrong
  btns[selectedIndex].classList.add(selectedIndex === q.ans ? 'correct' : 'wrong');
  if (selectedIndex !== q.ans) btns[q.ans].classList.add('correct');

  if (selectedIndex === q.ans) qScore++;
  updateScore();

  // Show explanation
  const body     = document.getElementById('quiz-body');
  const feedback = document.createElement('div');
  feedback.className   = 'quiz-feedback';
  feedback.textContent = q.exp;

  const nextBtn = document.createElement('button');
  nextBtn.className   = 'quiz-next';
  nextBtn.textContent = qIdx < QUIZ_DATA.length - 1 ? 'Next question →' : 'See results →';
  nextBtn.onclick     = () => { qIdx++; loadQuiz(); };

  body.appendChild(feedback);
  body.appendChild(nextBtn);
}

function updateScore() {
  const el = document.getElementById('quiz-score');
  if (el) el.textContent = `Score: ${qScore} / ${QUIZ_DATA.length}`;
}

// ─── THEME ───────────────────────────────────────────
const THEME_KEY = 'ddm_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'light' ? '☾ Dark' : '☀ Light';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

// ─── INIT ────────────────────────────────────────────
function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
  renderDiseaseGrid();
  renderChips();
  loadDisease('sickle');

  // Redraw canvas on window resize (debounced so a resize drag doesn't
  // trigger a redraw on every single event)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const d = DISEASES[curDisease];
      drawPianoRoll('cv-h', d.healthy.seq, [],    'rgba(29,185,122,0.8)');
      drawPianoRoll('cv-m', d.mutant.seq,  d.mut, 'rgba(226,75,74,0.8)');
    }, CONFIG.resizeDebounceMs);
  });
}

// Start everything when the page loads
window.addEventListener('DOMContentLoaded', init);
