const AA_MAP = {
  A:{n:'Alanine',      g:'np',  m:60},
  C:{n:'Cysteine',     g:'pol', m:62},
  D:{n:'Aspartate',    g:'neg', m:53},
  E:{n:'Glutamate',    g:'neg', m:55},
  F:{n:'Phenylalanine',g:'np',  m:67},
  G:{n:'Glycine',      g:'np',  m:57},
  H:{n:'Histidine',    g:'pos', m:64},
  I:{n:'Isoleucine',   g:'np',  m:69},
  K:{n:'Lysine',       g:'pos', m:65},
  L:{n:'Leucine',      g:'np',  m:71},
  M:{n:'Methionine',   g:'np',  m:68},
  N:{n:'Asparagine',   g:'pol', m:61},
  P:{n:'Proline',      g:'np',  m:58},
  Q:{n:'Glutamine',    g:'pol', m:63},
  R:{n:'Arginine',     g:'pos', m:66},
  S:{n:'Serine',       g:'pol', m:59},
  T:{n:'Threonine',    g:'pol', m:61},
  V:{n:'Valine',       g:'np',  m:70},
  W:{n:'Tryptophan',   g:'np',  m:72},
  Y:{n:'Tyrosine',     g:'pol', m:64}
};

const GRP = {
  np:  { bg:'var(--np-bg)',  txt:'var(--np-txt)',  label:'Nonpolar',         barColor:'rgba(79,142,247,0.7)'  },
  pol: { bg:'var(--pol-bg)', txt:'var(--pol-txt)', label:'Polar',            barColor:'rgba(29,185,122,0.7)'  },
  pos: { bg:'var(--pos-bg)', txt:'var(--pos-txt)', label:'Positive charge',  barColor:'rgba(139,124,248,0.7)' },
  neg: { bg:'var(--neg-bg)', txt:'var(--neg-txt)', label:'Negative charge',  barColor:'rgba(226,75,74,0.7)'   },
};

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function midiToName(m) {
  return NOTES[m % 12] + (Math.floor(m / 12) - 1);
}

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// Groups used by the (educational) sonification mapping.
const AA_GROUPS = ['np', 'pol', 'pos', 'neg'];

// Export for the Node test suite; publish to the global object in the
// browser so the IIFE-wrapped modules (js/sequence.js) can read it too.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AA_MAP, GRP, NOTES, AA_GROUPS, midiToName, midiToFreq };
} else if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, { AA_MAP, GRP, NOTES, AA_GROUPS, midiToName, midiToFreq });
}
