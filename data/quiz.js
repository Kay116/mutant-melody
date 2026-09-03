const QUIZ_DATA = [
  {
    q: 'In sickle cell disease, what kind of mutation occurs in the β-globin gene?',
    opts: [
      'A whole section of DNA is deleted',
      'One amino acid is swapped for another',
      'Two amino acids switch positions',
      'An extra amino acid is inserted'
    ],
    ans: 1,
    exp: 'It is a single point mutation: glutamate (E) at β-globin position 6 becomes valine (V). One substitution in a 146-residue chain is enough to make hemoglobin S aggregate when oxygen is low.'
  },
  {
    q: 'In this app’s sonification mapping, which amino acids are given the lowest pitch?',
    opts: [
      'Nonpolar amino acids',
      'Polar amino acids',
      'Positively charged amino acids',
      'Negatively charged amino acids'
    ],
    ans: 3,
    exp: 'This app maps negatively charged residues — aspartate (D) and glutamate (E) — to the lowest notes. It is an educational design choice based on broad chemical groups, not a physical measurement.'
  },
  {
    q: 'Cystic fibrosis F508del is a deletion. How is that represented in the melody here?',
    opts: [
      'An extra note appears',
      'A note is played twice as long',
      'A beat is silent and the mutant line is one note shorter',
      'The melody plays backwards'
    ],
    ans: 2,
    exp: 'One residue (phenylalanine 508) is removed, so the mutant sequence has one fewer amino acid. The app keeps that position in the timeline and plays it as silence, so the two lines stay aligned.'
  },
  {
    q: 'The transthyretin V30M mutation swaps valine for methionine. Why does it barely change the note?',
    opts: [
      'The app ignores rare mutations',
      'Valine and methionine are both nonpolar and map to nearby pitches',
      'Methionine has no assigned note',
      'The mutation is silent at the DNA level'
    ],
    ans: 1,
    exp: 'Valine and methionine are both nonpolar, so they map to neighbouring notes. A small audible change does not mean a small biological effect — V30M still destabilises transthyretin and causes amyloidosis.'
  },
  {
    q: 'What does the height of each bar in the piano roll represent?',
    opts: [
      'How many atoms the amino acid has',
      'The molecular weight of the residue',
      'The mapped musical pitch — a higher bar is a higher note',
      'The position of the residue in the sequence'
    ],
    ans: 2,
    exp: 'Bar height encodes the mapped pitch. In this scheme negatively charged residues sit low, positively charged residues sit high, and nonpolar and polar residues fall in between.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUIZ_DATA };
}
