// ─── AUDIO ENGINE ───────────────────────────────────
// Plays sequences as notes. Tracks every oscillator it
// creates so stopAll() can silence audio immediately, and
// uses a generation counter so starting a new sequence
// cancels the previous one cleanly.

let audioCtx = null;
let timers   = [];
let activeOscillators = new Set();
let playGeneration = 0;               // bumped on every stopAll()
let tempo    = 0.3;

const tempoMap = { 1: 0.55, 2: 0.3, 3: 0.16 };
const NOTE_RATIO = 0.82;              // fraction of a beat a note sounds for
const TAIL_MS    = 400;               // how long highlights linger after the end

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Browsers start the context "suspended" until a user gesture.
function resumeAudio() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
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

  activeOscillators.add(osc);
  osc.addEventListener('ended', () => activeOscillators.delete(osc));
}

function clearPlayingHighlights() {
  ['btn-h', 'btn-m', 'btn-h2', 'btn-m2'].forEach(id => {
    document.getElementById(id)?.classList.remove('playing');
  });
  document.querySelectorAll('.aa-block.playing').forEach(el => {
    el.classList.remove('playing');
  });
}

function stopAll() {
  playGeneration++;

  timers.forEach(clearTimeout);
  timers = [];

  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch (_) { /* already stopped */ }
  });
  activeOscillators.clear();

  clearPlayingHighlights();
}

// track: array of amino-acid letters, or null for a gap (silent beat).
function playTrack(track, { stripId, buttonIds = [], wrongIndices = [] }) {
  stopAll();
  const generation = playGeneration;

  const ctx = resumeAudio();
  const now = ctx.currentTime + 0.05;

  buttonIds.forEach(id => document.getElementById(id)?.classList.add('playing'));

  track.forEach((aa, i) => {
    const p = aa == null ? null : AA_MAP[aa];
    if (p) {
      playNote(midiToFreq(p.m), now + i * tempo, tempo * NOTE_RATIO, wrongIndices.includes(i));
    }

    const t = setTimeout(() => {
      if (generation !== playGeneration) return;   // superseded by a newer play

      if (stripId) {
        document.querySelectorAll('#' + stripId + ' .aa-block.playing')
          .forEach(el => el.classList.remove('playing'));
        const blocks = document.querySelectorAll('#' + stripId + ' .aa-block');
        if (blocks[i] && aa != null) blocks[i].classList.add('playing');
      }

      if (i === track.length - 1) {
        const tail = setTimeout(() => {
          if (generation === playGeneration) clearPlayingHighlights();
        }, TAIL_MS);
        timers.push(tail);
      }
    }, i * tempo * 1000);

    timers.push(t);
  });
}

function playSequence(type) {
  const align = window.curAlignment;
  if (!align) return;

  const track = type === 'h' ? align.alignedHealthy : align.alignedMutant;
  const wrong = type === 'm' ? align.mutantHighlight : [];

  playTrack(track, {
    stripId: 'strip-' + type,
    buttonIds: ['btn-' + type, 'btn-' + type + '2'],
    wrongIndices: wrong
  });
}

function playCustomSequence(seq) {
  playTrack(seq.split(''), { stripId: 'strip-custom', buttonIds: [], wrongIndices: [] });
}

function updateTempo(value) {
  tempo = tempoMap[value] || tempoMap[2];
  const lbl = document.getElementById('tempo-lbl');
  const text = value == 1 ? 'slow' : value == 2 ? 'normal' : 'fast';
  if (lbl) lbl.textContent = text;
  const slider = document.getElementById('tempo-sl');
  if (slider) slider.setAttribute('aria-valuetext', text + ' tempo');
}
