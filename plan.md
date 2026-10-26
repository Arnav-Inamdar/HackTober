# AVIA — implementation plan

## Scope and constraints

Continue the existing AVIA learning app. Preserve its React/Vite/TypeScript frontend, separate FastAPI backend, local Ollama-only question generation and evaluation, document extraction, role-based quiz interaction, scoring and local-first limits. Add a designed entrance page, clearly distinct topic-only versus own-material quiz setup, live public-source retrieval for a topic title, visible citations, a broader dynamic question set, smooth scroll reveals, and a new white/black/red theme. No accounts, paid AI, external LLMs, API keys, database, or cloud document storage.

The selected no-key live source is Wikipedia's public MediaWiki Action API. A topic-mode quiz searches by the user's title, fetches several matching pages' plain-text extracts in a single follow-up request, and gives those passages to the existing local Ollama model as grounded context. Return article titles/URLs alongside the quiz and show attribution in quiz and result views. Requests will be sequential, identified with a descriptive User-Agent, modestly capped, and cached locally. Only the topic title is sent to Wikipedia; uploaded documents and pasted notes are never included in those requests. If search finds no useful pages, times out, or returns unusable extracts, show a clear error and let the learner switch to their own notes rather than fabricate retrieved evidence. Retrieval coverage depends on Wikipedia indexing and is not a promise of universal or exhaustive topic coverage.

Research grounding for the implementation: MediaWiki's [Search API](https://www.mediawiki.org/wiki/API:Search) supports read-only page search with `list=search`, namespace restriction and a bounded result limit. [Query](https://www.mediawiki.org/wiki/API:Query) and [TextExtracts](https://www.mediawiki.org/wiki/Extension:TextExtracts) provide page-ID batched extracts in plaintext; a live sandbox request confirmed that omitting `exchars` returns fuller text, while the documented `exchars` parameter itself is limited to 1,200 characters. [API Etiquette](https://www.mediawiki.org/wiki/API:Etiquette) recommends a meaningful User-Agent, sequential/batched requests, considerate read rates and caching. Wikipedia's [copyright guidance](https://en.wikipedia.org/wiki/Wikipedia:Copyrights) says article-page links generally satisfy attribution; the interface will link each referenced article and its license information. One two-stage sequence (search, then one batched extract call) returns up to five relevant page excerpts per uncached title and clips them locally to a bounded prompt context.

## Implementation approach

Keep a React single-page application and its separate local FastAPI backend. Add a `landing` page before the existing study-room dashboard, with entry and quiz-start CTAs, useful topic examples that prefill title mode, compact role/mode explanations and scroll-linked sections. Keep the existing dashboard and quiz/results flows. In setup, let the user explicitly choose either **Live topic** or **My material**; a title is sufficient for the first, files/pasted notes are sufficient for the second, and topic remains an optional focus for notes. An unselected mode cannot block quiz creation because the other mode is empty.

Add `backend/knowledge.py` for bounded Wikipedia search/extract retrieval, safe response parsing, error mapping, and short local TTL caching. Extend `GenerationRequest` with a validated input mode, optional material/topic and choices for 5, 10, 15, 20 or 30 questions. Only the live-topic path retrieves a source; create an effective generation request with the retrieved plain-text context while preserving the title and selected persona. Save the retrieved evidence in the short-lived in-memory quiz session for grounded semantic evaluation. Return compact article references in `GenerateResponse` and render linked citations on-screen. Keep note/file-mode content out of the retrieval request.

Use the existing local Ollama HTTP client for all question writing and answer judgment. Expand its generation validation/tests for the five requested count values and up to 30 questions. For RAG, produce the requested number of grounded, non-duplicate questions when the model can; the response may explicitly warn if the local model returns fewer valid questions. Bound retrieved context, per-source extraction and HTTP timeouts. Handle source timeouts, rate limits, no hits, empty/disambiguation pages and malformed content without sending user notes to another service.

Refresh visual design with a warm-white background, near-black typography and a restrained, ownable AVIA red for actions, highlights and orbit details; maintain strong contrast and keep correct/partial/incorrect feedback distinguishable. Reuse the original AVIA mark, redesign the landing-page composition as editorial learning studio rather than a generic grid, and add topic chips, CTA transitions, hover/focus states, a thin scroll-progress indicator and intersection-based section reveals. Use smooth anchor/page transitions and observe `prefers-reduced-motion`. Avoid external image/font downloads.

Vite stays on the initialized preview port (3000) and proxies `/api` to the FastAPI listener (8000). Local VS Code setup remains two terminals. `OLLAMA_BASE_URL` continues to default to `http://localhost:11434` for the computer hosting AVIA; Wikimedia calls originate from FastAPI and contain only the chosen topic title. A hosted sandbox Preview's localhost is still not the user's computer, and its privacy warning must remain explicit.

## Project structure

- `src/`: React landing/dashboard/setup/quiz/results, typed API client, AVIA mascot, uploads, styling and accessible reveal/scroll interactions.
- `public/manus-routes.json`: one-page root route; update its title if appropriate.
- `backend/main.py`: health/model, ingestion, generation/evaluation routes; integration of topic retrieval; source response and error handling.
- `backend/knowledge.py`: MediaWiki requests, page extraction, URL/title validation, cache and RAG context assembly.
- `backend/schemas.py`: source mode, larger question-count choices, source citations and request validation.
- `backend/ollama_client.py`: role/persona safety and grounded question generation.
- `backend/tests/`: retrieval/parser mocks, request validation, answer privacy, scoring and concurrency checks.
- `README.md`, `.env.example`, package lock and pinned Python requirements: local startup, optional Wikipedia User-Agent contact setting, source disclosure, limitations and checks.

## Design system

### Brand essence

AVIA is a curious, quick-witted learning companion that turns either an idea or the learner's own material into a cited, focused quiz. Personality: **clear, lively, trustworthy**.

### Brand voice

Direct, observant and energizing without pressure. Example lines: “Start with a subject. Leave with sharper recall.” “Your notes or a live source—choose what AVIA builds from.”

### Design movement and core principles

An **editorial learning studio** blending Swiss-inspired typographic clarity with the bold punctuation of a modern art journal. Principles: a strong, memorable entrance; generous white space around concise information; one ownable AVIA red for attention; playful but legible interactions; trustworthy source and privacy cues.

### Color philosophy

Warm paper white grounds long reading; near-black carries high-contrast text; a vivid, slightly warm red signals focus, action and AVIA's personality. Neutral grays structure cards without making the app feel sterile. Status colors remain accessible and distinct from the brand red. Avoid dark panels and low-contrast pastel text.

### Layout paradigm

An editorial, asymmetric landing page with a left-aligned oversized promise, AVIA's original mascot staged to the right, a running source strip and scroll-revealed feature/subject bands. The learning app uses compact rail navigation and a broad working surface; phone layouts collapse to a clear single-column flow.

### Signature elements

The original AVIA wing/spark mark; a clean red orbit/underline used as a visual thread through sections; oversized editorial numerals for the three-step process.

### Interaction and animation

Topic chips prefill Live topic; the source-mode toggle swaps only the relevant setup controls; visible source links open separately; hover/focus states stay crisp and keyboard accessible. Anchor scrolling is smooth, sections reveal with subtle opacity/vertical motion, and progress shows scroll position. Honor reduced motion, provide immediate content when animation is disabled, and never animate answer correctness in a way that replaces text.

### Typography and identity

Use system sans-serif for UI/body and Georgia or another system serif for a small number of display lines; do not download fonts. Strong editorial heading scale, comfortable body line-height and compact metadata. Keep the custom AVIA SVG mark rather than using a default-text wordmark.

### Signature brand color

AVIA red: **#D6262E**.

## Serving and dependencies

Preserve the existing project ports and lightweight stack; `httpx` already provides async HTTP for the no-key Wikimedia retrieval, so no separate search library/provider SDK is needed. Use request limits, a distinct client header and bounded local caching. Start both Vite and FastAPI in the sandbox for Preview, but do not imply its Ollama is on the learner's device. Update `.env.example`/README only for optional user-agent contact and source behavior; do not add API keys or a cloud model. No production publication is in scope.
