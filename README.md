# Mutant Melody

> One changed amino acid, one changed note. Hear the difference.

An interactive, browser-based demo that turns four well-known protein
mutations into short melodies, so a non-specialist can *hear* the
difference between a healthy and a mutant sequence. Each amino acid is
mapped to a musical note by its broad chemical group; a substitution
becomes a changed note and a deletion becomes a silent beat.

**Live demo:** https://Kay116.github.io/mutant-melody

> ⚠️ **Educational demonstration — not medical or diagnostic advice.**
> The amino-acid-to-note mapping is a *research-inspired teaching device*
> based on broad physicochemical categories. It does not measure or
> predict protein structure or function, and an audible difference does
> **not** indicate disease severity or risk. See [Limitations](#limitations).

---

## What it does

| Tab | What you get | Needs AI backend? |
|---|---|---|
| **Listen** | Healthy vs mutant sequence played as notes, with aligned piano-roll and amino-acid strips | No |
| **Compare** | Amino-acid composition of both sequences, computed from the sequence itself | No |
| **Ask AI** | A short plain-English explanation of the selected disease | Yes |
| **My sequence** | Paste any sequence (plain or FASTA); see and play its visualization | Visualization: no · analysis: yes |
| **Quiz** | Five questions on the core idea | No |

If no AI backend is configured, the two AI features show a clear
"not configured" message and everything else keeps working.

---

## Diseases covered

Every sequence window below is a verbatim slice of the UniProt canonical
sequence for that protein. `data/diseases.js` records the accession,
the ClinVar/dbSNP identifier, and a prevalence source for each entry.

| Disease | Variant | Type | Protein (UniProt) |
|---|---|---|---|
| Sickle cell disease | β-globin Glu6→Val (HbS) | substitution | [P68871](https://www.uniprot.org/uniprotkb/P68871/entry) |
| Cystic fibrosis | CFTR Phe508del (ΔF508) | deletion | [P13569](https://www.uniprot.org/uniprotkb/P13569/entry) |
| Transthyretin amyloidosis | TTR Val30→Met (p.Val50Met) | substitution | [P02766](https://www.uniprot.org/uniprotkb/P02766/entry) |
| APOE ε4 (Alzheimer's risk factor) | ApoE Cys112→Arg | substitution | [P02649](https://www.uniprot.org/uniprotkb/P02649/entry) |

Prevalence figures are cited in the app (e.g. sickle cell disease
prevalence from the Global Burden of Disease Study 2021). APOE ε4 is a
**risk factor**, not a disease gene.

---

## How the note mapping works

Each amino acid is assigned a MIDI note by its broad physicochemical
group:

```
Negative charge  (D, E)                     → lowest notes
Nonpolar         (A, G, V, L, I, P, F, M, W)→ mid notes
Polar            (S, T, C, N, Q, Y)         → higher notes
Positive charge  (K, R, H)                  → highest notes
```

This is a deliberate teaching simplification inspired by protein
*sonification* research (e.g. Yu et al., 2019). It is **not** a
reproduction of experimentally measured molecular vibrations, and it is
not the method used in those papers. A charge-changing mutation is
audible as a pitch step; a deletion is a literal missing beat.

---

## Architecture

```
Browser (static, hostable on GitHub Pages)
├── index.html            page structure + ARIA roles
├── css/style.css         all styling (dark theme, reduced-motion aware)
├── data/
│   ├── config.js         runtime config — apiBase for the AI backend
│   ├── aminoacids.js     amino-acid → note/group table + MIDI helpers
│   ├── diseases.js       4 disease entries: sequence window, structured
│   │                     mutation model, sources
│   └── quiz.js           quiz questions
└── js/
    ├── sequence.js       pure: FASTA parse, validation, stats, alignment
    ├── audio.js          Web Audio: oscillator lifecycle, silent beats
    ├── render.js         canvas + DOM rendering (textContent only)
    ├── ai.js             calls the backend; degrades cleanly if absent
    └── app.js            state, tab pattern, disease loading, quiz

Optional AI backend (deploy separately)
└── api/chat.js           serverless handler: validates input, holds the
                          GROQ_API_KEY in its environment, returns { reply }
    server.js             local dev wrapper for api/chat.js
```

### The mutation model

`data/diseases.js` stores a structured mutation instead of a bare index:

```js
mutation: { type: 'deletion', index: 4, biologicalPosition: 508, from: 'F', to: null }
```

`buildAlignment()` (in `js/sequence.js`) turns that into aligned
healthy/mutant tracks. A deletion inserts a `null` slot in the mutant
track, which renders as a dashed gap and plays as scheduled silence, so
later residues stay visually and rhythmically aligned.

---

## Run it locally

No build step. Any static file server works:

```bash
git clone https://github.com/Kay116/mutant-melody.git
cd mutant-melody
python -m http.server 8080      # then open http://localhost:8080
```

The Listen, Compare, My-sequence (visualization) and Quiz tabs work
immediately. The AI tabs need a backend — see below.

---

## AI backend (optional)

The AI features call `POST {apiBase}/api/chat`. The provider key lives
**only** in that backend's environment — never in the browser, never in
this repository.

### Local

```bash
cp .env.example .env
# put your real Groq key in .env  (get one at https://console.groq.com)
node server.js                  # serves http://localhost:8787/api/chat
```

Then set `apiBase: 'http://localhost:8787'` in `data/config.js`.

### Deployed

Deploy `api/chat.js` to any Node serverless host (Vercel, Netlify
Functions, Cloudflare Workers with a small adapter, …):

1. Set the environment variable `GROQ_API_KEY` in the host's dashboard.
2. Optionally set `ALLOWED_ORIGINS` (comma-separated) to restrict callers.
3. Set `apiBase` in `data/config.js` to the deployment origin and
   redeploy the static site.

The handler validates request shape and length, applies a small
per-instance rate limit, sends its own system prompt (which forbids
diagnosis and confident protein identification), and returns only
`{ "reply": "..." }`.

If you keep the site GitHub Pages-only, leave `apiBase` empty — the AI
features will simply report that they are unavailable.

---

## Privacy

- The static site sets no cookies and sends no analytics.
- **Ask AI**: your questions plus the selected disease's name, mutation
  and sequence window are sent to your AI backend, which forwards them to
  the Groq API (a third-party provider).
- **My sequence**: a sequence you analyze with AI is sent to the backend
  and on to Groq. If you only use the visualization/playback, nothing
  leaves your browser.
- This app does not persist your chats or sequences anywhere.

---

## Limitations

- The note mapping is an educational device, not a measurement. Different
  chemical groupings would produce different music.
- "Simplified charge balance" counts K/R/H as +1 and D/E as −1. It is not
  a pH-dependent net charge.
- Sequence windows are short slices chosen to show one variant clearly;
  they are not whole proteins.
- AI responses can be wrong. The prompt tells the model not to diagnose
  or to identify a protein with confidence from a short sequence; real
  identification needs alignment/database tools such as BLAST or a
  UniProt search.
- Groq's free tier has rate limits that change over time; the app surfaces
  a friendly error if you hit one.

---

## Tests

```bash
npm install      # dev dependency: jsdom
npm run check    # syntax check + unit/DOM tests  (63 tests)
```

Covered: FASTA parsing and validation, MIDI/frequency conversion,
computed composition statistics, mutation-metadata validation for every
disease, substitution/deletion alignment, the CF silent-beat gap,
HTML-injection regression (chat and custom result render as text), basic
DOM rendering, the tab pattern, quiz scoring, and AI-unavailable
degradation. CI runs the same checks on every push and pull request
(`.github/workflows/ci.yml`).

---

## License

Not yet chosen — all rights reserved by the repository owner until a
`LICENSE` file is added.

---

## References

- Yu, C.-H., Qin, Z., Martin-Martinez, F. J., & Buehler, M. J. (2019). A
  self-consistent sonification method to translate amino acid sequences
  into musical compositions and application in protein design using
  artificial intelligence. *ACS Nano*, 13(7), 7471–7482.
- Buehler, M. J. (2023). Unsupervised cross-domain translation via deep
  learning and adversarial attention neural networks and application to
  music-inspired protein designs. *Patterns*, 4(3), 100692.
- UniProt Consortium. UniProt: the Universal Protein Knowledgebase.
  https://www.uniprot.org
- Landrum, M. J. et al. ClinVar. https://www.ncbi.nlm.nih.gov/clinvar/
- GBD 2021 Sickle Cell Disease Collaborators (2023). *The Lancet Haematology*.
  https://www.healthdata.org/research-analysis/library/global-regional-and-national-prevalence-and-mortality-burden-sickle-cell
