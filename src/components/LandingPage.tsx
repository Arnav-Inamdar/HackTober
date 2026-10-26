import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { AviaMark } from './AviaMark';

interface LandingPageProps {
  isRemotePreview: boolean;
  onEnter: () => void;
  onStartTopic: () => void;
  onChooseTopic: (topic: string) => void;
}

const exampleTopics = ['Photosynthesis', 'Ancient Rome', 'Machine learning', 'Brand strategy'];

export function LandingPage({ isRemotePreview, onEnter, onStartTopic, onChooseTopic }: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button className="landing-brand" onClick={onEnter} aria-label="Open AVIA study room">
          <AviaMark size="small" />
          <span>AVIA<small>LEARN IN ORBIT</small></span>
        </button>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#choose-a-source">Choose a source</a>
        </nav>
        <button className="landing-nav-cta" onClick={onEnter}>Enter AVIA <ArrowRight size={15} /></button>
      </header>

      {isRemotePreview && <div className="landing-preview-banner" role="note"><strong>Hosted Preview</strong><span>This page runs remotely and cannot connect to your computer’s Ollama. Run AVIA locally beside Ollama for quizzes and private material.</span></div>}

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy" data-reveal>
            <div className="landing-overline"><span className="landing-overline-mark" /> A BETTER QUESTION CHANGES EVERYTHING</div>
            <h1>Bring a subject.<br /><em>Leave more curious.</em></h1>
            <p>{isRemotePreview ? 'Start with a title to explore cited reading. When AVIA runs on your computer beside Ollama, it can turn a title or your own notes into a one-question-at-a-time quiz.' : 'Start with a title and AVIA finds live reading to learn from. Or bring your own notes. Your local Ollama turns the ideas into a one-question-at-a-time quiz.'}</p>
            <div className="landing-actions">
              <button className="landing-button landing-button--primary" onClick={onStartTopic}>Explore a topic <ArrowRight size={17} /></button>
              <a className="landing-text-link" href="#how-it-works">See how it works <ArrowDown size={15} /></a>
            </div>
            <div className="landing-proof"><span><Sparkles size={15} /> Up to 30 questions</span><span><ExternalLink size={14} /> Sources you can check</span></div>
          </div>

          <div className="landing-hero-art" data-reveal aria-label="AVIA, a learning guide for ideas and questions">
            <div className="landing-art-wash" />
            <div className="landing-orbit landing-orbit--one" />
            <div className="landing-orbit landing-orbit--two" />
            <span className="landing-orbit-node landing-orbit-node--one" />
            <span className="landing-orbit-node landing-orbit-node--two" />
            <div className="landing-mark"><AviaMark size="large" mood="idle" /></div>
            <div className="landing-note landing-note--top"><span className="landing-note-index">01</span><div><small>LIVE READING</small><strong>Photosynthesis</strong></div><ExternalLink size={14} /></div>
            <div className="landing-note landing-note--bottom"><span className="landing-note-icon"><Target size={16} /></span><div><small>YOUR NEXT QUESTION</small><strong>How does light become stored energy?</strong></div></div>
            <span className="landing-art-caption">A QUESTION OPENS THE IDEA</span>
          </div>
          <a className="landing-scroll-hint" href="#topic-starters" aria-label="Scroll to sample topics"><span>SCROLL TO EXPLORE</span><ArrowDown size={14} /></a>
        </section>

        <section className="landing-topic-section" id="topic-starters" data-reveal>
          <div className="landing-section-heading">
            <div><span className="landing-section-index">01 / START ANYWHERE</span><h2>One title is <em>enough.</em></h2></div>
            <p>Try a starting point. AVIA searches live Wikipedia articles and returns a quiz with source links. You can change the topic before it begins.</p>
          </div>
          <div className="landing-topic-list">
            {exampleTopics.map((topic, index) => (
              <button key={topic} className="landing-topic-chip" onClick={() => onChooseTopic(topic)}>
                <span className="landing-topic-number">0{index + 1}</span><span>{topic}</span><ArrowRight size={16} />
              </button>
            ))}
          </div>
          <div className="landing-source-caption"><span className="landing-source-dot" /> LIVE LOOKUP <span>·</span> UP TO FIVE MATCHING ARTICLES <span>·</span> LINKED CITATIONS</div>
        </section>

        <section className="landing-method" id="how-it-works">
          <div className="landing-section-heading" data-reveal>
            <div><span className="landing-section-index">02 / THE LEARNING LOOP</span><h2>Read. Reason.<br /><em>Remember.</em></h2></div>
            <p>AVIA uses retrieved pages or your chosen material as evidence. Your selected local model writes the questions and helps assess short answers.</p>
          </div>
          <div className="landing-step-list">
            <article className="landing-step" data-reveal><span className="landing-step-number">01</span><span className="landing-step-icon"><BookOpen size={20} /></span><div><h3>Choose your source</h3><p>Enter a topic for a live, cited lookup—or use files and notes you already trust.</p></div><ArrowRight className="landing-step-arrow" size={18} /></article>
            <article className="landing-step" data-reveal><span className="landing-step-number">02</span><span className="landing-step-icon"><GraduationCap size={20} /></span><div><h3>Pick a learning voice</h3><p>Switch between six roles, three challenge levels and five question-set sizes.</p></div><ArrowRight className="landing-step-arrow" size={18} /></article>
            <article className="landing-step" data-reveal><span className="landing-step-number">03</span><span className="landing-step-icon"><Sparkles size={20} /></span><div><h3>Follow one idea at a time</h3><p>Answer, get a useful explanation, then finish with a score and revision map.</p></div><ArrowRight className="landing-step-arrow" size={18} /></article>
          </div>
        </section>

        <section className="landing-source-section" id="choose-a-source" data-reveal>
          <div className="landing-source-copy"><span className="landing-section-index">03 / TWO WAYS IN</span><h2>Use the world.<br /><em>Or your own words.</em></h2><p>For live topic quizzes, AVIA sends only your title to Wikipedia's public API and shows the pages it used. Your uploaded files and pasted notes aren't sent to that search service. In material mode, AVIA uses only what you provide.</p><a href="https://www.mediawiki.org/wiki/API:Etiquette" target="_blank" rel="noreferrer">About Wikipedia API use <ExternalLink size={13} /></a></div>
          <div className="landing-source-cards">
            <article className="landing-source-card"><span className="landing-source-card-icon"><ExternalLink size={17} /></span><small>LIVE TOPIC</small><h3>A title, then cited reading</h3><p>Coverage depends on available Wikipedia pages; important facts should be checked at their source.</p></article>
            <article className="landing-source-card"><span className="landing-source-card-icon"><ShieldCheck size={17} /></span><small>YOUR MATERIAL</small><h3>Notes stay on your setup</h3><p>Files go only to the AVIA backend you're running. Ollama remains the local model for quiz generation.</p></article>
          </div>
        </section>

        <section className="landing-final" data-reveal>
          <div className="landing-final-mark"><AviaMark size="small" /><span>YOUR CURIOSITY, IN MOTION</span></div>
          <h2>Ready when <em>you are.</em></h2>
          <div className="landing-final-actions"><button className="landing-button landing-button--primary" onClick={onStartTopic}>Create a quiz <ArrowRight size={16} /></button><button className="landing-button landing-button--quiet" onClick={onEnter}>Open the study room</button></div>
        </section>
      </main>
      <footer className="landing-footer"><span>AVIA <span className="landing-footer-separator">/</span> A local learning companion</span><span>LIVE SOURCE CITATIONS · LOCAL AI · YOUR PACE</span></footer>
    </div>
  );
}
