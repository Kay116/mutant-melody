const QUIZ_DATA = [
  {
    q: 'In sickle cell disease, what kind of mutation occurs?',
    opts: [
      'A whole section of DNA is deleted',
      'One amino acid is swapped for another',
      'Two amino acids switch positions',
      'An extra amino acid is inserted'
    ],
    ans: 1,
    exp: 'Sickle cell is a single point mutation — glutamic acid (E) becomes valine (V) at position 6. Just one swap out of 147 causes the entire protein to misfold.'
  },
  {
    q: 'In the sonification system, which amino acids get the lowest pitch?',
    opts: [
      'Nonpolar amino acids',
      'Polar amino acids',
      'Positively charged amino acids',
      'Negatively charged amino acids'
    ],
    ans: 3,
    exp: 'Negatively charged amino acids like aspartate (D) and glutamate (E) are mapped to the lowest pitches. When sickle cell removes that charge, the pitch jumps — and you can hear it.'
  },
  {
    q: 'Cystic fibrosis is caused by a deletion. What does this sound like in the music?',
    opts: [
      'An extra note appears',
      'A note is played twice as long',
      'A note is completely missing',
      'The melody plays backwards'
    ],
    ans: 2,
    exp: 'A deletion means one amino acid is removed entirely. In the music this appears as a missing note — a gap where a sound should be. The mutant sequence is literally one beat shorter.'
  },
  {
    q: 'Why is TTR amyloidosis especially relevant to this project?',
    opts: [
      'It was the first disease ever sequenced',
      'Nanobodies are being developed to treat it',
      'It has the most dramatic musical change',
      'It affects the most people worldwide'
    ],
    ans: 1,
    exp: 'TTR amyloidosis is directly connected to nanobody research — the very thing your team explored. Nanobodies that bind misfolded TTR are being actively developed as therapies.'
  },
  {
    q: 'What does the height of each bar in the piano roll represent?',
    opts: [
      'How many atoms the amino acid has',
      'The molecular weight',
      'The musical pitch — higher bar = higher note',
      'The position in the sequence'
    ],
    ans: 2,
    exp: 'Bar height directly encodes pitch. Negatively charged amino acids have short bars (low pitch), positively charged ones have tall bars (high pitch), and nonpolar acids sit in the middle range.'
  },
  {
    q: 'In alpha-1 antitrypsin deficiency, what happens after the E342K mutation flips a negative charge to a positive one?',
    opts: [
      'The protein is destroyed immediately by the immune system',
      'The protein misfolds and clumps up inside liver cells instead of being released',
      'The protein becomes more stable and works better than before',
      'Nothing changes — the mutation is silent'
    ],
    ans: 1,
    exp: 'The charge reversal causes AAT molecules to misfold and stick together inside liver cells. This damages the liver and starves the lungs of the protective enzyme they need, leading to early emphysema.'
  },
  {
    q: 'Phenylketonuria (PKU) prevents the body from breaking down which amino acid?',
    opts: [
      'Glycine',
      'Lysine',
      'Phenylalanine',
      'Proline'
    ],
    ans: 2,
    exp: 'PKU is caused by mutations in the PAH gene, which encodes the enzyme that converts phenylalanine into tyrosine. Without working PAH, phenylalanine builds up in the blood and can harm brain development — which is why newborns are screened for it right after birth.'
  }
];
