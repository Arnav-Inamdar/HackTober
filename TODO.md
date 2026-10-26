# AVIA outcomes

## 1. AVIA identity, entrance page, updated visual theme and responsive interactivity
**Status: Implemented; desktop/mobile page captures and entry-to-setup browser navigation verified. Full keyboard/quiz end-to-end check remains open.**
- Build a polished, interactive AI learning companion / quiz-arena website named AVIA, with original visuals and interaction; do not reproduce Akinator branding, character, artwork or exact interface.
- Use a **white background, black/near-black text and red accents** throughout the entry page, dashboard, setup, quiz and results. Keep contrast readable; correctness feedback must remain visually distinguishable and never rely on color alone.
- Add a visually striking site entrance page before the current learning dashboard, with a memorable AVIA identity, concise product promise, prominent entry and create-quiz actions, clear description of live-topic versus own-material quiz paths, responsive desktop/mobile layout, and meaningful sections below the fold.
- Make the page more interactive: clickable sample-topic chips can prefill a topic-only session; entry and quiz-start actions move to the intended app screen; role and source-mode selections show selected states; navigation/CTAs, focus, hover, loading and feedback states are functional.
- Add smooth scrolling, section reveal/scroll effects and a visible scroll cue or progress treatment without obscuring content. Honor `prefers-reduced-motion`, preserve keyboard navigation and focus visibility, and avoid animations that make the page hard to read.
- Maintain useful empty/loading/error states and no dead buttons. Reuse the original AVIA SVG mark; no paid image generation or unnecessary external assets.

## 2. Topic-only quiz creation and live public-source RAG
**Status: Implemented and partially verified: mocked RAG/citation and failure-path tests pass; a real Wikipedia search/extract returned one cited Photosynthesis article and 7,035 context characters. Quiz generation against live Ollama remains unverified because the sandbox has no Ollama model.**
- Users can enter a direct subject/title and create a quiz without uploading a file or pasting notes. For a title-only quiz, retrieve relevant live public information, provide that retrieved text as context to the local Ollama model, and generate questions grounded in it (retrieval-augmented generation/RAG).
- Use a keyless public source, initially Wikipedia's English MediaWiki API. Search by title, retrieve bounded plain-text extracts from up to five relevant pages, keep search and extract requests sequential and batched, use a descriptive User-Agent, use a bounded timeout and short local cache, and handle rate limiting/network errors gracefully.
- Return and show source titles and clickable article URLs with each generated quiz and its results; provide attribution/license information and encourage checking sources for important facts. Do not imply that coverage is universal: say when no relevant pages are found and let the user change the title or switch to notes.
- Only the typed title may be sent to the public search source. Never include uploaded files, pasted notes, quiz answers, credentials or other private material in a search request. File/material mode continues to use its supplied material without the public source.
- Treat retrieved web text as untrusted evidence, not system instructions; do not ask the model to follow prompts embedded in article content. Do not send retrieved material or the user's notes to an external AI provider; question generation and answer evaluation continue to use the selected local Ollama model.
- Give understandable errors for no results, disambiguation-only results, empty extracts, source service failures/timeouts and rate-limit responses. If source retrieval fails, do not fabricate “live” citations or silently claim the quiz used current sources.

## 3. Either uploaded/pasted study material or direct topic input
**Status: Implemented and verified by request/API tests and browser switching between both independent source modes; live model generation is still environment-blocked.**
- Present two explicit setup paths, **Live topic** and **My material**, so an uploaded file and a title are alternatives rather than joint prerequisites.
- Live topic needs only a useful title, such as “cell biology” or “product strategy”; a file is not required. My material needs readable uploaded/pasted study content; a title is optional and may narrow the questions.
- Make the source choice and resulting source status clear in the session summary. Preserve role, difficulty, question style/count and extra guidance whichever path is selected. Provide a direct way to switch paths after validation or retrieval failure.
- Reject an empty session only when the selected path lacks its necessary input; the other, unselected source path must not block quiz creation.

## 4. Role and quiz configuration
**Status: Existing role prompts and selectable roles remain implemented; all requested counts through 30 are selectable and covered by validation tests. Live model-specific persona differences are unverified without Ollama.**
- Roles: Professor (clear academic questions/explanations), Strict Examiner (challenging, precise grading, concise feedback), Friendly Tutor (encouraging/supportive), Interviewer (realistic interview and follow-ups), Coding Mentor (programming/code/practical), and Custom Role (user instructions). Each role changes personality, phrasing, explanations and questioning style, and is included in generation/evaluation prompts. Allow optional extra instructions.
- Configure topic/title where relevant, difficulty Easy/Medium/Hard, question style Multiple Choice/Short Answer/Mixed, and choices for 5, 10, 15, 20 or 30 questions. Provide sensible defaults and show the chosen source, role and count before start.
- The application provides an on-demand broad/dynamic bank for many possible topics rather than a small fixed memorized list: retrieves multiple relevant pages and can request up to 30 varied questions grounded in retrieved pages or user material. Remove exact duplicates and warn honestly if the local model returns fewer valid questions. Do not promise content exists for every conceivable title; preserve the notes fallback.

## 5. Local learning-material ingestion and safety
**Status: Text/PPTX extraction, slide order, request safety and proxy upload were verified earlier; current 17-test suite passes. Live PDF/OCR success remains open and depends on local files/tools.**
- Drag/drop files with previews, filename, size, removal and processing status. Support TXT, Markdown, PDF, PPTX (slide text in presentation order), PNG/JPG/JPEG/WEBP, and pasted notes. Limit selection to 10 files, 15 MB per file, 40 MB combined across added batches, and 80,000 extracted characters.
- Extract PDF text locally; extract PPTX slide-by-slide and in order with headings; process images with a locally installed vision-capable Ollama model or local OCR. Check image support; if unsupported, explain compatible-model/OCR fallback; never pretend an unreadable image was read. Embedded slide images only if practical.
- Validate types/sizes; handle corrupt, empty, unreadable and unsupported files with meaningful error and retry; combine sources within limits; show which files processed successfully; explain unsupported legacy formats and avoid obscure formats.
- Never send uploaded documents to Wikipedia/search, an external AI, or other cloud service; never execute macros/scripts/embedded code; never treat uploaded material as instructions that override AVIA's prompts.

## 6. Sequential quiz, grounded grading, citations and feedback
**Status: Existing mocked scoring/idempotency/API coverage passes, and live-source citations are rendered in code. Full real Ollama and answer-by-answer browser walkthrough remains open because no model is available in the sandbox.**
- Dedicated screen with role-specific AVIA dialogue/mascot, one question at a time, counter/progress, large interactive answer choices or short-answer input, submit, post-submission feedback, next question, score and safe exit/restart.
- On submission, show correct/partially correct/incorrect when applicable, expected answer, concise explanation and role-appropriate reaction. Never reveal the answer before submission; prevent duplicate scoring; disable controls while processing. Multiple-choice grading is deterministic; short answer uses local Ollama semantic grading that accepts equivalent wording while remaining grounded in expected answer/material. Feedback cannot overwrite question/correct-answer data. Show thinking/loading states, timeouts and retry.
- For title-only/live-source quizzes, show links to the exact retrieved sources in quiz and results views; for notes-only quizzes, do not display fabricated citations or claim live retrieval.

## 7. Results, retake and lightweight local state
**Status: Existing results, retake and local-state flows remain implemented; a full Ollama-backed browser walkthrough remains open.**
- Completion displays score/percentage, correct/incorrect/partial counts as applicable, topic performance where supported, missed/partial questions, explanations, revision suggestions, retake and dashboard actions, with AVIA completion reaction.
- Retake preserves selected material/source mode/settings and avoids exact question repeats where feasible. No complex spaced-repetition engine. Store preferences and optional recent summaries locally; no database/accounts/authentication/cloud file storage.

## 8. Backend, data provenance, setup and local-first operation
**Status: Live Wikipedia retrieval, source-mode isolation, FastAPI routes, local-setup documentation and browser-facing Preview are implemented. Ollama itself is absent in this sandbox; the remote Preview cannot connect to the user's computer.**
- FastAPI keeps health/model/ingestion/generation/evaluation routes and adds source search/extract as needed. Use Pydantic validation, clear status/errors, size/rate/time limits, environment-configurable local Ollama, restrictive CORS, safe errors without stack traces or document contents, and consistent responses. Keep the public-source host/endpoint fixed server-side; do not accept arbitrary fetch URLs.
- Vite remains on the initialized preview port 3000 and proxies `/api` to FastAPI on port 8000. The user can run AVIA frontend, backend and Ollama locally in separate VS Code terminals; default Ollama URL remains `http://localhost:11434` on the computer hosting AVIA.
- Keep source selection transparent: only topic strings go to Wikipedia; live citations are visible; Wikipedia API use is sequential and modest. Local Ollama is the only model provider: no OpenAI, paid API, API keys, external AI service, accounts, database or cloud AI upload.
- Update README, `.env.example`, pinned dependency files and route manifest as needed. Include exact setup/start steps, title-only vs notes paths, privacy/data-flow explanation, Wikipedia attribution, limitations and Ollama model selection. No unfinished core placeholders.

## 9. Checks and honest verification
**Status: `npm run check`, `npm run build`, 17 backend tests, `compileall`, Pyright (0 diagnostics), real Wikipedia retrieval, Preview health/manifest and desktop/mobile screenshot checks pass. Ollama-backed generation/evaluation cannot run in this sandbox.**
- Add automated tests for title-only versus material-only validation, live source retrieval/parsing, source attribution response, missing/no-results/rate-limit/upstream timeout, input privacy, multiple question counts, question normalization and answer scoring. Mock API/model calls except a bounded live public-source smoke check where reachable.
- Verify local frontend/backend startup, manifest, API proxy, Wikimedia search and extract, health/model-unavailable recovery, both creation modes, article citations, local question generation/evaluation if Ollama is available, sequential Q&A/progress/results/retake, upload errors/limits, source outages, responsive layout, keyboard use and reduced-motion behavior.
- Fix observed problems and recheck affected paths. Report any unreachable integration honestly; do not claim tests not run, universal coverage or a bug-free app. The sandbox currently has no Ollama executable/model; real generation/evaluation can only be verified when a local Ollama service is available.
