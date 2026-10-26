import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Target,
  Trophy,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { api } from './api';
import { AviaMark } from './components/AviaMark';
import { LandingPage } from './components/LandingPage';
import { UploadZone } from './components/UploadZone';
import type {
  Difficulty,
  EvaluationResponse,
  IngestFileResult,
  ModelInfo,
  PublicQuestion,
  QuestionCount,
  QuestionStyle,
  RoleName,
  SourceCitation,
  SourceMode,
} from './types';

type Page = 'landing' | 'home' | 'setup' | 'quiz' | 'results';
type FileEntry = IngestFileResult & { id: string };
type RecentSession = { date: string; score: number; total: number; topic: string; role: string };
type Preferences = {
  role?: RoleName;
  sourceMode?: SourceMode;
  topic?: string;
  difficulty?: Difficulty;
  count?: QuestionCount;
  style?: QuestionStyle;
  extra?: string;
  customRole?: string;
};

const roles: { id: RoleName; name: string; desc: string; line: string; icon: typeof BookOpen; tone: string }[] = [
  { id: 'professor', name: 'Professor', desc: 'Clear, thoughtful, and curious.', line: 'Let’s make the big ideas stick.', icon: GraduationCap, tone: 'lilac' },
  { id: 'strict_examiner', name: 'Strict examiner', desc: 'Precise questions. Honest feedback.', line: 'Precision matters. Show your reasoning.', icon: Target, tone: 'cyan' },
  { id: 'friendly_tutor', name: 'Friendly tutor', desc: 'Patient guidance, one idea at a time.', line: 'No rush. We’ll figure this out together.', icon: Heart, tone: 'rose' },
  { id: 'interviewer', name: 'Interviewer', desc: 'Practice clear answers under pressure.', line: 'Talk me through your thinking.', icon: MessagesSquare, tone: 'amber' },
  { id: 'coding_mentor', name: 'Coding mentor', desc: 'Reason about code and concepts.', line: 'Let’s debug the idea, not just the code.', icon: Code2, tone: 'mint' },
  { id: 'custom', name: 'Your own role', desc: 'Give AVIA a voice that fits your goal.', line: 'Tell me how you want to learn.', icon: Settings2, tone: 'blue' },
];

const roleGreeting: Record<RoleName, string> = {
  professor: 'Let’s make the big ideas stick.',
  strict_examiner: 'Precision matters. Show your reasoning.',
  friendly_tutor: 'No rush. We’ll figure this out together.',
  interviewer: 'Talk me through your thinking.',
  coding_mentor: 'Let’s debug the idea, not just the code.',
  custom: 'Tell me how you want to learn.',
};

const initialPreferences: Preferences = { role: 'professor', sourceMode: 'live_topic', topic: '', difficulty: 'medium', count: 5, style: 'mixed', extra: '', customRole: '' };

function readPreferences(): Preferences {
  try {
    return { ...initialPreferences, ...JSON.parse(localStorage.getItem('avia-preferences') || '{}') } as Preferences;
  } catch {
    return initialPreferences;
  }
}

function readRecent(): RecentSession[] {
  try {
    const value = JSON.parse(localStorage.getItem('avia-recent') || '[]');
    return Array.isArray(value) ? value.slice(0, 3) as RecentSession[] : [];
  } catch {
    return [];
  }
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusPill({ connected, count }: { connected: boolean; count: number }) {
  return (
    <span className={`status-pill ${connected ? 'status-pill--online' : 'status-pill--offline'}`}>
      <span className="status-dot" />
      {connected ? `Ollama ready · ${count} model${count === 1 ? '' : 's'}` : 'Ollama offline'}
    </span>
  );
}

function App() {
  const isRemotePreview = window.location.hostname.endsWith('manus.computer');
  const [page, setPage] = useState<Page>('landing');
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const role = preferences.role || 'professor';
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [modelCount, setModelCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quiz, setQuiz] = useState<{ id: string; questions: PublicQuestion[]; warning?: string | null; sources: SourceCitation[] } | null>(null);
  const [avoidQuestions, setAvoidQuestions] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, EvaluationResponse>>({});
  const [draft, setDraft] = useState('');
  const [recent, setRecent] = useState<RecentSession[]>(readRecent);
  const [scrollProgress, setScrollProgress] = useState(0);

  const material = useMemo(() => {
    const extracted = files.filter((file) => file.status === 'success').map((file) => `[Source: ${file.name}]\n${file.content}`);
    return [notes.trim(), ...extracted].filter(Boolean).join('\n\n').slice(0, 80_000);
  }, [notes, files]);
  const sourceMode = preferences.sourceMode || 'live_topic';
  const canCreateQuiz = sourceMode === 'live_topic'
    ? (preferences.topic || '').trim().length >= 2
    : material.trim().length >= 20;
  const activeQuestion = quiz?.questions[current];
  const evaluation = activeQuestion ? answers[activeQuestion.question_id] : undefined;
  const selectedRole = roles.find((item) => item.id === role) || roles[0];
  const completedCount = quiz ? Object.keys(answers).length : 0;

  useEffect(() => {
    localStorage.setItem('avia-preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(range > 0 ? Math.min(1, window.scrollY / range) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [page]);

  useEffect(() => {
    void refreshConnection();
  }, []);

  async function refreshConnection() {
    setRefreshing(true);
    try {
      const [health, modelResult] = await Promise.all([api.health(), api.models()]);
      setModels(modelResult.models);
      setOllamaOnline(Boolean(health.ollama_connected && modelResult.connected));
      setModelCount(health.model_count);
      setSelectedModel((currentModel) => {
        if (currentModel && modelResult.models.some((item) => item.name === currentModel)) return currentModel;
        return modelResult.models[0]?.name || '';
      });
    } catch {
      setOllamaOnline(false);
      setModels([]);
      setModelCount(0);
    } finally {
      setRefreshing(false);
    }
  }

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((currentPreferences) => ({ ...currentPreferences, [key]: value }));
  }

  async function handleFiles(selectedFiles: File[]) {
    setError('');
    setNotice('');
    if (selectedFiles.length === 0) return;
    if (selectedFiles.some((file) => file.size > 15 * 1024 * 1024)) {
      setError('A file is over the 15 MB limit. Remove it and choose a smaller file.');
      return;
    }
    const selectedBytes = files.reduce((total, file) => total + file.size, 0)
      + selectedFiles.reduce((total, file) => total + file.size, 0);
    if (selectedBytes > 40 * 1024 * 1024) {
      setError('Your combined selected files exceed the 40 MB limit. Remove a file before adding more.');
      return;
    }
    if (files.length + selectedFiles.length > 10) {
      setError('You can process up to 10 files at once. Remove a file before adding more.');
      return;
    }
    setUploading(true);
    try {
      const result = await api.ingest(selectedFiles, selectedModel);
      const entries = result.files.map((item) => ({ ...item, id: crypto.randomUUID() }));
      setFiles((currentFiles) => [...currentFiles, ...entries]);
      if (result.warning) setNotice(result.warning);
      if (!entries.some((item) => item.status === 'success')) {
        setError(entries.map((item) => item.message).filter(Boolean).join(' ') || 'No selected file could be processed.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not process those files. Please retry.');
    } finally {
      setUploading(false);
    }
  }

  function removeFile(id: string) {
    setFiles((currentFiles) => currentFiles.filter((item) => item.id !== id));
    setError('');
  }

  function clearSession() {
    setQuiz(null);
    setCurrent(0);
    setAnswers({});
    setDraft('');
  }

  function prepareRetake() {
    if (!quiz) return;
    setAvoidQuestions(quiz.questions.map((question) => question.question).slice(0, 10));
    clearSession();
    setNotice('Your material and settings are ready. AVIA will try to make a fresh set of questions.');
    setError('');
    setPage('setup');
  }

  async function startQuiz() {
    setError('');
    setNotice('');
    if (sourceMode === 'live_topic' && (preferences.topic || '').trim().length < 2) {
      setError('Enter a topic title with at least two characters so AVIA can search live sources.');
      return;
    }
    if (sourceMode === 'my_material' && material.trim().length < 20) {
      setError('Add at least a few lines of notes or a readable file so AVIA has something to quiz you on.');
      return;
    }
    if (!ollamaOnline || !selectedModel) {
      setError('Start local Ollama and select one of its installed models before generating a quiz.');
      return;
    }
    setGenerating(true);
    try {
      const avoidInstruction = avoidQuestions.length
        ? `Try not to repeat these earlier questions where feasible: ${avoidQuestions.map((question) => `“${question.slice(0, 120)}”`).join(' | ')}`
        : '';
      const extraInstructions = [preferences.extra?.trim(), avoidInstruction].filter(Boolean).join('\n').slice(0, 1_000);
      const response = await api.generate({
        material: sourceMode === 'my_material' ? material : '',
        topic: preferences.topic || '',
        source_mode: sourceMode,
        role,
        custom_role: role === 'custom' ? preferences.customRole || '' : '',
        difficulty: preferences.difficulty || 'medium',
        count: preferences.count || 5,
        style: preferences.style || 'mixed',
        extra_instructions: extraInstructions,
        model: selectedModel,
      });
      if (!response.questions.length) throw new Error('The model returned no usable questions. Try again with a different local model.');
      setQuiz({ id: response.quiz_id, questions: response.questions, warning: response.warning, sources: response.sources || [] });
      setCurrent(0);
      setAnswers({});
      setDraft('');
      setAvoidQuestions([]);
      setPage('quiz');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AVIA could not make this quiz. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function submitAnswer() {
    if (!quiz || !activeQuestion || evaluation || submitting) return;
    const answer = activeQuestion.type === 'multiple_choice' ? draft : draft.trim();
    if (!answer) {
      setError(activeQuestion.type === 'multiple_choice' ? 'Choose an answer before submitting.' : 'Write a short answer before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await api.evaluate(quiz.id, activeQuestion.question_id, answer);
      setAnswers((currentAnswers) => {
        if (currentAnswers[response.question_id]) return currentAnswers;
        return { ...currentAnswers, [response.question_id]: response };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AVIA could not evaluate that answer. Retry when the local service is ready.');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!quiz || !evaluation) return;
    if (current + 1 >= quiz.questions.length) {
      const all = { ...answers };
      const next = current + 1;
      const correct = Object.values(all).filter((item) => item.status === 'correct').length;
      const partial = Object.values(all).filter((item) => item.status === 'partially_correct').length;
      const score = correct + partial * 0.5;
      const summary: RecentSession = {
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score,
        total: next,
        topic: preferences.topic?.trim() || 'Study session',
        role: selectedRole.name,
      };
      const updatedRecent = [summary, ...recent].slice(0, 3);
      setRecent(updatedRecent);
      localStorage.setItem('avia-recent', JSON.stringify(updatedRecent));
      setPage('results');
      return;
    }
    setCurrent((index) => index + 1);
    setDraft('');
    setError('');
  }

  function returnHome() {
    if (page === 'quiz' && quiz && completedCount < quiz.questions.length) {
      const confirmed = window.confirm('Leave this quiz? Your in-progress answers will be cleared.');
      if (!confirmed) return;
    }
    clearSession();
    setAvoidQuestions([]);
    setPage('home');
    setError('');
  }

  const correctCount = Object.values(answers).filter((item) => item.status === 'correct').length;
  const partialCount = Object.values(answers).filter((item) => item.status === 'partially_correct').length;
  const incorrectCount = Object.values(answers).filter((item) => item.status === 'incorrect').length;
  const scorePercent = quiz?.questions.length ? Math.round(((correctCount + partialCount * 0.5) / quiz.questions.length) * 100) : 0;
  const topicSummary = useMemo(() => {
    if (!quiz) return [];
    const map = new Map<string, { total: number; misses: number }>();
    quiz.questions.forEach((question) => {
      const topic = question.topic || 'General';
      const item = map.get(topic) || { total: 0, misses: 0 };
      item.total += 1;
      const result = answers[question.question_id];
      if (result && result.status !== 'correct') item.misses += 1;
      map.set(topic, item);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, ...value }));
  }, [quiz, answers]);

  return (
    <div className={`app-shell ${page === 'landing' ? 'app-shell--landing' : ''}`}>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />
      {page === 'landing' ? (
        <LandingPage
          isRemotePreview={isRemotePreview}
          onEnter={() => setPage('home')}
          onStartTopic={() => { setError(''); setAvoidQuestions([]); updatePreference('sourceMode', 'live_topic'); setPage('setup'); }}
          onChooseTopic={(topic) => { setError(''); setAvoidQuestions([]); updatePreference('sourceMode', 'live_topic'); updatePreference('topic', topic); setPage('setup'); }}
        />
      ) : (
        <>
      <aside className="side-rail">
        <button className="brand-lockup" onClick={returnHome} aria-label="AVIA home">
          <AviaMark size="small" />
          <span>AVIA<small>LEARN IN ORBIT</small></span>
        </button>
        <div className="rail-divider" />
        <button className={`rail-link ${page === 'home' ? 'is-current' : ''}`} onClick={returnHome}>
          <HomeIcon size={17} /> <span>Study room</span>
        </button>
        <button className={`rail-link ${page === 'setup' ? 'is-current' : ''}`} onClick={() => { setError(''); setAvoidQuestions([]); setPage('setup'); }}>
          <Sparkles size={17} /> <span>New session</span>
        </button>
        <div className="rail-bottom">
          <div className={`rail-connection ${ollamaOnline ? 'is-online' : ''}`}>
            <span className="status-dot" />
            <div><strong>{ollamaOnline ? (isRemotePreview ? 'Sandbox Ollama connected' : 'Local AI connected') : (isRemotePreview ? 'Ollama unavailable in preview' : 'Local AI offline')}</strong><small>{ollamaOnline ? (isRemotePreview ? 'Running on the preview host' : 'Your materials stay here') : (isRemotePreview ? 'Run AVIA locally to connect' : 'Start Ollama to begin')}</small></div>
          </div>
          <div className="rail-footnote"><span className="privacy-lock">◈</span> {isRemotePreview ? <>Run AVIA locally for on-device notes.</> : <>Private by design<br />Your notes stay on your device.</>}</div>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><AviaMark size="small" /><strong>AVIA</strong></div>
          <div className="breadcrumbs"><span>Learning space</span><span className="crumb-slash">/</span><strong>{page === 'home' ? 'Overview' : page === 'setup' ? 'New session' : page === 'quiz' ? 'Quiz in progress' : 'Session review'}</strong></div>
          <div className="topbar-tools">
            <StatusPill connected={ollamaOnline} count={modelCount} />
            <div className="model-picker">
              <select aria-label="Ollama model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={!models.length}>
                {models.length === 0 ? <option value="">{isRemotePreview ? 'No model detected' : 'No local model'}</option> : models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </div>
            <button className="icon-button refresh-button" onClick={() => void refreshConnection()} disabled={refreshing} title="Refresh Ollama status and models" aria-label="Refresh Ollama status and models">
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </header>

        <div className="content-frame">
          {isRemotePreview && <div className="alert alert--warning" role="note"><AlertCircle size={17} /><span>This preview runs in a remote development sandbox. Don’t upload sensitive material here. Run AVIA locally from the README to keep your notes and files on your computer.</span></div>}
          {error && <div className="alert alert--error" role="alert"><AlertCircle size={17} /><span>{error}</span><button className="alert-close" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
          {notice && <div className="alert alert--notice" role="status"><Sparkles size={16} /><span>{notice}</span><button className="alert-close" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
          {page === 'home' && (
            <section className="home-view" data-reveal>
              <div className="welcome-line"><span className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL STUDY ORBIT</span><span className="date-line">A quieter way to get curious</span></div>
              <div className="hero-panel">
                <div className="hero-copy">
                  <div className="hero-kicker"><span className="tiny-star">✦</span> THE NEXT QUESTION IS YOURS</div>
                  <h1>Learn it.<br /><em>Own it.</em></h1>
                  <p>Explore a topic from live reading, or turn your notes into a focused, one-question-at-a-time quiz. AVIA meets you where you are — and helps the ideas stay.</p>
                  <button className="primary-button hero-button" onClick={() => { setError(''); setAvoidQuestions([]); setPage('setup'); }}>
                    Create a quiz <ArrowRight size={17} />
                  </button>
                  <div className="hero-footnote"><span className="privacy-lock">◈</span> {isRemotePreview ? 'Remote preview · run locally for on-device privacy' : 'Local AI · Your material stays yours'}</div>
                </div>
                <div className="hero-art" aria-label="AVIA is ready to help you learn">
                  <div className="orbit orbit--outer" /><div className="orbit orbit--inner" />
                  <span className="orbit-node orbit-node--one" /><span className="orbit-node orbit-node--two" />
                  <div className="art-stars"><i>✦</i><i>·</i><i>✧</i><i>·</i></div>
                  <AviaMark mood="idle" size="large" />
                  <div className="art-caption"><span className="status-dot" /> AVIA IS HERE</div>
                  <div className="floating-note"><Sparkles size={14} /><span>your notes, reimagined</span></div>
                </div>
                <div className="hero-index">01 <span>/ 03</span></div>
              </div>
              <div className="home-lower">
                <div className="how-card">
                  <div className="section-heading"><span className="eyebrow">A SMALL STUDY RITUAL</span><span className="section-rule" /></div>
                  <div className="steps-row">
                    <div className="step-item"><span className="step-index">01</span><div><strong>Bring your material</strong><small>Notes, slides, PDFs, or a thought.</small></div></div>
                    <span className="step-arrow">→</span>
                    <div className="step-item"><span className="step-index">02</span><div><strong>Choose your guide</strong><small>Set the voice and challenge.</small></div></div>
                    <span className="step-arrow">→</span>
                    <div className="step-item"><span className="step-index">03</span><div><strong>Find what sticks</strong><small>One question. One clear insight.</small></div></div>
                  </div>
                </div>
                <div className="recent-card">
                  <div className="section-heading"><span className="eyebrow">RECENT ORBITS</span><Clock3 size={14} /></div>
                  {recent.length ? recent.map((item, index) => (
                    <div className="recent-item" key={`${item.date}-${index}`}><span className="recent-dot" /><span className="recent-topic">{item.topic}</span><span className="recent-score">{item.score}/{item.total}</span></div>
                  )) : <div className="empty-recent">Your first learning session will appear here.</div>}
                </div>
              </div>
              <div className="role-peek"><div><span className="eyebrow">A DIFFERENT VOICE FOR EVERY GOAL</span><p>Professor, tutor, examiner — pick the energy that helps you think.</p></div><div className="role-chips">{roles.slice(0, 4).map((item) => <span key={item.id} className={`role-chip role-chip--${item.tone}`}><item.icon size={13} />{item.name}</span>)}</div></div>
            </section>
          )}

          {page === 'setup' && (
            <section className="setup-view" data-reveal>
              <div className="page-heading-row"><button className="back-link" onClick={returnHome}><ArrowLeft size={15} /> Study room</button><span className="step-label">SESSION SETUP <span>·</span> 01 OF 02</span></div>
              <div className="setup-intro"><span className="eyebrow"><span className="eyebrow-line" /> SHAPE YOUR SESSION</span><h1>How should we <em>learn today?</em></h1><p>Pick a guide and choose one starting point: a live topic or your own study material.</p></div>
              <div className="setup-columns">
                <div className="setup-main-column">
                  <section className="setup-card role-card-section">
                    <div className="card-title-row"><div><span className="card-step">01</span><h2>Choose your guide</h2><p>AVIA’s voice and feedback adapt to your goal.</p></div><span className="tiny-orbit">✧</span></div>
                    <div className="role-grid">{roles.map((item) => (
                      <button key={item.id} className={`role-option ${role === item.id ? 'is-selected' : ''}`} onClick={() => updatePreference('role', item.id)} aria-pressed={role === item.id}>
                        <span className={`role-icon role-icon--${item.tone}`}><item.icon size={17} /></span><span className="role-option-copy"><strong>{item.name}</strong><small>{item.desc}</small></span>{role === item.id && <Check size={15} className="role-check" />}
                      </button>
                    ))}</div>
                    {role === 'custom' && <label className="field-label custom-role-field">Your guide’s instructions<textarea value={preferences.customRole || ''} maxLength={500} onChange={(event) => updatePreference('customRole', event.target.value)} placeholder="e.g. Be a calm study partner who uses simple examples." rows={2} /></label>}
                    <div className="role-voice"><AviaMark size="small" mood="gentle" /><span><small>AVIA’S VOICE</small><strong>“{roleGreeting[role]}”</strong></span></div>
                  </section>

                  <section className="setup-card material-card">
                    <div className="card-title-row"><div><span className="card-step">02</span><h2>Choose your source</h2><p>A topic title or your own study material—either one is enough.</p></div><span className="lock-badge">TWO PATHS IN</span></div>
                    <div className="source-mode-switch" role="group" aria-label="Choose quiz source">
                      <button type="button" className={sourceMode === 'live_topic' ? 'is-selected' : ''} aria-pressed={sourceMode === 'live_topic'} onClick={() => { updatePreference('sourceMode', 'live_topic'); setError(''); }}><span className="source-tab-index">01</span><strong>Live topic</strong><small>Find cited reading</small></button>
                      <button type="button" className={sourceMode === 'my_material' ? 'is-selected' : ''} aria-pressed={sourceMode === 'my_material'} onClick={() => { updatePreference('sourceMode', 'my_material'); setError(''); }}><span className="source-tab-index">02</span><strong>My material</strong><small>Use notes or files</small></button>
                    </div>
                    {sourceMode === 'live_topic' ? (
                      <div className="live-topic-panel">
                        <label className="field-label" htmlFor="live-topic-title">What would you like to explore?<input id="live-topic-title" value={preferences.topic || ''} onChange={(event) => updatePreference('topic', event.target.value)} maxLength={160} placeholder="e.g. Cell biology, the Roman Republic…" /></label>
                        <div className="live-source-note"><span className="source-note-mark">W</span><span><strong>Live reading, with sources</strong><small>AVIA searches up to five related Wikipedia articles. Only this title is sent to Wikipedia; your notes are not.</small></span></div>
                      </div>
                    ) : (
                      <>
                        <div className="material-local-note">{isRemotePreview ? 'This hosted Preview is remote—do not upload sensitive material. Run AVIA locally beside Ollama for on-device file handling.' : 'Run AVIA locally to keep files and pasted notes on your device.'}</div>
                        <UploadZone onFiles={(newFiles) => void handleFiles(newFiles)} disabled={uploading} />
                        {uploading && <div className="processing-line"><LoaderCircle size={15} className="spin" /> AVIA is reading your material locally…</div>}
                        {files.length > 0 && <div className="file-list">{files.map((file) => (
                          <div className={`file-row ${file.status === 'error' ? 'file-row--error' : ''}`} key={file.id}>
                            <span className="file-symbol"><FileText size={16} /></span><span className="file-meta"><strong>{file.name}</strong><small>{formatSize(file.size)} · {file.status === 'success' ? 'Ready to learn' : file.message || 'Could not process'}</small></span>
                            <span className={`file-state ${file.status === 'success' ? 'is-ready' : 'is-failed'}`}>{file.status === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}</span>
                            <button className="file-remove" onClick={() => removeFile(file.id)} aria-label={`Remove ${file.name}`}><X size={15} /></button>
                          </div>
                        ))}</div>}
                        <label className="field-label notes-label">Or paste your notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={80_000} placeholder="Paste a passage, lecture notes, a concept you’re revising…" rows={5} /></label>
                        <div className="character-count">{material.length.toLocaleString()} / 80,000 characters in learning context</div>
                      </>
                    )}
                  </section>

                  <section className="setup-card quiz-options-card">
                    <div className="card-title-row"><div><span className="card-step">03</span><h2>Set the challenge</h2><p>A few details help AVIA find the right level.</p></div><Zap size={17} className="setup-accent" /></div>
                    {sourceMode === 'my_material' && <label className="field-label">Optional subject focus <input value={preferences.topic || ''} onChange={(event) => updatePreference('topic', event.target.value)} maxLength={160} placeholder="e.g. Cell biology, product strategy…" /></label>}
                    <div className="field-pair">
                      <label className="field-label">Difficulty<select value={preferences.difficulty || 'medium'} onChange={(event) => updatePreference('difficulty', event.target.value as Difficulty)}><option value="easy">Easy · build confidence</option><option value="medium">Medium · steady stretch</option><option value="hard">Hard · go deeper</option></select></label>
                      <label className="field-label">Questions<select value={preferences.count || 5} onChange={(event) => updatePreference('count', Number(event.target.value) as QuestionCount)}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option><option value={30}>30 questions</option></select></label>
                    </div>
                    <label className="field-label">Question style<select value={preferences.style || 'mixed'} onChange={(event) => updatePreference('style', event.target.value as QuestionStyle)}><option value="mixed">A mix of question types</option><option value="multiple_choice">Multiple choice</option><option value="short_answer">Short answer</option></select></label>
                    <label className="field-label">Extra guidance <textarea value={preferences.extra || ''} onChange={(event) => updatePreference('extra', event.target.value)} maxLength={1000} placeholder="Anything AVIA should focus on or avoid? (optional)" rows={2} /></label>
                  </section>
                </div>

                <aside className="setup-side-column">
                  <div className="session-summary-card">
                    <div className="summary-top"><span className="eyebrow">YOUR SESSION</span><span className="summary-spark">✦</span></div>
                    <div className="summary-guide"><AviaMark mood="idle" size="large" /><div><strong>{selectedRole.name}</strong><small>{role === 'custom' && preferences.customRole ? 'Your custom learning voice' : selectedRole.desc}</small></div></div>
                    <div className="summary-line"><span>Source</span><strong>{sourceMode === 'live_topic' ? 'Live · Wikipedia' : 'Your material'}</strong></div>
                    <div className="summary-line"><span>Topic</span><strong>{preferences.topic?.trim() || (sourceMode === 'live_topic' ? 'Add a topic title' : 'From your material')}</strong></div>
                    <div className="summary-line"><span>Challenge</span><strong>{(preferences.difficulty || 'medium').charAt(0).toUpperCase() + (preferences.difficulty || 'medium').slice(1)}</strong></div>
                    <div className="summary-line"><span>Question count</span><strong>{preferences.count || 5} planned</strong></div>
                    <div className="summary-line"><span>Question style</span><strong>{preferences.style === 'multiple_choice' ? 'Multiple choice' : preferences.style === 'short_answer' ? 'Short answer' : 'Mixed'}</strong></div>
                    <div className="summary-divider" />
                    <div className="summary-privacy"><span className="privacy-lock">◈</span><span>{sourceMode === 'live_topic' ? 'Live topic via Wikipedia' : 'Your material, locally'}<br /><small>{isRemotePreview ? 'Quiz AI runs only on this host’s Ollama' : 'Quiz AI stays with your local Ollama'}</small></span></div>
                    <button className="primary-button start-button" onClick={() => void startQuiz()} disabled={generating || uploading || !canCreateQuiz}>
                      {generating ? <><LoaderCircle size={16} className="spin" /> AVIA is thinking…</> : <>Create my quiz <ArrowRight size={16} /></>}
                    </button>
                    <div className="model-note">Using <strong>{selectedModel || 'no model selected'}</strong></div>
                  </div>
                  <div className="quiet-tip"><Sparkles size={15} /><p><strong>A good study source</strong><br />Clear notes or a few focused pages help AVIA build grounded questions.</p></div>
                </aside>
              </div>
              {!ollamaOnline && <div className="offline-hint"><WifiOff size={15} /><span>{isRemotePreview ? 'This hosted Preview cannot reach Ollama on your computer. Run AVIA locally beside your Ollama service, then refresh its model list.' : 'Ollama isn’t connected yet. Start it locally, then refresh the connection above. You can still prepare your session.'}</span></div>}
            </section>
          )}

          {page === 'quiz' && quiz && activeQuestion && (
            <section className="quiz-view" data-reveal>
              <div className="page-heading-row"><button className="back-link" onClick={returnHome}><ArrowLeft size={15} /> Leave quiz</button><span className="step-label">{selectedRole.name.toUpperCase()} <span>·</span> {preferences.topic || 'STUDY SESSION'}</span></div>
              <div className="quiz-topline"><div><span className="eyebrow"><span className="eyebrow-line" /> IN THE LEARNING ORBIT</span><h1>Stay with the <em>idea.</em></h1></div><div className="live-score"><span className="live-score-label">SO FAR</span><strong>{correctCount + partialCount * 0.5}<small> / {completedCount}</small></strong><span>weighted score</span></div></div>
              <div className="quiz-progress-meta"><span>QUESTION <strong>{current + 1}</strong> <span className="of-word">OF</span> {quiz.questions.length}</span><span>{Math.round((current / quiz.questions.length) * 100)}% COMPLETE</span></div>
              <div className="progress-track"><span style={{ width: `${Math.max(3, (current / quiz.questions.length) * 100)}%` }} /></div>
              {quiz.warning && <div className="quiz-warning"><AlertCircle size={15} /> {quiz.warning}</div>}
              {quiz.sources.length > 0 && <div className="quiz-sources" aria-label="Wikipedia source articles"><div><span className="eyebrow">LIVE READING</span><small>Questions are grounded in these pages</small></div><div className="source-links">{quiz.sources.map((source) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer"><span>{source.title}</span><ExternalLink size={13} /></a>)}</div><p>Wikipedia text is available under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>; follow the article links for attribution and details.</p></div>}
              <div className="question-layout">
                <div className="question-card">
                  <div className="question-meta"><span>{activeQuestion.topic || 'General concept'}</span><span className={`difficulty-tag difficulty-tag--${activeQuestion.difficulty}`}>{activeQuestion.difficulty}</span><span>{activeQuestion.type === 'multiple_choice' ? 'CHOOSE ONE' : 'SHORT ANSWER'}</span></div>
                  <h2>{activeQuestion.question}</h2>
                  {activeQuestion.type === 'multiple_choice' ? (
                    <div className="answer-options" role="radiogroup" aria-label="Answer options">
                      {activeQuestion.options.map((option, index) => {
                        const isChosen = draft === option;
                        return <button key={`${activeQuestion.question_id}-${index}`} className={`answer-option ${isChosen ? 'is-chosen' : ''} ${evaluation && isChosen ? `answer-option--${evaluation.status}` : ''}`} onClick={() => !evaluation && setDraft(option)} disabled={Boolean(evaluation) || submitting} role="radio" aria-checked={isChosen}>
                          <span className="option-letter">{String.fromCharCode(65 + index)}</span><span className="option-text">{option}</span>{evaluation && isChosen && <span className="option-mark">{evaluation.status === 'correct' ? <Check size={17} /> : <X size={17} />}</span>}
                        </button>;
                      })}
                    </div>
                  ) : (
                    <label className="field-label quiz-answer-label"><span>Your answer</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2_000} disabled={Boolean(evaluation) || submitting} placeholder="Explain it in your own words…" rows={4} /></label>
                  )}
                  {evaluation && <div className={`feedback-panel feedback-panel--${evaluation.status}`} role="status">
                    <div className="feedback-title"><span className="feedback-icon">{evaluation.status === 'correct' ? <CheckCircle2 size={18} /> : evaluation.status === 'partially_correct' ? <Sparkles size={18} /> : <MessageCircle size={18} />}</span><strong>{evaluation.status === 'correct' ? 'That’s right' : evaluation.status === 'partially_correct' ? 'You’re partway there' : 'A useful one to revisit'}</strong></div>
                    <p>{evaluation.feedback}</p><div className="expected-answer"><small>THE CORE IDEA</small><strong>{evaluation.expected_answer}</strong></div><div className="explanation-text">{evaluation.explanation}</div>
                  </div>}
                  {error && <div className="inline-error" role="alert">{error}</div>}
                  <div className="question-actions">{!evaluation ? <button className="primary-button submit-button" onClick={() => void submitAnswer()} disabled={submitting || !draft.trim()}>{submitting ? <><LoaderCircle size={16} className="spin" /> AVIA is thinking…</> : <>Submit answer <Send size={15} /></>}</button> : <button className="primary-button submit-button" onClick={goNext}>{current + 1 === quiz.questions.length ? 'See my results' : 'Next question'} <ArrowRight size={16} /></button>}<span className="no-rush-note"><span className="tiny-star">✦</span> Take a breath. You’re learning.</span></div>
                </div>
                <aside className="quiz-aside">
                  <div className="companion-card"><div className="companion-orbit"><div className="orbit orbit--inner" /><AviaMark mood={submitting ? 'thinking' : evaluation?.status === 'correct' ? 'celebrate' : evaluation ? 'gentle' : 'idle'} size="large" /></div><span className="eyebrow">{submitting ? 'THINKING IT THROUGH' : evaluation ? 'A MOMENT WITH AVIA' : 'YOUR GUIDE'}</span><p>{submitting ? 'AVIA is considering your answer against the learning evidence…' : evaluation ? evaluation.status === 'correct' ? 'You found the thread. Let’s see where it leads next.' : roleGreeting[role] : roleGreeting[role]}</p></div>
                  <div className="quiz-context-card"><span className="eyebrow">SESSION NOTES</span><div className="context-detail"><span>Guide</span><strong>{selectedRole.name}</strong></div><div className="context-detail"><span>Challenge</span><strong>{preferences.difficulty}</strong></div><div className="context-detail"><span>Model</span><strong className="context-model">{selectedModel}</strong></div><div className="session-local"><Wifi size={13} /> {isRemotePreview ? 'Preview sandbox · not your local Ollama' : sourceMode === 'live_topic' ? 'Live source linked · quiz AI stays local' : 'Local session · answers stay private'}</div></div>
                </aside>
              </div>
            </section>
          )}

          {page === 'results' && quiz && (
            <section className="results-view" data-reveal>
              <div className="page-heading-row"><button className="back-link" onClick={returnHome}><ArrowLeft size={15} /> Study room</button><span className="step-label">SESSION COMPLETE <span>·</span> {preferences.topic || 'STUDY SESSION'}</span></div>
              <div className="results-hero"><div className="results-mascot"><div className="result-orbit" /><AviaMark mood="celebrate" size="large" /></div><div className="results-title"><span className="eyebrow"><span className="eyebrow-line" /> ORBIT COMPLETE</span><h1>Look how far<br /><em>you’ve come.</em></h1><p>{scorePercent >= 80 ? 'Strong signal. You’ve got a real handle on this material.' : scorePercent >= 50 ? 'Good momentum. A few focused reviews will make this feel solid.' : 'Every missed question is a useful map. Now you know where to look next.'}</p></div><div className="score-ring" style={{ ['--score' as string]: `${scorePercent}%` }}><div><strong>{scorePercent}<small>%</small></strong><span>YOUR SCORE</span></div></div></div>
              {quiz.sources.length > 0 && <div className="quiz-sources quiz-sources--results"><div><span className="eyebrow">READING USED</span><small>Return to the source when you want more detail</small></div><div className="source-links">{quiz.sources.map((source) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer"><span>{source.title}</span><ExternalLink size={13} /></a>)}</div><p>Wikipedia text is available under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p></div>}
              <div className="result-stat-row"><div className="result-stat result-stat--green"><span className="stat-mark"><Check size={16} /></span><strong>{correctCount}</strong><small>Correct</small></div><div className="result-stat result-stat--amber"><span className="stat-mark"><Sparkles size={16} /></span><strong>{partialCount}</strong><small>Partway</small></div><div className="result-stat result-stat--rose"><span className="stat-mark"><MessageCircle size={16} /></span><strong>{incorrectCount}</strong><small>To revisit</small></div><div className="result-stat result-stat--blue"><span className="stat-mark"><Zap size={16} /></span><strong>{quiz.questions.length}</strong><small>Questions</small></div></div>
              <div className="results-columns"><div className="review-card"><div className="section-heading"><span className="eyebrow">YOUR REVISION MAP</span><span className="section-rule" /></div>
                {topicSummary.length > 0 && <div className="topic-breakdown">{topicSummary.map((topic) => <div className="topic-row" key={topic.name}><div><strong>{topic.name}</strong><small>{topic.misses ? `${topic.misses} to review · ${topic.total} asked` : `Looking steady · ${topic.total} asked`}</small></div><div className="topic-meter"><span className={topic.misses ? 'needs-review' : ''} style={{ width: `${Math.max(12, ((topic.total - topic.misses) / topic.total) * 100)}%` }} /></div></div>)}</div>}
                <div className="missed-list"><h3>{incorrectCount + partialCount ? 'Questions to revisit' : 'What you did well'}</h3>{quiz.questions.filter((question) => answers[question.question_id]?.status !== 'correct').length ? quiz.questions.filter((question) => answers[question.question_id]?.status !== 'correct').map((question) => {
                  const result = answers[question.question_id];
                  return <article className="missed-item" key={question.question_id}><span className={`missed-marker ${result?.status === 'partially_correct' ? 'is-partial' : ''}`} /> <div><strong>{question.topic}</strong><p>{question.question}</p><small>Core idea: {result?.expected_answer}</small></div></article>;
                }) : <div className="all-correct-note"><Trophy size={18} /><span>You answered every question correctly. Revisit a different difficulty to keep the ideas sharp.</span></div>}</div>
              </div>
              <aside className="results-side"><div className="revision-card"><span className="eyebrow">AVIA’S NEXT STEP</span><div className="revision-icon"><Sparkles size={18} /></div><h3>{topicSummary.find((item) => item.misses)?.name || preferences.topic || 'Keep building on this'}</h3><p>{topicSummary.some((item) => item.misses) ? 'Give the topics above another pass, then try a harder round to strengthen recall.' : 'Your foundations look steady. Try a new source or raise the difficulty for a fresh challenge.'}</p><button className="primary-button retake-button" onClick={prepareRetake}>Retake with new questions <RotateCcw size={15} /></button></div><div className="privacy-summary"><span className="privacy-lock">◈</span><span><strong>{isRemotePreview ? 'Preview session only' : 'Still on your device'}</strong><small>{isRemotePreview ? 'Use the local run for on-device handling.' : 'No accounts. No cloud AI upload.'}</small></span></div></aside></div>
              <div className="results-footer"><button className="secondary-button" onClick={() => { clearSession(); setPage('home'); }}>Back to study room <HomeIcon size={15} /></button><span>Keep your curiosity in motion <span className="tiny-star">✦</span></span></div>
            </section>
          )}
        </div>
        <footer className="app-footer"><span>AVIA <span>·</span> A local learning companion</span><span>{isRemotePreview ? 'RUN LOCALLY · YOUR MATERIAL · YOUR PACE' : 'YOUR MATERIAL. YOUR DEVICE. YOUR PACE.'}</span></footer>
      </main>
        </>
      )}
    </div>
  );
}

export default App;
