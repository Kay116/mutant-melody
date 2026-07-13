// ─── RENDERING ──────────────────────────────────────
// Draws piano rolls, amino acid strips, disease cards,
// compare stats, legend, and chat messages

function drawPianoRoll(canvasId, seq, mutPositions, lineColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth || 700;
  const H   = CONFIG.pianoRollHeight;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const letters  = seq.split('');
  const barWidth = Math.max(5, Math.min(20, (W - letters.length) / letters.length));

  // Draw bars
  letters.forEach((aa, i) => {
    const p = AA_MAP[aa];
    if (!p) return;

    const x      = i * (barWidth + 1);
    const norm   = 1 - (p.m - 52) / 22;
    const barH   = Math.max(10, (norm * 0.55 + 0.3) * H);
    const y      = H - barH;

    // Bar fill (subtle)
    ctx.fillStyle = p.g === 'np'  ? 'rgba(79,142,247,0.2)'  :
                    p.g === 'pol' ? 'rgba(29,185,122,0.2)'  :
                    p.g === 'pos' ? 'rgba(139,124,248,0.2)' :
                                    'rgba(226,75,74,0.2)';
    ctx.fillRect(x, y, barWidth, barH);

    // Bright top cap
    ctx.fillStyle = p.g === 'np'  ? 'rgba(79,142,247,0.8)'  :
                    p.g === 'pol' ? 'rgba(29,185,122,0.8)'  :
                    p.g === 'pos' ? 'rgba(139,124,248,0.8)' :
                                    'rgba(226,75,74,0.8)';
    ctx.fillRect(x, y, barWidth, 2);

    // Mutation site red outline
    if (mutPositions.includes(i)) {
      ctx.strokeStyle = 'rgba(226,75,74,0.9)';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, barWidth - 1.5, barH - 1.5);
    }
  });

  // Melody line connecting bar tops
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();

  let isFirst = true;
  letters.forEach((aa, i) => {
    const p = AA_MAP[aa];
    if (!p) return;

    const x    = i * (barWidth + 1) + barWidth / 2;
    const norm = 1 - (p.m - 52) / 22;
    const y    = (1 - (norm * 0.55 + 0.3)) * H;

    if (isFirst) { ctx.moveTo(x, y); isFirst = false; }
    else          ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function downloadPianoRoll(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = filename || (canvasId + '.png');
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function renderAminoStrip(stripId, seq, mutPositions) {
  const el = document.getElementById(stripId);
  if (!el) return;
  el.innerHTML = '';

  seq.split('').forEach((aa, i) => {
    const p      = AA_MAP[aa] || { n: aa, g: 'np', m: 60 };
    const grp    = GRP[p.g]  || GRP.np;
    const isMut  = mutPositions.includes(i);

    const block  = document.createElement('div');
    block.className = 'aa-block' + (isMut ? ' mut' : '');
    block.style.background = grp.bg;
    block.style.color      = grp.txt;
    block.tabIndex = 0;
    block.innerHTML = `
      <span class="aa-letter">${aa}</span>
      <span class="aa-note-lbl">${midiToName(p.m)}</span>
    `;

    const groupName = p.g === 'np'  ? 'nonpolar' :
                      p.g === 'pol' ? 'polar'    :
                      p.g === 'pos' ? 'positive charge' : 'negative charge';
    const tipText = `${p.n} (${aa}) · ${groupName} · pitch: ${midiToName(p.m)}`
                  + (isMut ? ' · MUTATION SITE' : '');
    block.setAttribute('aria-label', tipText);

    // Tooltip on hover and keyboard focus
    const showTip = () => {
      const bar = document.getElementById('tip-bar');
      if (bar) bar.textContent = tipText;
    };
    const hideTip = () => {
      const bar = document.getElementById('tip-bar');
      if (bar) bar.textContent = 'Hover any amino acid block to learn what it is';
    };
    block.onmouseenter = showTip;
    block.onmouseleave = hideTip;
    block.onfocus      = showTip;
    block.onblur       = hideTip;

    el.appendChild(block);
  });
}

function renderLegend() {
  const el = document.getElementById('legend');
  if (!el) return;
  el.innerHTML = '';

  Object.entries(GRP).forEach(([key, grp]) => {
    const item = document.createElement('div');
    item.className = 'leg';
    item.innerHTML = `
      <div class="leg-sq" style="background:${grp.barColor}"></div>
      <span>${grp.label}</span>
    `;
    el.appendChild(item);
  });
}

function renderDiseaseGrid() {
  const el = document.getElementById('d-grid');
  if (!el) return;
  el.innerHTML = '';

  Object.entries(DISEASES).forEach(([key, d]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'd-card' + (key === curDisease ? ' on' : '');
    card.setAttribute('aria-pressed', key === curDisease ? 'true' : 'false');
    card.setAttribute('aria-label', d.name + ' — ' + d.tag);
    card.innerHTML = `
      <div class="d-icon">${d.icon}</div>
      <div class="d-name">${d.name}</div>
      <div class="d-sub">${d.tag}</div>
    `;
    card.onclick = () => loadDisease(key);
    el.appendChild(card);
  });
}

function renderCompare() {
  const el = document.getElementById('cmp-grid');
  if (!el) return;
  el.innerHTML = '';

  const d = DISEASES[curDisease];

  const makeCard = (stats, title, cardClass, titleClass) => {
    const card    = document.createElement('div');
    card.className = `cmp-card ${cardClass}`;

    const npPct  = Math.round(stats.np  / stats.len * 100);
    const polPct = Math.round((stats.pol || 0) / stats.len * 100);
    const posPct = Math.round((stats.pos || 0) / stats.len * 100);

    card.innerHTML = `
      <div class="cmp-title ${titleClass}">${title}</div>
      <div class="stat-mini">
        <div class="stat-v">${stats.len}</div>
        <div class="stat-l">amino acids</div>
      </div>
      <div class="stat-mini">
        <div class="stat-v">${stats.charge > 0 ? '+' + stats.charge : stats.charge}</div>
        <div class="stat-l">net charge</div>
      </div>
      <div class="diff-wrap">
        <div class="diff-lbl">Nonpolar (mid pitch) — ${npPct}%</div>
        <div class="diff-bg">
          <div class="diff-fill" style="width:${npPct}%;background:rgba(79,142,247,0.6)"></div>
        </div>
      </div>
      <div class="diff-wrap" style="margin-top:7px">
        <div class="diff-lbl">Polar (higher pitch) — ${polPct}%</div>
        <div class="diff-bg">
          <div class="diff-fill" style="width:${polPct}%;background:rgba(29,185,122,0.6)"></div>
        </div>
      </div>
      <div class="diff-wrap" style="margin-top:7px">
        <div class="diff-lbl">Positive charge (highest) — ${posPct}%</div>
        <div class="diff-bg">
          <div class="diff-fill" style="width:${posPct}%;background:rgba(139,124,248,0.6)"></div>
        </div>
      </div>
    `;
    el.appendChild(card);
  };

  makeCard(d.hStats, 'Healthy sequence', 'hc', 'ht');
  makeCard(d.mStats, 'Mutant sequence',  'mc', 'mt');

  const insight = document.getElementById('cmp-insight');
  if (insight) insight.innerHTML = `<strong>What changed:</strong> ${d.insight}`;
}

function renderChat() {
  const el = document.getElementById('chat-body');
  if (!el) return;

  if (chatHistory.length === 0) {
    el.innerHTML = `
      <div style="font-size:13px;color:var(--text3);text-align:center;padding:2rem">
        Select a disease on the Listen tab, then ask me anything.
      </div>`;
    return;
  }

  el.innerHTML = '';
  chatHistory.forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `
      <div class="msg-who ${m.role === 'assistant' ? 'ai' : ''}">
        ${m.role === 'assistant' ? 'AI guide' : 'You'}
      </div>
      <div class="msg-text ${m.role === 'user' ? 'user-t' : ''}">
        ${m.role === 'assistant'
          ? m.content.replace(/\n/g, '<br>')
          : m.content}
      </div>`;
    el.appendChild(div);
  });

  el.scrollTop = el.scrollHeight;
}

function renderChips() {
  const el = document.getElementById('chips');
  if (!el) return;
  el.innerHTML = '';

  const questions = [
    'Why does one mutation cause disease?',
    "Explain like I'm 10",
    'How do nanobodies help?',
    'What does the music represent?',
    'What is a protein?'
  ];

  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.className   = 'chip';
    btn.textContent = q;
    btn.onclick     = () => {
      document.getElementById('chat-in').value = q;
      doChat();
    };
    el.appendChild(btn);
  });
}
