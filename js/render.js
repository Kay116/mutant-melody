// ─── RENDERING ──────────────────────────────────────
// Draws piano rolls, amino acid strips, disease cards,
// compare stats, legend, sources, and chat messages.
//
// All user- and AI-supplied text is written with
// textContent — never innerHTML — so it can never execute.

const GROUP_LABEL = { np: 'nonpolar', pol: 'polar', pos: 'positive charge', neg: 'negative charge' };
const BAR_FILL = {
  np:  'rgba(79,142,247,0.2)',  pol: 'rgba(29,185,122,0.2)',
  pos: 'rgba(139,124,248,0.2)', neg: 'rgba(226,75,74,0.2)'
};
const BAR_CAP = {
  np:  'rgba(79,142,247,0.8)',  pol: 'rgba(29,185,122,0.8)',
  pos: 'rgba(139,124,248,0.8)', neg: 'rgba(226,75,74,0.8)'
};
const MIN_BAR = 9;   // px — never draw a bar narrower than this

// `track` is an array of letters, with null marking a deleted position (gap).
function drawPianoRoll(canvasId, track, mutPositions, lineColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const letters = Array.isArray(track) ? track : String(track).split('');
  const dpr = window.devicePixelRatio || 1;
  const wrapW = canvas.parentElement ? canvas.parentElement.clientWidth : 700;

  // Give every residue a legible slot; scroll horizontally if that
  // is wider than the container (handled by .roll-wrap overflow).
  const barWidth = Math.max(MIN_BAR, Math.min(20, Math.floor((wrapW - letters.length) / Math.max(1, letters.length))));
  const step = barWidth + 2;
  const W = Math.max(wrapW, letters.length * step);
  const H = 72;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  letters.forEach((aa, i) => {
    const x = i * step;

    if (aa == null) {                       // deleted position — draw a dashed gap
      ctx.save();
      ctx.strokeStyle = 'rgba(226,75,74,0.7)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 6, barWidth - 1, H - 12);
      ctx.restore();
      return;
    }

    const p = AA_MAP[aa];
    if (!p) return;

    const norm = 1 - (p.m - 52) / 22;
    const barH = Math.max(10, (norm * 0.55 + 0.3) * H);
    const y = H - barH;

    ctx.fillStyle = BAR_FILL[p.g] || BAR_FILL.np;
    ctx.fillRect(x, y, barWidth, barH);
    ctx.fillStyle = BAR_CAP[p.g] || BAR_CAP.np;
    ctx.fillRect(x, y, barWidth, 2);

    if (mutPositions && mutPositions.includes(i)) {
      ctx.strokeStyle = 'rgba(226,75,74,0.95)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, barWidth - 1.5, barH - 1.5);
    }
  });

  // Melody line across the bar tops (skips gaps).
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  letters.forEach((aa, i) => {
    if (aa == null) { started = false; return; }
    const p = AA_MAP[aa];
    if (!p) return;
    const x = i * step + barWidth / 2;
    const norm = 1 - (p.m - 52) / 22;
    const yy = (1 - (norm * 0.55 + 0.3)) * H;
    if (!started) { ctx.moveTo(x, yy); started = true; }
    else ctx.lineTo(x, yy);
  });
  ctx.stroke();
}

// `track` is an array of letters, with null marking a gap.
function renderAminoStrip(stripId, track, mutPositions) {
  const el = document.getElementById(stripId);
  if (!el) return;
  el.textContent = '';

  const letters = Array.isArray(track) ? track : String(track).split('');
  const muts = mutPositions || [];

  letters.forEach((aa, i) => {
    if (aa == null) {
      const gap = document.createElement('div');
      gap.className = 'aa-block gap';
      gap.setAttribute('aria-label', 'Deleted residue — silent beat');
      gap.title = 'Deleted residue';
      el.appendChild(gap);
      return;
    }

    const p = AA_MAP[aa] || { n: aa, g: 'np', m: 60 };
    const grp = GRP[p.g] || GRP.np;
    const isMut = muts.includes(i);

    const block = document.createElement('div');
    block.className = 'aa-block' + (isMut ? ' mut' : '');
    block.style.background = grp.bg;
    block.style.color = grp.txt;
    block.tabIndex = 0;

    const letter = document.createElement('span');
    letter.className = 'aa-letter';
    letter.textContent = aa;
    const note = document.createElement('span');
    note.className = 'aa-note-lbl';
    note.textContent = midiToName(p.m);
    block.append(letter, note);

    const tip = `${p.n} (${aa}) · ${GROUP_LABEL[p.g]} · pitch ${midiToName(p.m)}`
              + (isMut ? ' · mutation site' : '');
    block.setAttribute('aria-label', tip);

    const show = () => { const b = document.getElementById('tip-bar'); if (b) b.textContent = tip; };
    const hide = () => {
      const b = document.getElementById('tip-bar');
      if (b) b.textContent = 'Hover or focus any amino acid block to learn what it is';
    };
    block.onmouseenter = show;
    block.onmouseleave = hide;
    block.onfocus = show;
    block.onblur = hide;

    el.appendChild(block);
  });
}

function renderLegend() {
  const el = document.getElementById('legend');
  if (!el) return;
  el.textContent = '';
  Object.values(GRP).forEach(grp => {
    const item = document.createElement('div');
    item.className = 'leg';
    const sq = document.createElement('div');
    sq.className = 'leg-sq';
    sq.style.background = grp.barColor;
    const label = document.createElement('span');
    label.textContent = grp.label;
    item.append(sq, label);
    el.appendChild(item);
  });
}

function renderDiseaseGrid() {
  const el = document.getElementById('d-grid');
  if (!el) return;
  el.textContent = '';

  Object.entries(DISEASES).forEach(([key, d]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'd-card' + (key === curDisease ? ' on' : '');
    card.setAttribute('aria-pressed', key === curDisease ? 'true' : 'false');
    card.setAttribute('aria-label', d.name + ' — ' + d.tag);

    const icon = document.createElement('div');
    icon.className = 'd-icon';
    icon.textContent = d.icon;
    const name = document.createElement('div');
    name.className = 'd-name';
    name.textContent = d.name;
    const sub = document.createElement('div');
    sub.className = 'd-sub';
    sub.textContent = d.tag;
    card.append(icon, name, sub);

    card.onclick = () => loadDisease(key);
    el.appendChild(card);
  });
}

function renderSources(d) {
  const el = document.getElementById('sources');
  if (!el) return;
  el.textContent = '';
  if (!d.sources || !d.sources.length) return;

  const label = document.createElement('span');
  label.className = 'sources-label';
  label.textContent = 'Sources:';
  el.appendChild(label);

  d.sources.forEach(s => {
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = s.label;
    el.appendChild(a);
  });
}

function renderCompare() {
  const el = document.getElementById('cmp-grid');
  if (!el) return;
  el.textContent = '';

  const d = DISEASES[curDisease];
  const align = window.curAlignment;
  if (!align) return;

  const hStats = calculateSequenceStats(align.healthySeq);
  const mStats = calculateSequenceStats(align.mutantSeq);

  const makeCard = (stats, title, cardClass, titleClass) => {
    const card = document.createElement('div');
    card.className = `cmp-card ${cardClass}`;

    const pct = n => Math.round((n / stats.len) * 100);
    const rows = [
      ['Nonpolar (mid pitch)', pct(stats.nonpolar), 'rgba(79,142,247,0.6)'],
      ['Polar (higher pitch)', pct(stats.polar), 'rgba(29,185,122,0.6)'],
      ['Positive charge (highest)', pct(stats.positive), 'rgba(139,124,248,0.6)'],
      ['Negative charge (lowest)', pct(stats.negative), 'rgba(226,75,74,0.6)']
    ];

    const heading = document.createElement('div');
    heading.className = `cmp-title ${titleClass}`;
    heading.textContent = title;
    card.appendChild(heading);

    const mk = (value, unit) => {
      const wrap = document.createElement('div');
      wrap.className = 'stat-mini';
      const v = document.createElement('div');
      v.className = 'stat-v';
      v.textContent = value;
      const l = document.createElement('div');
      l.className = 'stat-l';
      l.textContent = unit;
      wrap.append(v, l);
      return wrap;
    };
    const cb = stats.chargeBalance;
    card.appendChild(mk(String(stats.len), 'amino acids'));
    card.appendChild(mk(cb > 0 ? '+' + cb : String(cb), 'simplified charge balance'));

    rows.forEach(([name, value, color]) => {
      const dw = document.createElement('div');
      dw.className = 'diff-wrap';
      const lbl = document.createElement('div');
      lbl.className = 'diff-lbl';
      lbl.textContent = `${name} — ${value}%`;
      const bg = document.createElement('div');
      bg.className = 'diff-bg';
      const fill = document.createElement('div');
      fill.className = 'diff-fill';
      fill.style.width = value + '%';
      fill.style.background = color;
      bg.appendChild(fill);
      dw.append(lbl, bg);
      card.appendChild(dw);
    });

    el.appendChild(card);
  };

  makeCard(hStats, 'Healthy sequence', 'hc', 'ht');
  makeCard(mStats, 'Mutant sequence', 'mc', 'mt');

  const insight = document.getElementById('cmp-insight');
  if (insight) {
    insight.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = 'What changed: ';
    insight.append(strong, document.createTextNode(d.insight));
  }
}

function renderChat() {
  const el = document.getElementById('chat-body');
  if (!el) return;
  el.textContent = '';

  if (chatHistory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'chat-empty';
    empty.textContent = 'Select a disease on the Listen tab, then ask a question.';
    el.appendChild(empty);
    return;
  }

  chatHistory.forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg';

    const who = document.createElement('div');
    who.className = 'msg-who' + (m.role === 'assistant' ? ' ai' : '');
    who.textContent = m.role === 'assistant' ? 'AI guide' : 'You';

    const text = document.createElement('div');
    text.className = 'msg-text' + (m.role === 'user' ? ' user-t' : '');
    text.textContent = m.content;          // pre-wrap in CSS keeps line breaks

    div.append(who, text);
    el.appendChild(div);
  });

  el.scrollTop = el.scrollHeight;
}

function renderChips() {
  const el = document.getElementById('chips');
  if (!el) return;
  el.textContent = '';

  const questions = [
    'Why does one mutation cause disease?',
    "Explain like I'm 10",
    'What does the music represent?',
    'What is a protein?',
    'How would scientists identify this protein for real?'
  ];

  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.textContent = q;
    btn.onclick = () => {
      const input = document.getElementById('chat-in');
      input.value = q;
      doChat();
    };
    el.appendChild(btn);
  });
}
