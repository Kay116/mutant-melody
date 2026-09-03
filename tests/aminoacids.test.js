'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { AA_MAP, GRP, midiToName, midiToFreq } = require('../data/aminoacids.js');

test('AA_MAP has all 20 standard amino acids', () => {
  const letters = Object.keys(AA_MAP).sort().join('');
  assert.equal(letters, 'ACDEFGHIKLMNPQRSTVWY');
});

test('every AA_MAP entry has a known group and a MIDI note', () => {
  for (const [c, p] of Object.entries(AA_MAP)) {
    assert.ok(GRP[p.g], `${c}: group ${p.g} exists in GRP`);
    assert.equal(typeof p.m, 'number');
    assert.ok(p.m > 0 && p.m < 128, `${c}: MIDI note in range`);
  }
});

test('midiToName: known reference notes', () => {
  assert.equal(midiToName(69), 'A4');   // A440
  assert.equal(midiToName(60), 'C4');   // middle C
});

test('midiToFreq: A4 = 440 Hz, one octave up = 880 Hz', () => {
  assert.equal(Math.round(midiToFreq(69)), 440);
  assert.equal(Math.round(midiToFreq(81)), 880);
  assert.equal(Math.round(midiToFreq(57)), 220);
});
