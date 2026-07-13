// ─── AUDIO ENGINE ───────────────────────────────────
// Handles all sound: playing notes, sequences, and tempo

let audioCtx = null;
let timers   = [];
let tempo    = CONFIG.defaultTempo;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playNote(freq, startTime, duration, isWrong) {
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = isWrong ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(isWrong ? 0.14 : 0.08, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration - 0.04);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

function stopAll() {
  timers.forEach(clearTimeout);
  timers = [];

  // Remove playing highlight from all buttons
  ['btn-h', 'btn-m', 'btn-h2', 'btn-m2'].forEach(id => {
    document.getElementById(id)?.classList.remove('playing');
  });

  // Remove playing highlight from all amino acid blocks
  document.querySelectorAll('.aa-block').forEach(el => {
    el.classList.remove('playing');
  });
}

function playSequence(type) {
  stopAll();

  const d    = DISEASES[curDisease];
  const seq  = type === 'h' ? d.healthy.seq : d.mutant.seq;
  const muts = type === 'm' ? d.mut : [];
  const stripId = 'strip-' + type;

  // Highlight the active play button
  ['btn-' + type, 'btn-' + type + '2'].forEach(id => {
    document.getElementById(id)?.classList.add('playing');
  });

  const ctx = getAudioCtx();
  const now = ctx.currentTime + 0.05;

  seq.split('').forEach((aa, i) => {
    const p = AA_MAP[aa];
    if (!p) return;

    const isWrong = muts.includes(i);
    playNote(midiToFreq(p.m), now + i * tempo, tempo * CONFIG.noteDurationRatio, isWrong);

    // Animate the amino acid block as it plays
    const t = setTimeout(() => {
      document.querySelectorAll('#' + stripId + ' .aa-block')
        .forEach(el => el.classList.remove('playing'));

      const blocks = document.querySelectorAll('#' + stripId + ' .aa-block');
      if (blocks[i]) blocks[i].classList.add('playing');

      // Clean up after last note
      if (i === seq.length - 1) {
        setTimeout(() => {
          ['btn-' + type, 'btn-' + type + '2'].forEach(id => {
            document.getElementById(id)?.classList.remove('playing');
          });
          document.querySelectorAll('.aa-block')
            .forEach(el => el.classList.remove('playing'));
        }, CONFIG.playingClearDelayMs);
      }
    }, i * tempo * 1000);

    timers.push(t);
  });
}

function playCustomSequence(seq) {
  stopAll();
  const ctx = getAudioCtx();
  const now = ctx.currentTime + 0.05;

  seq.split('').forEach((aa, i) => {
    const p = AA_MAP[aa];
    if (!p) return;

    playNote(midiToFreq(p.m), now + i * tempo, tempo * CONFIG.noteDurationRatio, false);

    const t = setTimeout(() => {
      document.querySelectorAll('#strip-custom .aa-block')
        .forEach(el => el.classList.remove('playing'));
      const blocks = document.querySelectorAll('#strip-custom .aa-block');
      if (blocks[i]) blocks[i].classList.add('playing');
    }, i * tempo * 1000);

    timers.push(t);
  });
}

function updateTempo(value) {
  tempo = CONFIG.tempoMap[value];
  const lbl = document.getElementById('tempo-lbl');
  if (lbl) lbl.textContent = value == 1 ? 'slow' : value == 2 ? 'norm' : 'fast';
}
