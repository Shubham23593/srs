'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_TITLES = [
  'AI Requirement Interview',
  'Requirement Extraction',
  'Quality & Ambiguity Audit',
  'Requirement Validation',
  'SRS Generation — v1.0',
  'Change Control — v1.0 → v1.1',
];

const INTERVIEW_SCRIPT = [
  { from: 'ai', label: 'IntelliSDLC AI · Stage 2', text: 'Welcome! Tell me about the system you want to build.' },
  { from: 'user', label: 'You · USER-MSG-014', text: 'A College Event Management System for students and administrators.' },
  { from: 'ai', label: 'IntelliSDLC AI', text: 'Got it. What should students be able to do?' },
  { from: 'user', label: 'You · USER-MSG-016', text: 'Students will view events and register for them.' },
  { from: 'ai', label: 'IntelliSDLC AI', text: 'And the administrators?' },
  { from: 'user', label: 'You · USER-MSG-018', text: 'Admins will create events. Only authenticated users can access protected functions.' },
  { from: 'ai', label: 'IntelliSDLC AI', text: 'Understood. Any rules for event registration itself?' },
  { from: 'user', label: 'You · USER-MSG-021', text: 'Event registration should require administrator approval.' },
  { from: 'ai', label: 'IntelliSDLC AI', text: 'Excellent. That\u2019s 3 functional + 1 non-functional requirement extracted. I\u2019ll now run the quality audit.' },
];

const EXTRACT_ITEMS = [
  { id: 'FR-001', cls: 'fr', text: 'Students shall view events.', conf: 98, delay: 400 },
  { id: 'FR-002', cls: 'fr', text: 'Students shall register for events.', conf: 97, delay: 800 },
  { id: 'FR-003', cls: 'fr', text: 'Administrators shall create events.', conf: 96, delay: 1200 },
  { id: 'NFR-001', cls: 'nfr', text: 'Only authenticated users shall access protected functions.', conf: 95, delay: 1600 },
  { id: 'FR-004', cls: 'fr', text: 'Students shall sign up for events.', conf: 91, delay: 2000 },
  { id: 'CON-003', cls: 'nfr', text: 'Event registration shall require administrator approval.', conf: 93, delay: 2400 },
];

const TAB_LABELS = [
  '01 · Interview',
  '02 · Extract',
  '03 · Audit',
  '04 · Validate',
  '05 · SRS',
  '06 · Change',
];

export default function LiveDemo() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [extractCount, setExtractCount] = useState(0);
  const [sim, setSim] = useState(0);
  const timersRef = useRef([]);
  const playingRef = useRef(playing);
  const sceneRef = useRef(scene);
  const feedRef = useRef(null);

  playingRef.current = playing;
  sceneRef.current = scene;

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  /* ---------------- scene director ---------------- */
  const enterScene = (i) => {
    clearTimers();
    setScene(i);
    setMessages([]);
    setExtractCount(0);
    setSim(0);

    if (i === 0) {
      INTERVIEW_SCRIPT.forEach((msg, idx) => {
        later(() => setMessages((prev) => [...prev, msg]), 350 + idx * 600);
      });
    } else if (i === 1) {
      later(() => setExtractCount(1), 300);
      later(() => setExtractCount(2), 900);
      later(() => setExtractCount(3), 1500);
      later(() => setExtractCount(4), 2100);
      later(() => setExtractCount(5), 2700);
      later(() => setExtractCount(6), 3300);
    } else if (i === 2) {
      let v = 0;
      const step = () => {
        v += 2;
        setSim(Math.min(v, 92));
        if (v < 92) later(step, 38);
      };
      later(step, 400);
    }
  };

  useEffect(() => {
    enterScene(0);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- autoplay ---------------- */
  useEffect(() => {
    if (!playing) return undefined;
    const iv = setInterval(() => {
      const next = (sceneRef.current + 1) % 6;
      setScene(next);
      enterScene(next);
    }, 5200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messages]);

  const goTo = (i) => {
    setPlaying(false);
    enterScene(i);
  };
  const prevScene = () => goTo((scene - 1 + 6) % 6);
  const nextScene = () => goTo((scene + 1) % 6);
  const togglePlay = () => setPlaying((p) => !p);

  const progress = ((scene + 1) / 6) * 100;

  return (
    <div className="demo-window" data-reveal>
      <div className="demo-topbar">
        <span className="tb-dots"><i /><i /><i /></span>
        <span className="tb-title">IntelliSDLC AI — demo project: College Event Management System</span>
        <span className="tb-live"><i /> LIVE</span>
      </div>

      <div className="demo-tabs-row">
        <div className="demo-tabs" role="tablist">
          {TAB_LABELS.map((label, i) => (
            <button
              key={label}
              className={`dt${scene === i ? ' active' : ''}`}
              data-scene={i}
              role="tab"
              aria-selected={scene === i}
              onClick={() => goTo(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="demo-controls">
          <button className="demo-arrow" onClick={prevScene} aria-label="Previous scene">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className={`demo-play${playing ? ' playing' : ''}`} onClick={togglePlay} aria-label="Autoplay scenes">
            <svg className="ico-play" viewBox="0 0 24 24" width="16" height="16"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
            <svg className="ico-pause" viewBox="0 0 24 24" width="16" height="16"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor" /></svg>
          </button>
          <button className="demo-arrow" onClick={nextScene} aria-label="Next scene">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <div className="demo-scenes">
        {/* ────────── SCENE 0 : INTERVIEW ────────── */}
        <div className={`scene${scene === 0 ? ' active' : ''}`} data-title={SCENE_TITLES[0]}>
          <div className="scene-layout chat-layout">
            <div className="chat-pane">
              <div className="chat-head">
                <span className="lang-tags"><i className="on">EN</i><i>हिंदी</i><i>Hinglish</i></span>
                <span className="chat-stage">Stage 2 / 9 · Elicitation</span>
              </div>
              <div className="chat-feed" ref={feedRef} aria-live="polite">
                {messages.map((m, idx) => (
                  <div key={idx} className={`chat-msg from-${m.from}`}>
                    <span className="cm-label">{m.label}</span>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="chat-tools">
                <span className="tool-chip">Answer</span>
                <span className="tool-chip">Edit</span>
                <span className="tool-chip">Skip</span>
                <span className="tool-chip">Back</span>
                <span className="tool-chip">Add Requirement</span>
                <span className="tool-chip accent">Finish Interview</span>
              </div>
            </div>
            <aside className="scene-aside">
              <h4>What&rsquo;s happening</h4>
              <p>Stage-gated interview with Context Guard. The AI asks focused questions — purpose, users, features, rules, constraints — never repeating, never inventing.</p>
              <ul>
                <li>Multilingual: English, Hindi, Hinglish</li>
                <li>Every answer traceable to a message ID</li>
                <li>Skip or finish anytime — you&rsquo;re in control</li>
              </ul>
            </aside>
          </div>
        </div>

        {/* ────────── SCENE 1 : EXTRACTION ────────── */}
        <div className={`scene${scene === 1 ? ' active' : ''}`} data-title={SCENE_TITLES[1]}>
          <div className="scene-layout">
            <div className="extract-left">
              <div className="extract-src">
                <span className="es-tag">USER-MSG-018</span>
                <p>&ldquo;Students will view events and register for them. Only admins create events. Only logged-in users can access protected functions.&rdquo;</p>
                <span className="es-tag">USER-MSG-021</span>
                <p>&ldquo;Event registration should require administrator approval.&rdquo;</p>
              </div>
              <div className="extract-flow"><span>text</span><i>→</i><span>atomic requirements</span><i>→</i><span>stable IDs</span></div>
            </div>
            <div className="extract-right">
              {EXTRACT_ITEMS.slice(0, extractCount).map((item) => (
                <div key={item.id} className="extract-item">
                  <span className={`ei-id ${item.cls}`}>{item.id}</span>
                  <span className="ei-text">{item.text}</span>
                  <span className="ei-conf"><i style={{ '--c': `${item.conf}%` }} />{item.conf}%</span>
                </div>
              ))}
              {extractCount === 0 && <p className="audit-note">Extracting atomic requirements from interview messages…</p>}
            </div>
          </div>
        </div>

        {/* ────────── SCENE 2 : AUDIT ────────── */}
        <div className={`scene${scene === 2 ? ' active' : ''}`} data-title={SCENE_TITLES[2]}>
          <div className="scene-layout audit-layout">
            <div className="audit-card dup-card">
              <span className="audit-label warn">DUPLICATE DETECTED</span>
              <div className="dup-rows">
                <div className="dup-row"><span className="rid">FR-002</span> Students shall register for events.</div>
                <div className="dup-row"><span className="rid">FR-004</span> Students shall sign up for events.</div>
              </div>
              <div className="sim-wrap">
                <div className="sim-bar"><i style={{ width: `${sim}%` }} /></div>
                <span className="sim-val"><b>{sim}</b>% similarity</span>
              </div>
              <p className="audit-note">Embeddings + cosine similarity. You decide — nothing is auto-deleted.</p>
              <div className="audit-actions"><span>Merge</span><span>Keep Both</span><span>Edit</span><span>Ignore</span></div>
            </div>
            <div className="audit-card conflict-card">
              <span className="audit-label danger">POTENTIAL CONFLICT</span>
              <div className="dup-rows">
                <div className="dup-row"><span className="rid">REQ-001</span> The system allows unlimited login attempts.</div>
                <div className="dup-row"><span className="rid">REQ-002</span> The system locks the account after five failed attempts.</div>
              </div>
              <p className="audit-note">Both requirements shown. You resolve — the AI never deletes.</p>
              <div className="audit-actions"><span>Resolve</span><span>Keep Both</span></div>
            </div>
          </div>
        </div>

        {/* ────────── SCENE 3 : VALIDATION ────────── */}
        <div className={`scene${scene === 3 ? ' active' : ''}`} data-title={SCENE_TITLES[3]}>
          <div className="scene-layout valid-layout">
            <div className="valid-card">
              <span className="audit-label warn">AMBIGUOUS</span>
              <div className="valid-req">&ldquo;The system should be <mark>fast</mark>.&rdquo;</div>
              <div className="valid-explain">
                <b>Issue</b> &mdash; &ldquo;Fast&rdquo; is not measurable.
                <b>Suggestion</b> &mdash; Specify the expected maximum response time.
              </div>
              <div className="valid-status"><span className="badge bad">NEEDS_REVIEW</span><span className="badge-dim">FR-009 · PERFORMANCE</span></div>
            </div>
            <div className="valid-scores">
              <div className="vs-row"><span>Clarity</span><div className="vs-bar"><i style={{ '--v': '42%' }} /></div><b>42</b></div>
              <div className="vs-row"><span>Consistency</span><div className="vs-bar"><i style={{ '--v': '96%' }} /></div><b>96</b></div>
              <div className="vs-row"><span>Testability</span><div className="vs-bar"><i style={{ '--v': '38%' }} /></div><b>38</b></div>
              <div className="vs-row"><span>Singularity</span><div className="vs-bar"><i style={{ '--v': '88%' }} /></div><b>88</b></div>
              <div className="iso-badge">
                <span className="iso-num">4.6<span>/5</span></span>
                <span className="iso-txt">ISO 29148 completeness · consistency · singularity · testability</span>
              </div>
            </div>
          </div>
        </div>

        {/* ────────── SCENE 4 : SRS ────────── */}
        <div className={`scene${scene === 4 ? ' active' : ''}`} data-title={SCENE_TITLES[4]}>
          <div className="scene-layout srs-layout">
            <div className="srs-doc">
              <div className="srs-head">
                <h4>Software Requirements Specification</h4>
                <span className="srs-sub">for <b>College Event Management System</b> · Version 1.0 · 28 Aug 2026</span>
              </div>
              <div className="srs-toc">
                <div className="toc-row"><b>1.</b> Introduction</div>
                <div className="toc-sub"><span>1.1</span> Purpose · <span>1.2</span> Document Conventions · <span>1.3</span> Intended Audience · <span>1.4</span> Project Scope · <span>1.5</span> References</div>
                <div className="toc-row"><b>2.</b> Overall Description</div>
                <div className="toc-sub"><span>2.1</span> Product Perspective · <span>2.2</span> Product Features · <span>2.3</span> User Classes · <span>2.4</span> Operating Environment · <span>2.7</span> Assumptions</div>
                <div className="toc-row"><b>3.</b> System Features</div>
                <div className="toc-sub"><span>3.1</span> Event Registration — <span>3.1.1</span> Description · <span>3.1.2</span> Stimulus/Response · <span>3.1.3</span> Functional Requirements</div>
                <div className="toc-row"><b>4.</b> External Interface Requirements</div>
                <div className="toc-sub"><span>4.1</span> User Interfaces · <span>4.3</span> Software Interfaces · <span>4.4</span> Communications</div>
                <div className="toc-row"><b>5.</b> Other Nonfunctional Requirements</div>
                <div className="toc-row"><b>6.</b> Other Requirements</div>
                <div className="toc-row app-row"><b>A.</b> Glossary · <b>B.</b> Analysis Models · <b>C.</b> Issues List</div>
              </div>
              <div className="srs-foot">
                <span className="doc-btn">Generate</span><span className="doc-btn">Save</span><span className="doc-btn">Validate</span><span className="doc-btn accent">Approve</span><span className="doc-btn">PDF</span><span className="doc-btn">DOCX</span>
              </div>
            </div>
            <aside className="scene-aside">
              <h4>Traceability panel</h4>
              <div className="trace-stack">
                <span>USER-MSG-042</span><i>→</i><span>FR-007</span><i>→</i><span>3.1 Event Registration</span><i>→</i><span>3.1.3 Functional Reqs</span><i>→</i><span>SRS v1.0</span>
              </div>
              <h4>AI suggestions</h4>
              <ul>
                <li>§2.3 — add &ldquo;Faculty&rdquo; to user classes?</li>
                <li>NFR-007 suggests performance target: <b>TBD — needs clarification</b></li>
              </ul>
              <h4>Template fidelity</h4>
              <ul>
                <li>Exact uploaded template · numbering preserved</li>
                <li>No invented sections, no invented facts</li>
              </ul>
            </aside>
          </div>
        </div>

        {/* ────────── SCENE 5 : CHANGE CONTROL ────────── */}
        <div className={`scene${scene === 5 ? ' active' : ''}`} data-title={SCENE_TITLES[5]}>
          <div className="scene-layout change-layout">
            <div className="diff-card">
              <div className="diff-head">
                <span className="ver-chip old">v1.0</span>
                <span className="diff-arrow">→</span>
                <span className="ver-chip new">v1.1</span>
                <span className="diff-title">FR-002 · semantic diff</span>
              </div>
              <div className="diff-body">
                <div className="diff-line del"><span className="df-marker">−</span> Students shall register for events.</div>
                <div className="diff-line add"><span className="df-marker">+</span> Event registration requires administrator approval.</div>
                <div className="diff-line ctx"><span className="df-marker">&nbsp;</span> Affected: §3.1 Event Registration · §3.1.3 Functional Requirements · §4.1 User Interfaces</div>
              </div>
              <div className="diff-actions"><span className="doc-btn accent">Approve update</span><span className="doc-btn">Edit</span><span className="doc-btn">Reject</span></div>
              <p className="diff-note">RAG retrieved context · change detected automatically · only affected sections update · v1.0 preserved forever.</p>
            </div>
            <div className="rev-card">
              <h4>Revision History</h4>
              <div className="rev-row"><b>v1.1</b><span>28 Aug 2026</span><em>Added administrator approval to FR-002</em></div>
              <div className="rev-row"><b>v1.0</b><span>21 Aug 2026</span><em>Initial approved release</em></div>
              <div className="rev-row rev-ghost"><b>v1.1</b><span>—</span><em>waiting for approval…</em></div>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-progress"><div id="demo-progress-fill" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}
