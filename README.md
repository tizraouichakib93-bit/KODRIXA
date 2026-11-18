# KODRIXA

**Your next idea. Already in code.**

KODRIXA is a bright, multi-page web platform of five focused code tools covering **15 programming languages** (C front and center ★):

| Tool | What it does |
|---|---|
| **Code Generator** | Describe any program in your own words — free-form input, no predefined examples — and get real, editable code. |
| **Code Translator** | Move code between languages, with honest limitation reports when a conversion can't be accurate. |
| **Code Debugger** | Scan for syntax errors with line numbers, plain-language explanations and applicable fixes. |
| **Code Explainer** | Turn any snippet into a beginner-friendly, line-by-line walkthrough. |
| **Hardware Projects** | Curated Arduino builds with components, wiring maps, safety notes and ready-to-upload sketches. |

Every result lands in a syntax-highlighted, fully editable editor with copy and download.

**Live demo:** https://tizraouichakib93-bit.github.io/KODRIXA/

## Two honest modes

- **Demo mode (default):** a bundled engine runs entirely in your browser — no network, no keys, no pretending. Generation composes programs from an intermediate representation (task detection + your actual numbers/names + modifiers), never a fixed canned example. Free-form requests in English **and French** are understood; anything outside the known patterns still yields a clearly-labelled starter program.
- **Live AI mode:** run the Python backend with a provider key and the same interface switches to real AI generation, translation, debugging and explanation. The key stays server-side and never reaches frontend JavaScript. The header pill always tells you which engine answered.

## Repository structure

```
KODRIXA/
├── docs/                  # Frontend — static site, served by GitHub Pages
│   ├── index.html         # Home
│   ├── generator.html     # Tool 01 · Generate
│   ├── translator.html    # Tool 02 · Translate
│   ├── debugger.html      # Tool 03 · Debug
│   ├── explainer.html     # Tool 04 · Explain
│   ├── hardware.html      # Tool 05 · Hardware
│   ├── platform.css       # Shared design system (light theme, violet/blue gradients)
│   ├── js/                # Vanilla JS modules under the window.KX namespace
│   │   ├── core.js        # DOM, toast, clipboard, download, a11y helpers
│   │   ├── ui.js          # Header/footer chrome, mode badge, state helpers
│   │   ├── languages.js   # 15-language registry + capability matrix
│   │   ├── generate.js    # Intent detection + parameter extraction → IR
│   │   ├── synth.js       # IR → real source code, per-language emitters
│   │   ├── editor.js      # Editable editor (textarea over highlighted pre)
│   │   ├── highlight.js   # Syntax highlighting
│   │   ├── api.js         # Same-origin backend client + mode detection
│   │   └── pages/         # One controller per page
│   ├── assets/            # Self-hosted fonts (Inter, Space Grotesk, JetBrains Mono), favicon
│   └── index-legacy.html, app.js, engine.js, data.js, styles.css   # previous version, kept for reference
├── backend/
│   └── server.py          # Static file server + secure AI proxy (Python stdlib only)
├── requirements.txt       # Empty by design — no third-party dependencies
├── .gitignore
└── README.md
```

The frontend folder is named `docs/` because GitHub Pages can only serve from the repository root or a `docs/` folder — this keeps the live URL clean.

## Quick start

### 1. Clone

```bash
git clone https://github.com/tizraouichakib93-bit/KODRIXA.git
cd KODRIXA
```

### 2. Run (demo mode — no key needed)

```bash
python backend/server.py
```

Open http://127.0.0.1:8000 — the header shows **Demo mode** and every tool works locally.

> You can also open `docs/index.html` directly in a browser; the site detects the absence of a backend and stays in demo mode.

### 3. Enable live AI (optional)

Set a provider key **in the server environment** (never in frontend code), then restart:

**Windows (PowerShell):**

```powershell
$env:KODRIXA_API_KEY = "sk-..."
python backend/server.py
```

**macOS / Linux (bash):**

```bash
KODRIXA_API_KEY="sk-..." python backend/server.py
```

The header switches to **AI connected** automatically.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `KODRIXA_API_KEY` | for live AI | — | Provider API key. Read at request time; never logged, written to disk, or sent to the client. |
| `KODRIXA_API_BASE` | no | `https://api.openai.com/v1` | Any OpenAI-compatible API base URL. |
| `KODRIXA_MODEL` | no | `gpt-4o-mini` | Model name. |
| `KODRIXA_HOST` | no | `127.0.0.1` | Bind address. |
| `KODRIXA_PORT` | no | `8000` | Port. |

## Requirements

- **Backend:** Python **3.8+**, standard library only. `requirements.txt` is intentionally empty — there is nothing to `pip install`.
- **Frontend:** any modern browser. No build step, no bundler, no npm dependencies.

## Deployment

- **Frontend (GitHub Pages):** already configured to serve from `main` → `/docs`. Every `git push` to `main` redeploys https://tizraouichakib93-bit.github.io/KODRIXA/ automatically.
- **Backend:** GitHub Pages is static-only and cannot run `server.py`. For live AI online, deploy `backend/` to any Python host (Render, Railway, Fly.io, a VPS…) with `KODRIXA_API_KEY` set, and serve `docs/` from the same origin so the `/api/*` proxy stays same-origin.

## Security notes

- The provider key lives exclusively in server environment variables.
- The browser talks only to the same-origin `/api/*` proxy.
- The static server refuses to serve `.py`, `.env`, `.key`, `.pem` and dotfiles; directory listing is disabled; request bodies are capped at 1 MB.