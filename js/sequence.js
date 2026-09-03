// ─── SEQUENCE UTILITIES ─────────────────────────────
// Pure functions: FASTA parsing, validation, composition
// statistics, and healthy/mutant alignment. No DOM here,
// so this file is unit-tested directly in Node.

(function (global) {
  'use strict';

  const AA_MAP = (typeof module !== 'undefined' && module.exports)
    ? require('../data/aminoacids.js').AA_MAP
    : (global.AA_MAP || globalThis.AA_MAP);

  const STANDARD_AA   = 'ACDEFGHIKLMNPQRSTVWY';
  const VALID_AA_RE   = /^[ACDEFGHIKLMNPQRSTVWY]+$/;
  const MIN_SEQUENCE_LENGTH = 3;
  // Deliberate cap: keeps oscillator scheduling and canvas drawing bounded.
  const MAX_SEQUENCE_LENGTH = 500;

  // Strip FASTA headers, whitespace and line breaks; upper-case the rest.
  function parseSequenceInput(raw) {
    return String(raw == null ? '' : raw)
      .split(/\r?\n/)
      .filter(line => !line.trim().startsWith('>'))
      .join('')
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  // Returns { ok:true, sequence } or { ok:false, code, message }.
  function validateSequence(raw) {
    const sequence = parseSequenceInput(raw);

    if (sequence.length === 0) {
      return { ok: false, code: 'empty', message: 'Enter an amino acid sequence.' };
    }
    if (sequence.length < MIN_SEQUENCE_LENGTH) {
      return {
        ok: false, code: 'too_short',
        message: `Too short — enter at least ${MIN_SEQUENCE_LENGTH} residues.`
      };
    }
    if (sequence.length > MAX_SEQUENCE_LENGTH) {
      return {
        ok: false, code: 'too_long',
        message: `Too long — ${sequence.length} residues after cleanup, limit is ${MAX_SEQUENCE_LENGTH}.`
      };
    }
    if (!VALID_AA_RE.test(sequence)) {
      const bad = Array.from(new Set(
        sequence.split('').filter(c => STANDARD_AA.indexOf(c) === -1)
      ));
      return {
        ok: false, code: 'invalid',
        message: `Not a valid sequence — unexpected character(s): ${bad.join(' ')}. `
               + 'Use only the 20 standard amino-acid letters (no numbers, spaces or punctuation).'
      };
    }
    return { ok: true, sequence };
  }

  // Composition stats derived straight from the sequence — never hard-coded.
  function calculateSequenceStats(sequence) {
    const seq = String(sequence).toUpperCase();
    const stats = { len: 0, nonpolar: 0, polar: 0, positive: 0, negative: 0, chargeBalance: 0 };

    for (const c of seq) {
      const aa = AA_MAP[c];
      if (!aa) throw new Error(`calculateSequenceStats: unknown residue "${c}"`);
      stats.len++;
      if      (aa.g === 'np')  stats.nonpolar++;
      else if (aa.g === 'pol') stats.polar++;
      else if (aa.g === 'pos') stats.positive++;
      else if (aa.g === 'neg') stats.negative++;
    }
    // "Simplified charge balance": (basic residues) − (acidic residues),
    // counting K/R/H as +1 and D/E as −1. Not a pH-dependent net charge.
    stats.chargeBalance = stats.positive - stats.negative;
    return stats;
  }

  // Given a healthy sequence and a structured mutation, produce aligned
  // healthy/mutant tracks. A `null` entry in `alignedMutant` is a gap —
  // rendered as an empty slot and played as a silent beat.
  function buildAlignment(healthySeq, mutation) {
    const healthy = String(healthySeq).toUpperCase().split('');

    if (!mutation || typeof mutation.index !== 'number') {
      throw new Error('buildAlignment: mutation.index is required');
    }
    if (mutation.index < 0 || mutation.index >= healthy.length) {
      throw new Error(`buildAlignment: mutation.index ${mutation.index} out of range`);
    }

    const actual = healthy[mutation.index];
    if (mutation.from && mutation.from !== actual) {
      throw new Error(
        `buildAlignment: expected "${mutation.from}" at index ${mutation.index}, found "${actual}"`
      );
    }

    let mutant, alignedMutant, mutantHighlight, gapIndex;

    if (mutation.type === 'deletion') {
      mutant = healthy.slice(0, mutation.index).concat(healthy.slice(mutation.index + 1));
      alignedMutant = healthy.slice();
      alignedMutant[mutation.index] = null;      // gap / silent beat
      mutantHighlight = [];
      gapIndex = mutation.index;
    } else if (mutation.type === 'substitution') {
      if (!mutation.to || AA_MAP[mutation.to] === undefined) {
        throw new Error(`buildAlignment: substitution needs a valid "to" residue`);
      }
      mutant = healthy.slice();
      mutant[mutation.index] = mutation.to;
      alignedMutant = mutant.slice();
      mutantHighlight = [mutation.index];
      gapIndex = -1;
    } else {
      throw new Error(`buildAlignment: unsupported mutation type "${mutation.type}"`);
    }

    return {
      healthySeq: healthy.join(''),
      mutantSeq: mutant.join(''),
      alignedHealthy: healthy.slice(),
      alignedMutant,
      healthyHighlight: [mutation.index],
      mutantHighlight,
      gapIndex
    };
  }

  const api = {
    STANDARD_AA,
    VALID_AA_RE,
    MIN_SEQUENCE_LENGTH,
    MAX_SEQUENCE_LENGTH,
    parseSequenceInput,
    validateSequence,
    calculateSequenceStats,
    buildAlignment
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(global, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
