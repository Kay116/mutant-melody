// ─── DISEASE DATA ───────────────────────────────────
// Every sequence window is a verbatim slice of the UniProt
// canonical sequence for that protein (accession noted in
// `sources`). `mutation.index` is 0-based into `healthy.seq`;
// `biologicalPosition` uses the conventional mature-protein
// numbering for the clinical variant name.
//
// Composition statistics are NOT stored here — they are
// computed from the sequences at runtime (see js/sequence.js).

const DISEASES = {
  sickle: {
    name: 'Sickle cell disease',
    tag:  'Blood disorder · ~7.7M living with SCD (GBD 2021)',
    icon: '◉',
    quote: 'One residue out of 146 changes. Hemoglobin molecules begin to stick together, and red blood cells stiffen into a crescent shape that can block small blood vessels.',
    facts: [
      'Single point mutation: β-globin Glu6 → Val',
      '~7.7 million people live with sickle cell disease worldwide (GBD 2021)',
      'First human disease linked to a specific molecular change (Pauling et al., 1949)'
    ],
    summary: 'In β-globin, glutamate (E, negatively charged) at position 6 is replaced by valine (V, nonpolar). Losing that surface charge lets deoxygenated hemoglobin polymerise. In the mapping, the note steps upward.',
    healthy: { name: 'Hemoglobin subunit beta, residues 1–21', seq: 'MVHLTPEEKSAVTALWGKVNV' },
    mutation: { type: 'substitution', index: 6, biologicalPosition: 6, from: 'E', to: 'V' },
    insight: 'The mutant loses one negative surface charge. That small change is enough for hemoglobin S to aggregate into fibres when oxygen is low, distorting the red blood cell.',
    sources: [
      { label: 'UniProt P68871 — HBB (hemoglobin subunit beta)', url: 'https://www.uniprot.org/uniprotkb/P68871/entry' },
      { label: 'ClinVar — HBB p.Glu7Val (rs334), the HbS allele', url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/15333/' },
      { label: 'GBD 2021 sickle cell disease prevalence & mortality', url: 'https://www.healthdata.org/research-analysis/library/global-regional-and-national-prevalence-and-mortality-burden-sickle-cell' }
    ]
  },

  cf: {
    name: 'Cystic fibrosis (F508del)',
    tag:  'Ion-channel disorder · ~100,000+ worldwide',
    icon: '◈',
    quote: 'The most common cystic fibrosis variant deletes a single amino acid. The CFTR protein misfolds and is degraded before it reaches the cell surface — in the melody, a beat is simply missing.',
    facts: [
      'In-frame deletion of phenylalanine 508 (F508del / ΔF508)',
      'Present on ~70% of CF alleles in people of European ancestry',
      'Misfolded CFTR is degraded in the endoplasmic reticulum'
    ],
    summary: 'Phenylalanine (F) at position 508 of CFTR is deleted. The rest of the chain shifts left by one, so the mutant sequence is one residue shorter. In the mapping, that position is played as a silent beat.',
    healthy: { name: 'CFTR, residues 504–516', seq: 'ENIIFGVSYDEYR' },
    mutation: { type: 'deletion', index: 4, biologicalPosition: 508, from: 'F', to: null },
    insight: 'A deletion shortens the melody by one note. You hear a gap where a sound should be, because there is literally one fewer residue to play.',
    sources: [
      { label: 'UniProt P13569 — CFTR', url: 'https://www.uniprot.org/uniprotkb/P13569/entry' },
      { label: 'ClinVar — CFTR p.Phe508del (rs113993960)', url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/7105/' },
      { label: 'Cystic Fibrosis Foundation — About Cystic Fibrosis', url: 'https://www.cff.org/intro-cf/about-cystic-fibrosis' }
    ]
  },

  ttr: {
    name: 'Transthyretin amyloidosis (V30M)',
    tag:  'Heart & nerve · hereditary ATTR',
    icon: '♥',
    quote: 'Both the original and replacement residues are nonpolar, so the note barely moves — yet the extra bulk is enough to destabilise the transthyretin tetramer, which slowly deposits as amyloid in nerves and the heart.',
    facts: [
      'Substitution: transthyretin Val30 → Met (also written V50M in UniProt numbering)',
      'One of the most common hereditary ATTR variants worldwide',
      'Causes progressive polyneuropathy and cardiomyopathy'
    ],
    summary: 'Valine (V) at mature position 30 of transthyretin becomes methionine (M). Both are nonpolar and map to nearby notes, so the pitch change is subtle — a reminder that a damaging mutation need not sound dramatic.',
    healthy: { name: 'Transthyretin, residues 24–38 (mature numbering)', seq: 'PAINVAVHVFRKAAD' },
    mutation: { type: 'substitution', index: 6, biologicalPosition: 30, from: 'V', to: 'M' },
    insight: 'Valine and methionine are both nonpolar, so the note only nudges. The damage comes from lost tetramer stability, not from a large chemical swing.',
    sources: [
      { label: 'UniProt P02766 — TTR (transthyretin)', url: 'https://www.uniprot.org/uniprotkb/P02766/entry' },
      { label: 'ClinVar — TTR p.Val50Met (rs28933979)', url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/13426/' }
    ]
  },

  apoe: {
    name: "APOE ε4 — Alzheimer's risk factor",
    tag:  'Risk allele · ~1 in 4 carry an ε4 copy',
    icon: '◎',
    quote: "APOE ε4 is a risk factor, not a disease gene. A single residue change (Cys112 → Arg) shifts how the protein handles lipids and amyloid-β, and is associated with higher Alzheimer's risk.",
    facts: [
      'Substitution: apolipoprotein E Cys112 → Arg (defines the ε4 allele)',
      'Roughly one in four people carry at least one ε4 allele',
      'A risk factor — most ε4 carriers do not develop Alzheimer’s disease'
    ],
    summary: 'Cysteine (C, polar) at mature position 112 of apolipoprotein E becomes arginine (R, positively charged). The added positive charge maps to a clearly higher note.',
    healthy: { name: 'Apolipoprotein E, residues 104–118 (mature numbering)', seq: 'LGADMEDVCGRLVQY' },
    mutation: { type: 'substitution', index: 8, biologicalPosition: 112, from: 'C', to: 'R' },
    insight: 'Neutral, polar cysteine becomes positively charged arginine, so the note rises. The biological effect is a shift in lipid binding and amyloid clearance, which raises risk without guaranteeing disease.',
    sources: [
      { label: 'UniProt P02649 — APOE (apolipoprotein E)', url: 'https://www.uniprot.org/uniprotkb/P02649/entry' },
      { label: 'dbSNP rs429358 — the APOE ε4-defining variant', url: 'https://www.ncbi.nlm.nih.gov/snp/rs429358' },
      { label: 'MedlinePlus Genetics — APOE gene', url: 'https://medlineplus.gov/genetics/gene/apoe/' }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DISEASES };
}
