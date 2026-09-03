# Setup guide

How to run **Mutant Melody** locally, deploy the static site, and
(optionally) deploy the AI backend.

> **Never put an API key in the front-end or commit one to Git.** The key
> belongs only in the backend's environment. `.env` is git-ignored on
> purpose; `.env.example` is the template.

---

## What you need

| Tool | For | Notes |
|---|---|---|
| A browser | running the app | Chrome, Firefox, Safari, Edge |
| Node 18+ | tests and the local AI backend | [nodejs.org](https://nodejs.org) |
| Python 3 *or* any static server | serving the front-end locally | `python -m http.server` |
| A GitHub account | hosting the static site on Pages | free |
| A Groq API key | the AI features only | [console.groq.com](https://console.groq.com) — free tier, limits apply |

---

## Part 1 — Run the front-end locally

```bash
git clone https://github.com/Kay116/mutant-melody.git
cd mutant-melody
python -m http.server 8080
```

Open <http://localhost:8080>. The **Listen**, **Compare**, **My sequence**
(visualization + playback) and **Quiz** tabs work with no further setup.

The **Ask AI** tab and the AI analysis in **My sequence** stay disabled
until you point the app at a backend (Part 3).

---

## Part 2 — Deploy the static site (GitHub Pages)

1. Push this repository to GitHub (it is already at
   `github.com/Kay116/mutant-melody`).
2. Repo **Settings → Pages**.
3. **Build and deployment → Source:** *Deploy from a branch*.
4. **Branch:** `main`, **Folder:** `/ (root)` → **Save**.
5. After ~1 minute the site is live at
   `https://Kay116.github.io/mutant-melody`.

To update the live site, push to `main`.

GitHub Pages serves static files only, so the AI backend must be hosted
elsewhere (Part 3). That is fine — the app is designed to run without it.

---

## Part 3 — The AI backend (optional)

### 3a. Get a Groq key

1. Sign in at [console.groq.com](https://console.groq.com).
2. **API Keys → Create API Key**, copy it (shown once; starts with `gsk_`).
3. Keep it somewhere safe. Do **not** paste it into any file that gets
   committed.

### 3b. Run the backend locally

```bash
cp .env.example .env
# edit .env and set: GROQ_API_KEY=gsk_your_real_key
node server.js
```

This serves the same handler as `api/chat.js` at
<http://localhost:8787/api/chat>.

In `data/config.js` set:

```js
apiBase: 'http://localhost:8787',
```

Reload the front-end — the AI tabs now work.

### 3c. Deploy the backend

`api/chat.js` exports a standard Node request handler
(`(req, res) => {}`), compatible with Vercel and Netlify Functions as-is
(other hosts may need a thin adapter).

1. Create a project on the host and add `api/chat.js`.
2. In the host's dashboard, set the environment variable
   **`GROQ_API_KEY`** to your key.
3. *(Optional)* set **`ALLOWED_ORIGINS`** to a comma-separated list, e.g.
   `https://Kay116.github.io`, to reject requests from other origins.
4. Deploy. Note the deployment origin, e.g. `https://your-app.vercel.app`.
5. In `data/config.js` set `apiBase` to that origin and push, so Pages
   picks it up.

The backend enforces its own limits (request shape, message length,
sequence length, a small per-instance rate limit) and returns only
`{ "reply": "..." }` — never the key or provider metadata.

---

## Part 4 — Tests

```bash
npm install
npm run check      # syntax check + 63 unit/DOM tests
```

CI (`.github/workflows/ci.yml`) runs the same on every push and PR.

---

## Part 5 — Adding a disease

Add an entry to `data/diseases.js` following the existing pattern:

```js
your_key: {
  name: 'Display name',
  tag:  'Category · prevalence note',
  icon: '◆',
  quote: 'One-sentence framing.',
  facts: ['Fact 1', 'Fact 2', 'Fact 3'],
  summary: 'Plain-text description of the mutation (no HTML).',
  healthy: { name: 'Protein, residues A–B', seq: 'VERBATIMUNIPROTSLICE' },
  mutation: { type: 'substitution', index: 4, biologicalPosition: 123, from: 'E', to: 'K' },
  //         type: 'deletion' uses  to: null
  insight: 'Plain-text: what changed and why it matters.',
  sources: [
    { label: 'UniProt Xxxxxx', url: 'https://www.uniprot.org/uniprotkb/Xxxxxx/entry' },
    { label: 'ClinVar / dbSNP …', url: 'https://…' }
  ]
}
```

Rules the test suite enforces (`npm test`):

- `seq` is a verbatim UniProt slice, standard residues only, ≥ 3 long.
- `mutation.index` is in range and `seq[index] === mutation.from`.
- substitution `to` is a standard residue and differs from `from`;
  deletion `to` is `null`.
- at least one `sources` entry with an `https://` URL.
- `summary` and `insight` contain no `<` or `>`.

Get sequences and numbering from [UniProt](https://www.uniprot.org),
variants from [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/), and
structures from [RCSB PDB](https://www.rcsb.org).

---

## Troubleshooting

**AI tab says "not configured"** — `data/config.js` `apiBase` is empty or
wrong, or the backend is down. Everything else still works.

**Backend returns 500** — `GROQ_API_KEY` is not set in its environment.

**Backend returns 403** — `ALLOWED_ORIGINS` does not include the origin
the site is served from.

**Music not playing** — browsers block audio until you interact with the
page; clicking a Play button counts. On iOS, check the silent switch.

**Long sequence looks cramped** — the piano roll scrolls horizontally; a
processed sequence over 500 residues is rejected by design.
