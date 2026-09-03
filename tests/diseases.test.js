'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { DISEASES } = require('../data/diseases.js');
const { AA_MAP } = require('../data/aminoacids.js');
const { calculateSequenceStats, buildAlignment } = require('../js/sequence.js');
const { QUIZ_DATA } = require('../data/quiz.js');

const STANDARD_AA = 'ACDEFGHIKLMNPQRSTVWY';

for (const [key, d] of Object.entries(DISEASES)) {
  test(`${key}: healthy sequence contains only standard residues`, () => {
    for (const c of d.healthy.seq) {
      assert.ok(STANDARD_AA.includes(c), `unexpected residue ${c}`);
      assert.ok(AA_MAP[c], `${c} present in AA_MAP`);
    }
    assert.ok(d.healthy.seq.length >= 3);
  });

  test(`${key}: mutation index is in bounds`, () => {
    assert.equal(typeof d.mutation.index, 'number');
    assert.ok(d.mutation.index >= 0 && d.mutation.index < d.healthy.seq.length);
  });

  test(`${key}: the expected "from" residue is actually at that index`, () => {
    assert.equal(d.healthy.seq[d.mutation.index], d.mutation.from);
  });

  test(`${key}: mutation type is supported and "to" is consistent`, () => {
    assert.ok(['substitution', 'deletion'].includes(d.mutation.type));
    if (d.mutation.type === 'substitution') {
      assert.ok(STANDARD_AA.includes(d.mutation.to), 'substitution target is a standard residue');
      assert.notEqual(d.mutation.to, d.mutation.from, 'substitution actually changes the residue');
    } else {
      assert.equal(d.mutation.to, null, 'deletion has no target residue');
    }
  });

  test(`${key}: buildAlignment agrees with the data`, () => {
    const a = buildAlignment(d.healthy.seq, d.mutation);
    if (d.mutation.type === 'deletion') {
      assert.equal(a.mutantSeq.length, d.healthy.seq.length - 1);
      assert.equal(a.alignedMutant[d.mutation.index], null);
    } else {
      assert.equal(a.mutantSeq.length, d.healthy.seq.length);
      assert.equal(a.mutantSeq[d.mutation.index], d.mutation.to);
    }
  });

  test(`${key}: composition stats are computable for both sequences`, () => {
    const a = buildAlignment(d.healthy.seq, d.mutation);
    const h = calculateSequenceStats(a.healthySeq);
    const m = calculateSequenceStats(a.mutantSeq);
    assert.equal(h.len, d.healthy.seq.length);
    assert.equal(m.len, a.mutantSeq.length);
  });

  test(`${key}: has a biological position and at least one source link`, () => {
    assert.equal(typeof d.mutation.biologicalPosition, 'number');
    assert.ok(Array.isArray(d.sources) && d.sources.length >= 1);
    for (const s of d.sources) {
      assert.ok(s.label && /^https:\/\//.test(s.url), `source url looks valid: ${s.url}`);
    }
  });

  test(`${key}: has plain-text summary and insight (no HTML tags)`, () => {
    assert.ok(d.summary && !/[<>]/.test(d.summary));
    assert.ok(d.insight && !/[<>]/.test(d.insight));
  });
}

test('quiz: every question has a valid answer index and explanation', () => {
  assert.ok(QUIZ_DATA.length >= 5);
  for (const q of QUIZ_DATA) {
    assert.ok(Array.isArray(q.opts) && q.opts.length >= 2);
    assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length);
    assert.ok(typeof q.exp === 'string' && q.exp.length > 0);
  }
});
