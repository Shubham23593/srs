'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiFileText,
  FiMessageSquare,
  FiPause,
  FiPlay,
  FiSearch,
  FiShield,
  FiAlertTriangle,
  FiGitBranch,
} from 'react-icons/fi';
import { FiLayers } from "react-icons/fi";

const SCENE_TITLES = [
  'AI Requirement Interview',
  'Requirement Extraction',
  'Quality & Ambiguity Audit',
  'Requirement Validation',
  'SRS Generation',
  'Change Control',
];

const INTERVIEW_SCRIPT = [
  {
    from: 'ai',
    label: 'Aether AI',
    text: 'Tell me about the system you want to build.',
  },
  {
    from: 'user',
    label: 'You',
    text: 'A College Event Management System for students and administrators.',
  },
  {
    from: 'ai',
    label: 'Aether AI',
    text: 'What should students be able to do?',
  },
  {
    from: 'user',
    label: 'You',
    text: 'Students will view events and register for them.',
  },
  {
    from: 'ai',
    label: 'Aether AI',
    text: 'What about administrators?',
  },
  {
    from: 'user',
    label: 'You',
    text: 'Admins will create events and manage registrations.',
  },
];

const EXTRACT_ITEMS = [
  {
    id: 'FR-001',
    type: 'Functional',
    text: 'Students shall view available events.',
    confidence: 98,
  },
  {
    id: 'FR-002',
    type: 'Functional',
    text: 'Students shall register for events.',
    confidence: 97,
  },
  {
    id: 'FR-003',
    type: 'Functional',
    text: 'Administrators shall create events.',
    confidence: 96,
  },
  {
    id: 'NFR-001',
    type: 'Non-functional',
    text: 'Protected functions shall require authentication.',
    confidence: 95,
  },
];

const TABS = [
  'Interview',
  'Extraction',
  'Quality Review',
  'Validation',
  'SRS',
  'Change Control',
];

export default function LiveDemo() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [extractCount, setExtractCount] = useState(0);
  const [quality, setQuality] = useState(0);

  const timersRef = useRef([]);
  const sceneRef = useRef(scene);
  const playingRef = useRef(playing);
  const feedRef = useRef(null);

  sceneRef.current = scene;
  playingRef.current = playing;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const enterScene = (index) => {
    clearTimers();

    setScene(index);
    setMessages([]);
    setExtractCount(0);
    setQuality(0);

    if (index === 0) {
      INTERVIEW_SCRIPT.forEach((message, i) => {
        later(
          () => {
            setMessages((prev) => [...prev, message]);
          },
          250 + i * 500
        );
      });
    }

    if (index === 1) {
      EXTRACT_ITEMS.forEach((_, i) => {
        later(() => {
          setExtractCount(i + 1);
        }, 350 + i * 600);
      });
    }

    if (index === 2) {
      let value = 0;

      const increase = () => {
        value += 2;

        setQuality(Math.min(value, 92));

        if (value < 92) {
          later(increase, 35);
        }
      };

      later(increase, 300);
    }
  };

  useEffect(() => {
    enterScene(0);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return undefined;

    const interval = setInterval(() => {
      const next =
        (sceneRef.current + 1) % TABS.length;

      enterScene(next);
    }, 5200);

    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop =
        feedRef.current.scrollHeight;
    }
  }, [messages]);

  const goTo = (index) => {
    setPlaying(false);
    enterScene(index);
  };

  const previous = () => {
    goTo(
      (scene - 1 + TABS.length) %
        TABS.length
    );
  };

  const next = () => {
    goTo(
      (scene + 1) %
        TABS.length
    );
  };

  return (
    <>
      <div className="demo">

        {/* ================= TOP ================= */}

        <div className="demo-header">

          <div>
            <div className="demo-title">
              College Event Management System
            </div>

            <div className="demo-subtitle">
              Aether project walkthrough
            </div>
          </div>

          <div className="demo-status">
            <span />
            Simulated workflow
          </div>

        </div>

        {/* ================= TABS ================= */}

        <div className="demo-tabs">

          <div className="demo-tab-list">

            {TABS.map((label, index) => (
              <button
                key={label}
                className={
                  scene === index
                    ? 'demo-tab active'
                    : 'demo-tab'
                }
                onClick={() => goTo(index)}
              >
                <span>
                  {String(index + 1).padStart(2, '0')}
                </span>

                {label}
              </button>
            ))}

          </div>

          <div className="demo-controls">

            <button
              onClick={previous}
              aria-label="Previous"
            >
              <FiArrowLeft size={15} />
            </button>

            <button
              onClick={() =>
                setPlaying((value) => !value)
              }
              aria-label="Play"
              className="play-button"
            >
              {playing ? (
                <FiPause size={14} />
              ) : (
                <FiPlay size={14} />
              )}
            </button>

            <button
              onClick={next}
              aria-label="Next"
            >
              <FiArrowRight size={15} />
            </button>

          </div>

        </div>

        {/* ================= CONTENT ================= */}

        <div className="demo-content">

          {/* INTERVIEW */}

          {scene === 0 && (
            <div className="demo-layout">

              <div className="demo-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Requirement Interview
                    </strong>

                    <span>
                      Stage 2 · Elicitation
                    </span>
                  </div>

                  <FiMessageSquare
                    size={17}
                  />
                </div>

                <div
                  className="chat-feed"
                  ref={feedRef}
                >
                  {messages.map(
                    (message, index) => (
                      <div
                        key={index}
                        className={
                          message.from === 'ai'
                            ? 'chat-message ai'
                            : 'chat-message user'
                        }
                        style={{
                          background: message.from === 'ai' ? '#f1f5f9' : '#a7e3fa',
                          color: '#0f172a',
                        }}
                      >
                        <div
                          className="message-label"
                          style={{
                            color: message.from === 'ai' ? '#0284c7' : '#0369a1',
                            fontWeight: 700,
                          }}
                        >
                          {message.label}
                        </div>

                        <div
                          className="message-text"
                          style={{ color: '#0f172a', fontWeight: 500 }}
                        >
                          {message.text}
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="chat-footer">
                  <span>English</span>
                  <span>Hindi</span>
                  <span>Hinglish</span>

                  <button>
                    Continue
                    <FiArrowRight size={13} />
                  </button>
                </div>

              </div>

              <div className="demo-side-panel">

                <div className="side-icon">
                  <FiShield />
                </div>

                <h4>
                  Structured elicitation
                </h4>

                <p>
                  The system gathers project context
                  through focused questions instead of
                  generating requirements without context.
                </p>

                <div className="side-check">
                  <FiCheck />
                  User-controlled responses
                </div>

                <div className="side-check">
                  <FiCheck />
                  Message-level traceability
                </div>

                <div className="side-check">
                  <FiCheck />
                  Stage-based workflow
                </div>

              </div>

            </div>
          )}

          {/* EXTRACTION */}

          {scene === 1 && (
            <div className="demo-layout">

              <div className="demo-panel source-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Interview source
                    </strong>

                    <span>
                      Original project information
                    </span>
                  </div>

                  <FiMessageSquare />
                </div>

                <div className="source-message">
                  <small>
                    USER-MSG-018
                  </small>

                  <p>
                    Students will view events
                    and register for them.
                    Only administrators create
                    events.
                  </p>
                </div>

                <div className="source-message">
                  <small>
                    USER-MSG-021
                  </small>

                  <p>
                    Event registration should
                    require administrator approval.
                  </p>
                </div>

              </div>

              <div className="demo-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Extracted requirements
                    </strong>

                    <span>
                      Atomic requirement candidates
                    </span>
                  </div>

                  <FiLayers />
                </div>

                <div className="requirement-list">

                  {EXTRACT_ITEMS
                    .slice(0, extractCount)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="requirement-row"
                      >

                        <div>
                          <div className="req-top">
                            <span>
                              {item.id}
                            </span>

                            <em>
                              {item.type}
                            </em>
                          </div>

                          <p>
                            {item.text}
                          </p>
                        </div>

                        <div className="confidence">
                          <strong>
                            {item.confidence}%
                          </strong>

                          <span>
                            confidence
                          </span>
                        </div>

                      </div>
                    ))}

                </div>

              </div>

            </div>
          )}

          {/* QUALITY */}

          {scene === 2 && (
            <div className="demo-layout">

              <div className="demo-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Requirement Quality Review
                    </strong>

                    <span>
                      Automated analysis
                    </span>
                  </div>

                  <FiSearch />
                </div>

                <div className="quality-card">

                  <div className="quality-heading">
                    <span className="warning">
                      <FiAlertTriangle />
                      Potential duplicate
                    </span>

                    <strong>
                      {quality}%
                    </strong>
                  </div>

                  <div className="quality-bar">
                    <span
                      style={{
                        width: `${quality}%`,
                      }}
                    />
                  </div>

                  <div className="quality-compare">

                    <div>
                      <small>
                        FR-002
                      </small>

                      <p>
                        Students shall register
                        for events.
                      </p>
                    </div>

                    <div>
                      <small>
                        FR-004
                      </small>

                      <p>
                        Students shall sign up
                        for events.
                      </p>
                    </div>

                  </div>

                  <div className="review-actions">
                    <button>
                      Merge
                    </button>

                    <button>
                      Keep both
                    </button>

                    <button>
                      Edit
                    </button>
                  </div>

                </div>

              </div>

              <div className="demo-side-panel">

                <div className="quality-score">
                  <strong>
                    92
                  </strong>

                  <span>
                    quality score
                  </span>
                </div>

                <div className="metric">
                  <span>
                    Clarity
                  </span>

                  <b>
                    96
                  </b>
                </div>

                <div className="metric">
                  <span>
                    Consistency
                  </span>

                  <b>
                    94
                  </b>
                </div>

                <div className="metric">
                  <span>
                    Testability
                  </span>

                  <b>
                    88
                  </b>
                </div>

              </div>

            </div>
          )}

          {/* VALIDATION */}

          {scene === 3 && (
            <div className="demo-layout">

              <div className="demo-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Requirement validation
                    </strong>

                    <span>
                      Quality characteristics
                    </span>
                  </div>

                  <FiShield />
                </div>

                <div className="validation-box">

                  <div className="validation-label">
                    NEEDS REVIEW
                  </div>

                  <h3>
                    "The system should be fast."
                  </h3>

                  <p>
                    The term
                    <strong> "fast" </strong>
                    is not measurable enough
                    to become a testable requirement.
                  </p>

                  <div className="suggestion">
                    <FiCheck />

                    Specify an expected maximum
                    response time.
                  </div>

                </div>

              </div>

              <div className="demo-side-panel">

                {[
                  ['Clarity', 42],
                  ['Consistency', 96],
                  ['Testability', 38],
                  ['Singularity', 88],
                ].map(([label, value]) => (
                  <div
                    className="validation-score"
                    key={label}
                  >
                    <div>
                      <span>
                        {label}
                      </span>

                      <b>
                        {value}
                      </b>
                    </div>

                    <div className="score-bar">
                      <span
                        style={{
                          width: `${value}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

              </div>

            </div>
          )}

          {/* SRS */}

          {scene === 4 && (
            <div className="demo-layout">

              <div className="demo-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Software Requirements Specification
                    </strong>

                    <span>
                      Version 1.0
                    </span>
                  </div>

                  <FiFileText />
                </div>

                <div className="srs-document">

                  <h3>
                    College Event Management System
                  </h3>

                  <div className="srs-line" />

                  {[
                    '1. Introduction',
                    '2. Overall Description',
                    '3. System Features',
                    '3.1 Event Registration',
                    '4. External Interface Requirements',
                    '5. Nonfunctional Requirements',
                    '6. Other Requirements',
                  ].map((item, index) => (
                    <div
                      className={
                        index === 3
                          ? 'srs-item active'
                          : 'srs-item'
                      }
                      key={item}
                    >
                      <span>
                        {String(index + 1).padStart(
                          2,
                          '0'
                        )}
                      </span>

                      {item}

                      {index === 3 && (
                        <FiChevronRight />
                      )}
                    </div>
                  ))}

                </div>

              </div>

              <div className="demo-side-panel">

                <div className="trace-mini">

                  <div>
                    USER-MSG-018
                  </div>

                  <FiChevronRight />

                  <div>
                    FR-002
                  </div>

                  <FiChevronRight />

                  <div>
                    §3.1.3
                  </div>

                  <FiChevronRight />

                  <div>
                    SRS v1.0
                  </div>

                </div>

                <div className="side-check">
                  <FiCheck />
                  Template structure preserved
                </div>

                <div className="side-check">
                  <FiCheck />
                  Requirement IDs preserved
                </div>

                <div className="side-check">
                  <FiCheck />
                  Source traceability available
                </div>

              </div>

            </div>
          )}

          {/* CHANGE CONTROL */}

          {scene === 5 && (
            <div className="demo-layout">

              <div className="demo-panel">

                <div className="panel-header">
                  <div>
                    <strong>
                      Change Control
                    </strong>

                    <span>
                      Version 1.0 → 1.1
                    </span>
                  </div>

                  <FiGitBranch />
                </div>

                <div className="diff">

                  <div className="diff-version">
                    <span>
                      v1.0
                    </span>

                    <FiArrowRight />

                    <span className="new">
                      v1.1
                    </span>
                  </div>

                  <div className="diff-remove">
                    − Students shall register
                    for events.
                  </div>

                  <div className="diff-add">
                    + Event registration requires
                    administrator approval.
                  </div>

                  <div className="diff-context">
                    Affected sections:
                    §3.1 Event Registration ·
                    §3.1.3 Functional Requirements
                  </div>

                </div>

                <div className="review-actions">
                  <button className="primary">
                    Approve update
                  </button>

                  <button>
                    Edit
                  </button>

                  <button>
                    Reject
                  </button>
                </div>

              </div>

              <div className="demo-side-panel">

                <h4>
                  Revision history
                </h4>

                <div className="revision">
                  <strong>
                    v1.1
                  </strong>

                  <span>
                    Added administrator approval
                  </span>
                </div>

                <div className="revision">
                  <strong>
                    v1.0
                  </strong>

                  <span>
                    Initial approved release
                  </span>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* ================= FOOTER ================= */}

        {/* <div className="demo-footer" style={{ color: '#334155', fontWeight: 600 }}>

          <span style={{ color: '#1e293b', fontWeight: 700 }}>
            Step {scene + 1} of {TABS.length}
          </span>

          <div className="demo-progress">
            <span
              style={{
                width: `${
                  ((scene + 1) /
                    TABS.length) *
                  100
                }%`,
              }}
            />
          </div>

          <span style={{ color: '#1e293b', fontWeight: 700 }}>
            {SCENE_TITLES[scene]}
          </span>

        </div> */}

      </div>

      <style jsx>{`

        .demo {
          width: 100%;
          overflow: hidden;
          border: 1px solid #e4e7ec;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 20px 50px rgba(16, 24, 40, 0.07);
        }

        .demo-header {
          padding: 19px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid #eaecf0;
        }

        .demo-title {
          color: #0f172a !important;
          font-size: 14px;
          font-weight: 700;
        }

        .demo-subtitle {
          margin-top: 4px;
          color: #475569 !important;
          font-size: 11px;
          font-weight: 500;
        }

        .demo-status {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 9px;
          border: 1px solid #bae6fd;
          border-radius: 999px;
          background: #f0f9ff;
          color: #0369a1 !important;
          font-size: 10px;
          font-weight: 650;
          white-space: nowrap;
        }

        .demo-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0284c7;
        }

        .demo-tabs {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px;
          border-bottom: 1px solid #eaecf0;
          background: #fcfcfd;
        }

        .demo-tab-list {
          display: flex;
          min-width: 0;
          overflow-x: auto;
        }

        .demo-tab {
          position: relative;
          padding: 14px 13px;
          border: 0;
          background: transparent;
          color: #475569 !important;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .demo-tab span {
          color: #64748b !important;
          margin-right: 5px;
          font-weight: 600;
        }

        .demo-tab::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: -1px;
          height: 2px;
          background: transparent;
        }

        .demo-tab.active {
          color: #0284c7 !important;
          font-weight: 700;
        }

        .demo-tab.active::after {
          background: #0284c7;
        }

        .demo-controls {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .demo-controls button {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border: 1px solid #e4e7ec;
          border-radius: 6px;
          color: #334155 !important;
          background: white;
          cursor: pointer;
        }

        .demo-controls button:hover {
          color: #0284c7 !important;
          border-color: #bae6fd;
        }

        .demo-controls .play-button {
          color: white !important;
          background: #0284c7 !important;
          border-color: #0284c7 !important;
        }

        .demo-content {
          min-height: 390px;
          padding: 22px;
          background: #f8fafc;
        }

        .demo-layout {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
        }

        .demo-panel,
        .demo-side-panel {
          min-width: 0;
          border: 1px solid #e4e7ec;
          border-radius: 11px;
          background: white;
        }

        .demo-panel {
          overflow: hidden;
        }

        .demo-side-panel {
          padding: 22px;
          align-self: stretch;
        }

        .panel-header {
          min-height: 62px;
          padding: 13px 17px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eaecf0;
          background: #fcfcfd;
        }

        .panel-header strong {
          display: block;
          color: #0f172a !important;
          font-size: 13px;
          font-weight: 700;
        }

        .panel-header span {
          display: block;
          margin-top: 4px;
          color: #475569 !important;
          font-size: 10px;
        }

        .panel-header > svg {
          color: #0284c7 !important;
        }

        .chat-feed {
          height: 265px;
          overflow-y: auto;
          padding: 17px;
        }

        .chat-message {
          max-width: 82%;
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 11px;
          line-height: 1.5;
        }

        .chat-message.ai {
          margin-right: auto;
          color: #0f172a !important;
          background: #f1f5f9;
          font-weight: 500;
        }

        .chat-message.ai .message-label {
          color: #0284c7 !important;
          font-weight: 700;
        }

        .chat-message.ai .message-text {
          color: #0f172a !important;
        }

        .chat-message.user {
          margin-left: auto;
          color: #0f172a !important;
          background: #a7e3fa !important;
          font-weight: 500;
        }

        .chat-message.user .message-label {
          color: #0369a1 !important;
          font-weight: 700;
        }

        .chat-message.user .message-text {
          color: #0f172a !important;
        }

        .message-label {
          margin-bottom: 4px;
          font-size: 9px;
          font-weight: 700;
          color: #334155 !important;
        }

        .chat-footer {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 13px;
          border-top: 1px solid #eaecf0;
        }

        .chat-footer span {
          padding: 4px 7px;
          border-radius: 5px;
          background: #f2f4f7;
          color: #334155 !important;
          font-size: 9px;
          font-weight: 600;
        }

        .chat-footer button {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 5px;
          border: 0;
          border-radius: 6px;
          padding: 7px 10px;
          background: #0284c7;
          color: white !important;
          font-size: 9px;
          font-weight: 650;
        }

        .side-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #f0f9ff;
          color: #0284c7 !important;
        }

        .demo-side-panel h4 {
          margin: 16px 0 7px;
          color: #0f172a !important;
          font-size: 13px;
          font-weight: 700;
        }

        .demo-side-panel > p {
          margin: 0 0 17px;
          color: #334155 !important;
          font-size: 11px;
          line-height: 1.6;
          font-weight: 500;
        }

        .side-check {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 11px;
          color: #0f172a !important;
          font-size: 10px;
          line-height: 1.45;
          font-weight: 600;
        }

        .side-check svg {
          flex-shrink: 0;
          color: #0284c7 !important;
          margin-top: 1px;
        }

        .source-panel {
          padding-bottom: 16px;
        }

        .source-message {
          margin: 15px;
          padding: 13px;
          border: 1px solid #eaecf0;
          border-radius: 8px;
          background: #fcfcfd;
        }

        .source-message small {
          color: #0284c7;
          font-size: 9px;
          font-weight: 750;
        }

        .source-message p {
          margin: 7px 0 0;
          color: #475467;
          font-size: 11px;
          line-height: 1.55;
        }

        .requirement-list {
          padding: 6px 15px;
        }

        .requirement-row {
          display: grid;
          grid-template-columns: 1fr 70px;
          gap: 12px;
          padding: 13px 2px;
          border-bottom: 1px solid #f2f4f7;
          animation: rowIn 350ms ease both;
        }

        .req-top {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .req-top span {
          color: #0284c7;
          font-size: 9px;
          font-weight: 750;
        }

        .req-top em {
          padding: 3px 5px;
          border-radius: 4px;
          background: #f2f4f7;
          color: #667085;
          font-size: 8px;
          font-style: normal;
        }

        .requirement-row p {
          margin: 6px 0 0;
          color: #475467;
          font-size: 10px;
          line-height: 1.45;
        }

        .confidence {
          text-align: right;
        }

        .confidence strong {
          display: block;
          color: #344054;
          font-size: 13px;
        }

        .confidence span {
          color: #98a2b3;
          font-size: 8px;
        }

        .quality-card {
          padding: 22px;
        }

        .quality-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .warning {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #b54708;
          font-size: 11px;
          font-weight: 650;
        }

        .quality-heading strong {
          color: #344054;
          font-size: 24px;
        }

        .quality-bar {
          height: 7px;
          margin: 15px 0 20px;
          overflow: hidden;
          border-radius: 999px;
          background: #f2f4f7;
        }

        .quality-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #0284c7;
          transition: width 80ms linear;
        }

        .quality-compare {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .quality-compare > div {
          padding: 13px;
          border: 1px solid #eaecf0;
          border-radius: 8px;
        }

        .quality-compare small {
          color: #0284c7;
          font-weight: 700;
          font-size: 9px;
        }        }

        .quality-compare p {
          margin: 7px 0 0;
          color: #667085;
          font-size: 10px;
          line-height: 1.5;
        }

        .review-actions {
          display: flex;
          gap: 7px;
          margin-top: 18px;
        }

        .review-actions button {
          padding: 7px 10px;
          border: 1px solid #d0d5dd;
          border-radius: 6px;
          background: white;
          color: #475467;
          font-size: 9px;
          font-weight: 650;
          cursor: pointer;
            .review-actions button.primary {
          color: white;
          border-color: #0284c7;
          background: #0284c7;
        }

        .quality-score {
          margin-bottom: 20px;
        }

        .quality-score strong {
          display: block;
          color: #0284c7;
          font-size: 35px;
          letter-spacing: -0.04em;
        }

        .quality-score span {
          color: #98a2b3;
          font-size: 10px;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid #f2f4f7;
          color: #667085;
          font-size: 10px;
        }

        .metric b {
          color: #344054;
        }

        .validation-box {
          margin: 20px;
          padding: 19px;
          border: 1px solid #fedf89;
          border-radius: 10px;
          background: #fffcf5;
        }

        .validation-label {
          display: inline-block;
          padding: 4px 7px;
          border-radius: 4px;
          background: #fef0c7;
          color: #b54708;
          font-size: 8px;
          font-weight: 750;
        }

        .validation-box h3 {
          margin: 15px 0 8px;
          color: #344054;
          font-size: 16px;
        }

        .validation-box p {
          margin: 0;
          color: #667085;
          font-size: 11px;
          line-height: 1.6;
        }

        .suggestion {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 17px;
          padding: 10px;
          border-radius: 7px;
          background: white;
          color: #475467;
          font-size: 10px;
          line-height: 1.45;
        }

        .suggestion svg {
          color: #0284c7;
          flex-shrink: 0;
        }

        .validation-score {
          margin-bottom: 18px;
        }

        .validation-score > div:first-child {
          display: flex;
          justify-content: space-between;
          color: #667085;
          font-size: 10px;
        }

        .validation-score b {
          color: #344054;
        }

        .score-bar {
          height: 6px;
          margin-top: 7px;
          border-radius: 999px;
          background: #f2f4f7;
          overflow: hidden;
        }

        .score-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #0284c7;
        }

        .srs-document {
          padding: 20px;
        }

        .srs-document h3 {
          margin: 0 0 10px;
          color: #344054;
          font-size: 16px;
        }

        .srs-line {
          height: 1px;
          background: #eaecf0;
          margin-bottom: 10px;
        }

        .srs-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px;
          border-radius: 6px;
          color: #667085;
          font-size: 10px;
        }

        .srs-item span {
          width: 22px;
          color: #98a2b3;
          font-size: 9px;
        }

        .srs-item.active {
          color: #0284c7;
          background: #f0f9ff;
          font-weight: 650;
        }

        .srs-item svg {
          margin-left: auto;
        }

        .trace-mini {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }

        .trace-mini div {
          padding: 8px;
          border: 1px solid #eaecf0;
          border-radius: 6px;
          color: #475467;
          background: #fcfcfd;
          font-size: 9px;
        }

        .trace-mini svg {
          align-self: center;
          color: #98a2b3;
        }

        .diff {
          margin: 20px;
          border: 1px solid #eaecf0;
          border-radius: 9px;
          overflow: hidden;
        }

        .diff-version {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border-bottom: 1px solid #eaecf0;
          background: #fcfcfd;
          color: #667085;
          font-size: 9px;
        }

        .diff-version span {
          padding: 4px 6px;
          border-radius: 4px;
          background: #f2f4f7;
        }

        .diff-version span.new {
          color: #0369a1;
          background: #f0f9ff;
        }

        .diff-remove,
        .diff-add,
        .diff-context {
          padding: 13px;
          font-size: 10px;
          line-height: 1.5;
        }

        .diff-remove {
          color: #b42318;
          background: #fff5f5;
        }

        .diff-add {
          color: #0369a1;
          background: #f0f9ff;
        }

        .diff-context {
          color: #667085;
          background: #fcfcfd;
        }

        .revision {
          padding: 13px 0;
          border-bottom: 1px solid #f2f4f7;
        }

        .revision strong {
          display: block;
          color: #0284c7;
          font-size: 11px;
        }

        .revision span {
          display: block;
          margin-top: 4px;
          color: #667085;
          font-size: 10px;
          line-height: 1.4;
        }

        .demo-footer {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px 18px;
          border-top: 1px solid #eaecf0;
          color: #334155 !important;
          font-size: 10px;
          font-weight: 600;
        }

        .demo-footer span {
          color: #334155 !important;
          font-weight: 650;
        }

        .demo-progress {
          flex: 1;
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: #eaecf0;
        }

        .demo-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #0284c7;
          transition: width 300ms ease;
        }        }

        @keyframes rowIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 850px) {
          .demo-layout {
            grid-template-columns: 1fr;
          }

          .demo-side-panel {
            min-height: auto;
          }
        }

        @media (max-width: 650px) {
          .demo-header {
            align-items: flex-start;
          }

          .demo-status {
            display: none;
          }

          .demo-tabs {
            padding: 0 7px;
          }

          .demo-content {
            padding: 12px;
          }

          .chat-footer span {
            display: none;
          }

          .quality-compare {
            grid-template-columns: 1fr;
          }

          .requirement-row {
            grid-template-columns: 1fr;
          }

          .confidence {
            text-align: left;
          }
        }

      `}</style>
    </>
  );
}