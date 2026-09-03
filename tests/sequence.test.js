'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseSequenceInput, validateSequence, calculateSequenceStats, buildAlignment,
  MIN_SEQUENCE_LENGTH, MAX_SEQUENCE_LENGTH
} = require('../js/sequence.js');

test('parseSequenceInput: plain string is upper-cased', () => {
  assert.equal(parseSequenceInput('mvhlt'), 'MVHLT');
});

test('parseSequenceInput: strips whitespace and line breaks', () => {
  assert.equal(parseSequenceInput('MV HL\nT\r\nP'), 'MVHLTP');
});

test('parseSequenceInput: drops FASTA header lines', () => {
  const fasta = '>sp|P68871|HBB_HUMAN\nMVHLTPEEK\nSAVTALWGK';
  assert.equal(parseSequenceInput(fasta), 'MVHLTPEEKSAVTALWGK');
});

test('parseSequenceInput: handles null/undefined', () => {
  assert.equal(parseSequenceInput(null), '');
  assert.equal(parseSequenceInput(undefined), '');
});

test('validateSequence: accepts a normal sequence', () => {
  const r = validateSequence('MVHLTPEEKSAVTALWGK');
  assert.equal(r.ok, true);
  assert.equal(r.sequence, 'MVHLTPEEKSAVTALWGK');
});

test('validateSequence: accepts a multiline FASTA record', () => {
  const r = validateSequence('>test\nmvhlt peek\nsavtalwgk');
  assert.equal(r.ok, true);
  assert.equal(r.sequence, 'MVHLTPEEKSAVTALWGK');
});

test('validateSequence: empty input', () => {
  assert.equal(validateSequence('   ').code, 'empty');
});

test('validateSequence: too short', () => {
  assert.equal(validateSequence('MV').code, 'too_short');
  assert.equal(validateSequence('M'.repeat(MIN_SEQUENCE_LENGTH)).ok, true);
});

test('validateSequence: too long', () => {
  assert.equal(validateSequence('A'.repeat(MAX_SEQUENCE_LENGTH + 1)).code, 'too_long');
  assert.equal(validateSequence('A'.repeat(MAX_SEQUENCE_LENGTH)).ok, true);
});

test('validateSequence: rejects invalid letters (B, J, O, U, X, Z)', () => {
  for (const c of ['B', 'J', 'O', 'U', 'X', 'Z']) {
    assert.equal(validateSequence('AA' + c + 'AA').code, 'invalid', `expected ${c} invalid`);
  }
});

test('validateSequence: rejects numbers and punctuation', () => {
  assert.equal(validateSequence('MVHL7').code, 'invalid');
  assert.equal(validateSequence('MVHL-T').code, 'invalid');
});

test('validateSequence: rejects an HTML-injection string', () => {
  assert.equal(validateSequence('<img src=x onerror=alert(1)>').code, 'invalid');
});

test('calculateSequenceStats: counts groups from AA_MAP', () => {
  // D,E = negative; K,R,H = positive; S,T,C,N,Q,Y = polar; rest nonpolar
  const s = calculateSequenceStats('DEKRHSTA');
  assert.equal(s.len, 8);
  assert.equal(s.negative, 2);   // D E
  assert.equal(s.positive, 3);   // K R H
  assert.equal(s.polar, 2);      // S T
  assert.equal(s.nonpolar, 1);   // A
  assert.equal(s.chargeBalance, 1); // 3 - 2
});

test('calculateSequenceStats: throws on unknown residue', () => {
  assert.throws(() => calculateSequenceStats('MVZ'), /unknown residue/i);
});

test('buildAlignment: substitution replaces one residue and keeps length', () => {
  const a = buildAlignment('MVHLTPEEK', { type: 'substitution', index: 6, from: 'E', to: 'V' });
  assert.equal(a.healthySeq, 'MVHLTPEEK');
  assert.equal(a.mutantSeq,  'MVHLTPVEK');
  assert.equal(a.alignedMutant.length, a.alignedHealthy.length);
  assert.deepEqual(a.mutantHighlight, [6]);
  assert.equal(a.gapIndex, -1);
});

test('buildAlignment: deletion shortens mutant and inserts an aligned gap', () => {
  const a = buildAlignment('ENIIFGVSYDEYR', { type: 'deletion', index: 4, from: 'F', to: null });
  assert.equal(a.mutantSeq, 'ENIIGVSYDEYR');
  assert.equal(a.mutantSeq.length, a.healthySeq.length - 1);
  assert.equal(a.alignedMutant[4], null);            // gap == silent beat
  assert.equal(a.alignedMutant.length, a.alignedHealthy.length);
  assert.equal(a.gapIndex, 4);
});

test('buildAlignment: rejects a "from" that does not match the sequence', () => {
  assert.throws(
    () => buildAlignment('MVHLT', { type: 'substitution', index: 0, from: 'E', to: 'V' }),
    /expected "E" at index 0, found "M"/
  );
});

test('buildAlignment: rejects an out-of-range index', () => {
  assert.throws(() => buildAlignment('MVHLT', { type: 'deletion', index: 99, from: 'T' }), /out of range/);
});

test('buildAlignment: rejects an unsupported mutation type', () => {
  assert.throws(() => buildAlignment('MVHLT', { type: 'insertion', index: 1 }), /unsupported/);
});
