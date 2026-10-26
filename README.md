# AVIA — learn with a live idea

AVIA is a local-first quiz companion. Choose a learning voice and start in either of two ways: enter a **topic title** for a live, cited Wikipedia lookup, or use **your own notes/files**. AVIA builds a varied question set and presents it one question at a time with feedback and a revision map. Question generation and short-answer evaluation use the Ollama model running on the computer where AVIA's backend is started; there is no cloud AI provider, API key, subscription, account, or database.

## Important privacy note about this preview

The Manus Preview is hosted in a remote development sandbox, not on your computer. Do **not** upload sensitive material to the Preview. For local handling, run the frontend and FastAPI backend on your computer beside your local Ollama service. In material mode, files and pasted notes are sent only to the AVIA backend you run. In live-topic mode, AVIA sends the title you entered to the public Wikipedia API; it does not send your files, pasted notes, answers, credentials or private material to Wikipedia. A hosted Preview's `localhost` points to its own remote environment, not your computer.

## How live topic retrieval works

AVIA uses Wikipedia's public English-language MediaWiki API, without a search API key. For a title-only quiz, the backend performs one search for up to five namespace-0 article results, then one sequential, batched request for their plaintext extracts. It clips the returned learning context to 25,000 characters, caches the result in process memory for one hour (up to 64 titles), and gives the retrieved evidence to the selected **local** Ollama model. Search and extracts use a bounded timeout and a descriptive User-Agent; the app does not accept arbitrary fetch URLs. No useful articles, disambiguation-only matches, empty extracts, rate limits, and network failures produce a clear recovery message instead of fabricated sources. Coverage depends on the pages Wikipedia has for the subject; there is no guarantee for every possible title.

Live article titles and URLs are shown on the quiz and results screens. AVIA-generated questions are not a verbatim article reproduction. Wikipedia article text is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); follow the linked article for attribution and page-specific details. See the official [MediaWiki Search API](https://www.mediawiki.org/wiki/API:Search), [Query API](https://www.mediawiki.org/wiki/API:Query), [TextExtracts](https://www.mediawiki.org/wiki/Extension:TextExtracts), and [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette).

For a shared/public deployment, set `WIKIMEDIA_USER_AGENT` in `.env` to an identifiable client string with a real contact URL or email. Local one-person use has a descriptive AVIA default.

## Requirements

- Node.js 22 or newer with npm 10.9.9 (the package manager is pinned by the project).
- Python 3.11 or newer.
- Ollama installed and running on the computer hosting AVIA, with at least one model installed.
- Optional for image OCR fallback: the Tesseract executable installed locally; AVIA uses the `pytesseract` adapter if the selected Ollama model cannot process images.
- Internet access for the backend when using Live topic. My material mode does not need the Wikipedia lookup.

## 1. Configure local Ollama

Start Ollama using its normal desktop app/service and confirm it is reachable. List installed models:

```bash
ollama list
```

If the list is empty, install a model with Ollama's normal command, for example `ollama pull <your-model-name>`, then refresh AVIA's model list. AVIA never assumes a model is installed; choose an entry returned by Ollama. For image files, select a model that reports `vision` in `/api/show`; otherwise AVIA tries local Tesseract OCR and shows an explicit error if OCR is unavailable.

The default Ollama URL is `http://localhost:11434`. If yours uses another URL, set `OLLAMA_BASE_URL` in `.env`. When frontend and backend run on separate local origins, add that exact frontend origin to `CORS_ALLOWED_ORIGINS`; do not use a permissive wildcard.

## 2. Install and start the backend

From the AVIA project root, create a virtual environment and install the pinned Python dependencies.

**macOS/Linux:**

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r backend/requirements.txt
cp .env.example .env
./.venv/bin/uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Windows PowerShell:**

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The backend listens on `http://127.0.0.1:8000`. Open `/api/health` to check app/Ollama connectivity, or `/docs` for the local API schema. CORS accepts only the configured local frontend origins by default.

## 3. Start the frontend

Open a second terminal at the project root:

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:3000`). The development server proxies `/api` to FastAPI on port 8000. Set `AVIA_API_PROXY_TARGET` before Vite starts only if the backend runs at another local address.

## VS Code workflow

Open the AVIA project folder in VS Code. Keep one terminal for FastAPI and one for `npm run dev`; keep the Ollama app/service running separately. Choose **Live topic** to enter just a title, or **My material** to add notes/files without any public search request. Select the role, difficulty, style and 5, 10, 15, 20 or 30 questions. Refresh Ollama's model list after starting the service or installing a model.

## Learning-material limits and handling

Supported formats are TXT, Markdown, PDF, PPTX, PNG, JPG/JPEG and WEBP. Limits are 10 files, 15 MB per file, 40 MB combined, and 80,000 extracted characters. PDF and slide text are extracted locally, and PPTX slide order is preserved. Image understanding checks local Ollama model capabilities; Tesseract may be used as a local fallback. Embedded PPTX images and scanned PDFs without OCR text are not processed. Corrupt, empty, unreadable, oversized and unsupported files produce file-level errors.

AVIA does not execute uploaded macros/scripts. In My material mode, study material is treated as untrusted evidence rather than instructions that can replace AVIA's prompts. Files and notes are not sent to Wikipedia or an external AI. Quiz answers remain in the backend's in-memory session store and are not returned with the question payload; localStorage only keeps user preferences and brief recent-result summaries. Sessions expire after six hours and are lost if FastAPI restarts. No learning files or notes are intentionally persisted by the app.

## Checks

```bash
npm run check
npm run build
./.venv/bin/python -m pytest -q
./.venv/bin/python -m compileall -q backend
pyright --project pyrightconfig.json backend
```

The latest sandbox run passed **17 tests** (with one third-party Starlette/AnyIO deprecation warning), plus TypeScript build/check, Python compilation and Pyright with zero diagnostics. Tests cover source-mode validation, bounded and cached Wikipedia retrieval, no-results/timeouts/rate limits, citations, live/material separation, text/PPTX extraction, answer privacy and idempotent scoring. A separate live read-only Wikipedia smoke request retrieved the Photosynthesis article. The sandbox has no Ollama executable or model, so real model-generated quiz writing and short-answer evaluation have not been verified; start a model in local Ollama to exercise those paths.

## API endpoints

- `GET /api/health` — app health and local Ollama status.
- `GET /api/models` — installed local Ollama models.
- `POST /api/content/ingest` — validate and extract uploaded study material locally.
- `POST /api/quiz/generate` — generate from a selected live title or own study material, return source citations when Live topic is selected, and hide answers.
- `POST /api/quiz/evaluate` — evaluate one submitted answer and then return the expected answer and explanation.

## Project layout

`src/` contains the React app, AVIA entry page, source-mode setup, typed API client, original mascot and theme. `backend/` contains FastAPI schemas, local Ollama access, Wikimedia retrieval, upload extraction, evaluation and source parsing. `backend/tests/` contains automated local tests. No database is used.
