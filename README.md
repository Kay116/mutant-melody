# Disease in D Minor

> One wrong amino acid. One wrong note. Hear the difference.

A personal project rebuilding and expanding an idea I originally explored at a bioinformatics hackathon 10 months ago — now developed solo with a proper codebase, AI integration, and a full educational experience for the public.

**Live demo:** `https://Kay116.github.io/disease-in-d-minor`

---

## What it does

Turn genetic mutations into music. Each amino acid in a protein sequence maps to a musical note based on its chemical property. When a mutation occurs — one amino acid swapped, one deleted — you hear it as a wrong note or a missing beat in the melody.

No biology background needed. The AI guide explains everything in plain English.

| Tab | What you get |
|---|---|
| **Listen** | Hear healthy vs mutant sequences as music, side by side |
| **Compare** | See amino acid composition as visual bar charts |
| **Ask AI** | Free AI guide answers any question about the disease or mutation |
| **My sequence** | Paste any sequence from SabDab, Echinobase, or UniProt and hear it |
| **Quiz** | Five questions to test your understanding |

---

## Diseases covered

| Disease | Mutation | Type | Why it sounds different |
|---|---|---|---|
| Sickle cell | Glu → Val at position 6 | Substitution | Negative charge lost — pitch jumps upward |
| Cystic fibrosis | Phe deleted at position 508 | Deletion | A note is completely missing |
| Transthyretin amyloidosis | Val → Met at position 30 | Substitution | Nearly inaudible — same group, subtle shift |
| Alzheimer's risk (ApoE4) | Cys → Arg at position 112 | Substitution | Neutral → positive charge — pitch rises clearly |

---

## How the music works

Each amino acid is assigned a MIDI note based on its physicochemical group:

```
Negative charge  →  lowest pitch   (D, E)
Nonpolar         →  mid pitch      (A, G, V, L, I, P, F, M, W)
Polar            →  higher pitch   (S, T, C, N, Q, Y)
Positive charge  →  highest pitch  (K, R, H)
```

This mapping is grounded in the research of Yu et al. (2019) and Buehler (2023) — not arbitrary. A mutation that changes amino acid charge is directly audible as a pitch shift. A deletion is a literal missing note.

---

## Project structure

```
disease-in-d-minor/
│
├── index.html          ← page structure only, no logic
├── README.md           ← you are here
├── SETUP.md            ← step-by-step setup guide
│
├── css/
│   └── style.css       ← all design: colors, fonts, layout
│
├── data/
│   ├── aminoacids.js   ← amino acid → MIDI note mappings + color groups
│   ├── diseases.js     ← all 4 disease sequences, mutations, and metadata
│   └── quiz.js         ← quiz questions and explanations
│
└── js/
    ├── audio.js        ← Web Audio API: plays notes and sequences
    ├── render.js       ← draws piano rolls, amino acid strips, charts
    ├── ai.js           ← Groq AI API: chat guide + custom sequence analysis
    └── app.js          ← main controller: tabs, disease loading, quiz
```

Each file has one job. To add a new disease, only touch `data/diseases.js`. To change colors, only touch `css/style.css`. Nothing is tangled together.

---

## Quick start

See **[SETUP.md](SETUP.md)** for the full step-by-step guide with screenshots.

Short version:

```
1. Clone or download this repo
2. Get a free Groq key at console.groq.com
3. Add your key to js/ai.js
4. Double-click index.html — runs in any browser, no install needed
```

---

## Origin

This project started as a hackathon concept exploring bioinformatics and music together. The original team of 7 built a basic proof-of-concept: a Python notebook that mapped amino acid sequences to MIDI notes.

Ten months later I rebuilt it from scratch as a solo project — expanding the scope, redesigning the interface, adding AI, and making it genuinely useful for a public audience rather than just a technical demo.

The core scientific insight is the same. Everything else is new.

---

## References

- Buehler, M. J. (2023). Unsupervised cross-domain translation via deep learning and adversarial attention neural networks and application to music-inspired protein designs. *Patterns*, 4(3). https://doi.org/10.1016/j.patter.2023.100692
- Yu, C.-H., Qin, Z., Martin-Martinez, F. J., & Buehler, M. J. (2019). A self-consistent sonification method to translate amino acid sequences into musical compositions and application in protein design using artificial intelligence. *ACS Nano*, 13(7), 7471–7482.
- Hacisuleyman, A., & Erman, B. (2020). ModiBodies: A computational method for modifying nanobodies. *J Biol Phys*, 46, 189–208.
- [SAbDab](https://opig.stats.ox.ac.uk/webapps/sabdab-sabpred/sabdab) — Structural Antibody Database
- [Echinobase](https://www.echinobase.org) — Marine invertebrate protein database
