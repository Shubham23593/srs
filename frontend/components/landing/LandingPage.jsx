'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiFileText,
  FiGitBranch,
  FiLayers,
  FiMessageSquare,
  FiShield,
  FiTarget,
  FiUsers,
  FiZap,
  FiDatabase,
  FiDownload,
  FiSearch,
  FiSettings,
  FiActivity,
  FiMenu,
  FiX,
} from 'react-icons/fi';

import Hero3D from './Hero3D';
import LiveDemo from './LiveDemo';

export default function LandingPage() {
  const { user } = useAuth();
  const menuRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.background = '#f7f8fa';
    document.body.style.background = '#f7f8fa';

    const elements = document.querySelectorAll('[data-reveal]');

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const toggleMenu = () => {
    menuRef.current?.classList.toggle('open');
  };

  const closeMenu = () => {
    menuRef.current?.classList.remove('open');
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --brand: #0f766e;
          --brand-dark: #115e59;
          --brand-light: #ecfdf5;
          --blue: #2563eb;
          --text: #172033;
          --muted: #667085;
          --border: #e5e7eb;
          --surface: #ffffff;
          --surface-soft: #f8fafc;
          --page: #f7f8fa;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          color: var(--text);
          background: var(--page);
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button {
          font: inherit;
        }

        .landing-page {
          min-height: 100vh;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f8fafc 38%,
              #ffffff 100%
            );
        }

        /* =========================
           HEADER
        ========================= */

        .lp-header {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 72px;
          border-bottom: 1px solid rgba(229, 231, 235, 0.85);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(16px);
        }

        .lp-header-inner {
          width: min(1180px, calc(100% - 40px));
          height: 100%;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .lp-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 750;
          letter-spacing: -0.025em;
        }

        .lp-brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: white;
          background: var(--brand);
          box-shadow: 0 5px 16px rgba(15, 118, 110, 0.2);
        }

        .lp-brand-name {
          font-size: 17px;
          color : black;
        }

        .lp-brand-name span {
          color: var(--brand);
        }

        .lp-nav {
          display: flex;
          align-items: center;
          gap: 30px;
          margin-left: auto;
          margin-right: 30px;
        }

        .lp-nav a {
          color: #475467;
          font-size: 14px;
          font-weight: 550;
          transition: color 180ms ease;
        }

        .lp-nav a:hover {
          color: var(--brand);
        }

        .lp-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .lp-btn {
          min-height: 40px;
          padding: 0 17px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 650;
          border: 1px solid transparent;
          cursor: pointer;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }

        .lp-btn:hover {
          transform: translateY(-1px);
        }

        .lp-btn-primary {
          color: white;
          background: var(--brand);
          box-shadow: 0 5px 14px rgba(15, 118, 110, 0.16);
        }

        .lp-btn-primary:hover {
          background: var(--brand-dark);
          box-shadow: 0 8px 20px rgba(15, 118, 110, 0.2);
        }

        .lp-btn-secondary {
          color: #344054;
          background: white;
          border-color: #d0d5dd;
        }

        .lp-btn-secondary:hover {
          background: #f9fafb;
        }

        .lp-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          border: 1px solid var(--border);
          background: white;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .lp-mobile-menu {
          display: none;
        }

        /* =========================
           HERO
        ========================= */

        .lp-hero {
          width: min(1180px, calc(100% - 40px));
          margin: auto;
          padding: 82px 0 90px;
        }

        .lp-hero-grid {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          align-items: center;
          gap: 72px;
        }

        .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid #d1fae5;
          border-radius: 999px;
          color: var(--brand-dark);
          background: #f0fdf4;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.045em;
          text-transform: uppercase;
        }

        .lp-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        .lp-hero h1 {
          margin: 20px 0 20px;
          max-width: 650px;
          color: #101828;
          font-size: clamp(42px, 5vw, 67px);
          line-height: 1.04;
          letter-spacing: -0.055em;
          font-weight: 760;
        }

        .lp-hero h1 span {
          color: var(--brand);
        }

        .lp-hero-description {
          max-width: 610px;
          color: #667085;
          font-size: 17px;
          line-height: 1.75;
          margin: 0;
        }

        .lp-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .lp-trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 22px;
          margin-top: 28px;
          color: #667085;
          font-size: 12px;
        }

        .lp-trust-item {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .lp-trust-item svg {
          color: var(--brand);
        }

        .lp-hero-visual {
          min-width: 0;
        }

        /* =========================
           SECTION COMMON
        ========================= */

        .lp-section {
          width: min(1180px, calc(100% - 40px));
          margin: auto;
          padding: 105px 0;
        }

        .lp-section-header {
          max-width: 720px;
          margin-bottom: 48px;
        }

        .lp-section-kicker {
          color: var(--brand);
          font-size: 12px;
          font-weight: 750;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .lp-section-title {
          margin: 0;
          color: #101828;
          font-size: clamp(30px, 4vw, 45px);
          line-height: 1.12;
          letter-spacing: -0.04em;
        }

        .lp-section-description {
          margin: 15px 0 0;
          color: #667085;
          font-size: 16px;
          line-height: 1.7;
        }

        /* =========================
           PROBLEM / VALUE
        ========================= */

        .lp-value-section {
          background: white;
          border-top: 1px solid #eef0f3;
          border-bottom: 1px solid #eef0f3;
        }

        .lp-value-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .lp-value-card {
          padding: 27px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
        }

        .lp-value-card:hover {
          transform: translateY(-4px);
          border-color: #cbd5e1;
          box-shadow: 0 18px 40px rgba(16, 24, 40, 0.07);
        }

        .lp-icon-box {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: var(--brand);
          background: var(--brand-light);
          margin-bottom: 20px;
        }

        .lp-value-card h3 {
          margin: 0 0 9px;
          color: #1d2939;
          font-size: 17px;
        }

        .lp-value-card p {
          margin: 0;
          color: #667085;
          font-size: 14px;
          line-height: 1.7;
        }

        /* =========================
           WORKFLOW
        ========================= */

        .lp-workflow {
          background: #f8fafc;
          border-bottom: 1px solid #eef0f3;
        }

        .lp-workflow-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
          border: 1px solid var(--border);
          background: white;
          border-radius: 16px;
          overflow: hidden;
        }

        .lp-workflow-step {
          position: relative;
          min-height: 220px;
          padding: 25px 21px;
          border-right: 1px solid var(--border);
        }

        .lp-workflow-step:last-child {
          border-right: 0;
        }

        .lp-step-number {
          color: #98a2b3;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        .lp-step-icon {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: var(--brand);
          background: #f0fdf4;
          margin-bottom: 18px;
        }

        .lp-workflow-step h3 {
          margin: 0 0 8px;
          font-size: 15px;
          color: #1d2939;
        }

        .lp-workflow-step p {
          margin: 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.55;
        }

        /* =========================
           DEMO
        ========================= */

        .lp-demo-section {
          background: white;
        }

        .lp-demo-wrap {
          padding: 0;
        }

        /* =========================
           CAPABILITIES
        ========================= */

        .lp-cap-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }

        .lp-cap-card {
          padding: 30px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          display: flex;
          gap: 18px;
          transition:
            transform 220ms ease,
            box-shadow 220ms ease;
        }

        .lp-cap-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(16, 24, 40, 0.06);
        }

        .lp-cap-card h3 {
          margin: 0 0 8px;
          font-size: 17px;
        }

        .lp-cap-card p {
          margin: 0;
          color: #667085;
          line-height: 1.65;
          font-size: 14px;
        }

        .lp-cap-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 16px;
        }

        .lp-cap-list span {
          padding: 5px 9px;
          border-radius: 6px;
          color: #475467;
          background: #f2f4f7;
          font-size: 11px;
          font-weight: 600;
        }

        /* =========================
           TRACEABILITY
        ========================= */

        .lp-trace-section {
          background: #f8fafc;
          border-top: 1px solid #eef0f3;
          border-bottom: 1px solid #eef0f3;
        }

        .lp-trace-box {
          padding: 34px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .lp-trace-row {
          display: grid;
          grid-template-columns: 1fr 30px 1fr 30px 1fr 30px 1fr;
          align-items: center;
          gap: 10px;
        }

        .lp-trace-node {
          min-height: 100px;
          padding: 18px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #fff;
        }

        .lp-trace-node small {
          display: block;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .lp-trace-node strong {
          display: block;
          color: #344054;
          font-size: 13px;
        }

        .lp-trace-arrow {
          color: #98a2b3;
          display: grid;
          place-items: center;
        }

        /* =========================
           STANDARDS
        ========================= */

        .lp-standards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .lp-standard-card {
          padding: 24px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: white;
        }

        .lp-standard-card strong {
          display: block;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .lp-standard-card p {
          margin: 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
        }

        /* =========================
           CTA
        ========================= */

        .lp-cta-section {
          padding: 100px 20px;
          background: #123f3b;
        }

        .lp-cta-inner {
          width: min(880px, 100%);
          margin: auto;
          text-align: center;
        }

        .lp-cta-inner .lp-section-kicker {
          color: #6ee7b7;
        }

        .lp-cta-inner h2 {
          margin: 0;
          color: white;
          font-size: clamp(32px, 5vw, 52px);
          letter-spacing: -0.045em;
        }

        .lp-cta-inner p {
          max-width: 650px;
          margin: 17px auto 28px;
          color: #c9d9d7;
          line-height: 1.7;
        }

        .lp-cta-inner .lp-btn-primary {
          color: #123f3b;
          background: white;
          box-shadow: none;
        }

        .lp-cta-inner .lp-btn-primary:hover {
          background: #f0fdf4;
        }

        /* =========================
           FOOTER
        ========================= */

        .lp-footer {
          background: #ffffff;
          border-top: 1px solid var(--border);
        }

        .lp-footer-inner {
          width: min(1180px, calc(100% - 40px));
          margin: auto;
          padding: 38px 0;
          display: flex;
          justify-content: space-between;
          gap: 30px;
        }

        .lp-footer-brand {
          color: #475467;
          font-size: 13px;
          line-height: 1.6;
        }

        .lp-footer-brand strong {
          display: block;
          color: #1d2939;
          margin-bottom: 4px;
        }

        .lp-footer-links {
          display: flex;
          gap: 24px;
          color: #667085;
          font-size: 13px;
        }

        .lp-footer-links a:hover {
          color: var(--brand);
        }

        /* =========================
           ANIMATION
        ========================= */

        [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 650ms ease,
            transform 650ms cubic-bezier(.2,.7,.2,1);
        }

        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .delay-1 {
          transition-delay: 80ms;
        }

        .delay-2 {
          transition-delay: 160ms;
        }

        .delay-3 {
          transition-delay: 240ms;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 900px) {
          .lp-nav,
          .lp-header-actions {
            display: none;
          }

          .lp-menu-btn {
            display: flex;
          }

          .lp-mobile-menu {
            position: absolute;
            top: 72px;
            left: 20px;
            right: 20px;
            display: block;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: white;
            box-shadow: 0 15px 40px rgba(16, 24, 40, 0.12);
            opacity: 0;
            pointer-events: none;
            transform: translateY(-8px);
            transition: 180ms ease;
          }

          .lp-mobile-menu.open {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }

          .lp-mobile-menu a {
            display: block;
            padding: 13px;
            color: #475467;
            font-size: 14px;
            border-radius: 7px;
          }

          .lp-mobile-menu a:hover {
            background: #f2f4f7;
          }

          .lp-hero-grid {
            grid-template-columns: 1fr;
            gap: 50px;
          }

          .lp-hero {
            padding-top: 60px;
          }

          .lp-value-grid,
          .lp-standards-grid {
            grid-template-columns: 1fr;
          }

          .lp-workflow-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .lp-workflow-step:nth-child(2) {
            border-right: 0;
          }

          .lp-workflow-step:nth-child(-n + 3) {
            border-bottom: 1px solid var(--border);
          }

          .lp-cap-grid {
            grid-template-columns: 1fr;
          }

          .lp-trace-row {
            grid-template-columns: 1fr;
          }

          .lp-trace-arrow {
            transform: rotate(90deg);
          }
        }

        @media (max-width: 600px) {
          .lp-header-inner,
          .lp-section,
          .lp-hero,
          .lp-footer-inner {
            width: min(100% - 28px, 1180px);
          }

          .lp-hero h1 {
            font-size: 42px;
          }

          .lp-hero-description {
            font-size: 15px;
          }

          .lp-section {
            padding: 75px 0;
          }

          .lp-workflow-grid {
            grid-template-columns: 1fr;
          }

          .lp-workflow-step {
            border-right: 0;
            border-bottom: 1px solid var(--border);
          }

          .lp-workflow-step:last-child {
            border-bottom: 0;
          }

          .lp-footer-inner {
            flex-direction: column;
          }

          .lp-footer-links {
            flex-wrap: wrap;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          [data-reveal] {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <main className="landing-page">

        {/* ================= HEADER ================= */}

        <header className="lp-header">
          <div className="lp-header-inner">

            <Link href="#top" className="lp-brand">
              <span className="lp-brand-mark">
                <FiZap size={18} />
              </span>

              <span className="lp-brand-name">
                Aether
              </span>
            </Link>

            <nav className="lp-nav">
              <a href="#platform">Platform</a>
              <a href="#workflow">Workflow</a>
              <a href="#demo">Live Demo</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#standards">Standards</a>
            </nav>

            <div className="lp-header-actions">
              {user ? (
                <Link
                  href="/dashboard"
                  className="lp-btn lp-btn-primary"
                >
                  Open Dashboard
                  <FiArrowRight size={15} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="lp-btn lp-btn-secondary"
                  >
                    Sign in
                  </Link>

                  <Link
                    href="/register"
                    className="lp-btn lp-btn-primary"
                  >
                    Get started
                    <FiArrowRight size={15} />
                  </Link>
                </>
              )}
            </div>

            <button
              className="lp-menu-btn"
              onClick={toggleMenu}
              aria-label="Open navigation"
            >
              <FiMenu size={19} />
            </button>

          </div>

          <div ref={menuRef} className="lp-mobile-menu">
            <a href="#platform" onClick={closeMenu}>Platform</a>
            <a href="#workflow" onClick={closeMenu}>Workflow</a>
            <a href="#demo" onClick={closeMenu}>Live Demo</a>
            <a href="#capabilities" onClick={closeMenu}>Capabilities</a>
            <a href="#standards" onClick={closeMenu}>Standards</a>

            {user ? (
              <Link href="/dashboard" onClick={closeMenu}>
                Open Dashboard
              </Link>
            ) : (
              <Link href="/register" onClick={closeMenu}>
                Get started
              </Link>
            )}
          </div>
        </header>

        {/* ================= HERO ================= */}

        <section id="top" className="lp-hero">
          <div className="lp-hero-grid">

            <div data-reveal>

              <div className="lp-eyebrow">
                <span className="lp-eyebrow-dot" />
                Requirements Engineering Platform
              </div>

              <h1>
                Turn project conversations into
                <span> structured requirements.</span>
              </h1>

              <p className="lp-hero-description">
                IntelliSDLC AI helps teams elicit, extract, validate,
                classify, trace and generate software requirements —
                while keeping human review at the center of the process.
              </p>

              <div className="lp-hero-actions">

                {user ? (
                  <Link
                    href="/dashboard"
                    className="lp-btn lp-btn-primary"
                  >
                    Open Dashboard
                    <FiArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className="lp-btn lp-btn-primary"
                  >
                    Start a Project
                    <FiArrowRight size={16} />
                  </Link>
                )}

                <a
                  href="#demo"
                  className="lp-btn lp-btn-secondary"
                >
                  Explore workflow
                  <FiChevronRight size={16} />
                </a>

              </div>

              <div className="lp-trust-row">
                <span className="lp-trust-item">
                  <FiCheck size={14} />
                  Human approval workflow
                </span>

                <span className="lp-trust-item">
                  <FiCheck size={14} />
                  Requirement traceability
                </span>

                <span className="lp-trust-item">
                  <FiCheck size={14} />
                  SRS generation
                </span>
              </div>

            </div>

            <div
              className="lp-hero-visual"
              data-reveal
            >
              <Hero3D />
            </div>

          </div>
        </section>

        {/* ================= PLATFORM ================= */}

        <section id="platform" className="lp-value-section">
          <div className="lp-section">

            <div
              className="lp-section-header"
              data-reveal
            >
              <div className="lp-section-kicker">
                Why IntelliSDLC
              </div>

              <h2 className="lp-section-title">
                A structured engineering workflow,
                not another AI chat window.
              </h2>

              <p className="lp-section-description">
                Requirements move through defined engineering stages,
                giving teams better visibility from the initial
                conversation to the final SRS.
              </p>
            </div>

            <div className="lp-value-grid">

              <article
                className="lp-value-card"
                data-reveal
              >
                <div className="lp-icon-box">
                  <FiMessageSquare size={20} />
                </div>

                <h3>Structured elicitation</h3>

                <p>
                  Capture project goals, users, features, rules,
                  constraints and unanswered questions through
                  guided requirement interviews.
                </p>
              </article>

              <article
                className="lp-value-card delay-1"
                data-reveal
              >
                <div className="lp-icon-box">
                  <FiTarget size={20} />
                </div>

                <h3>Atomic requirements</h3>

                <p>
                  Convert unstructured project information into
                  identifiable functional and non-functional
                  requirements with stable requirement IDs.
                </p>
              </article>

              <article
                className="lp-value-card delay-2"
                data-reveal
              >
                <div className="lp-icon-box">
                  <FiGitBranch size={20} />
                </div>

                <h3>Traceable changes</h3>

                <p>
                  Connect requirements to their source, SRS sections
                  and revisions so changes remain understandable
                  throughout the project lifecycle.
                </p>
              </article>

            </div>
          </div>
        </section>

        {/* ================= WORKFLOW ================= */}

        <section id="workflow" className="lp-workflow">
          <div className="lp-section">

            <div
              className="lp-section-header"
              data-reveal
            >
              <div className="lp-section-kicker">
                Engineering workflow
              </div>

              <h2 className="lp-section-title">
                From conversation to specification.
              </h2>

              <p className="lp-section-description">
                IntelliSDLC organizes the requirements lifecycle into
                practical stages that teams can inspect and review.
              </p>
            </div>

            <div className="lp-workflow-grid">

              {[
                {
                  icon: FiMessageSquare,
                  number: '01',
                  title: 'Elicit',
                  text: 'Understand the project through guided conversations.',
                },
                {
                  icon: FiLayers,
                  number: '02',
                  title: 'Extract',
                  text: 'Convert project information into atomic requirements.',
                },
                {
                  icon: FiSearch,
                  number: '03',
                  title: 'Analyze',
                  text: 'Identify ambiguity, duplicates and potential conflicts.',
                },
                {
                  icon: FiShield,
                  number: '04',
                  title: 'Validate',
                  text: 'Review quality, consistency and requirement completeness.',
                },
                {
                  icon: FiFileText,
                  number: '05',
                  title: 'Generate',
                  text: 'Produce structured SRS documentation and revisions.',
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.number}
                    className={`lp-workflow-step delay-${index}`}
                    data-reveal
                  >
                    <div className="lp-step-number">
                      {item.number}
                    </div>

                    <div className="lp-step-icon">
                      <Icon size={18} />
                    </div>

                    <h3>{item.title}</h3>

                    <p>{item.text}</p>
                  </article>
                );
              })}

            </div>
          </div>
        </section>

        {/* ================= LIVE DEMO ================= */}

        <section id="demo" className="lp-demo-section">
          <div className="lp-section">

            <div
              className="lp-section-header"
              data-reveal
            >
              <div className="lp-section-kicker">
                Product walkthrough
              </div>

              <h2 className="lp-section-title">
                See how a requirement moves through the system.
              </h2>

              <p className="lp-section-description">
                Explore a simulated IntelliSDLC project and see how
                interview responses become requirements, quality
                findings and an SRS.
              </p>
            </div>

            <div className="lp-demo-wrap">
              <LiveDemo />
            </div>

          </div>
        </section>

        {/* ================= CAPABILITIES ================= */}

        <section id="capabilities">
          <div className="lp-section">

            <div
              className="lp-section-header"
              data-reveal
            >
              <div className="lp-section-kicker">
                Platform capabilities
              </div>

              <h2 className="lp-section-title">
                Built around the requirements lifecycle.
              </h2>
            </div>

            <div className="lp-cap-grid">

              <article className="lp-cap-card" data-reveal>
                <div className="lp-icon-box">
                  <FiUsers size={20} />
                </div>

                <div>
                  <h3>AI-assisted elicitation</h3>

                  <p>
                    Guided conversations help capture project context,
                    stakeholders, features and constraints before
                    requirements are formalized.
                  </p>

                  <div className="lp-cap-list">
                    <span>Context aware</span>
                    <span>Multilingual</span>
                    <span>Stage gated</span>
                  </div>
                </div>
              </article>

              <article className="lp-cap-card" data-reveal>
                <div className="lp-icon-box">
                  <FiActivity size={20} />
                </div>

                <div>
                  <h3>Requirement quality analysis</h3>

                  <p>
                    Surface ambiguity, duplication, conflicts and
                    quality concerns before requirements become part
                    of the formal specification.
                  </p>

                  <div className="lp-cap-list">
                    <span>Clarity</span>
                    <span>Consistency</span>
                    <span>Testability</span>
                  </div>
                </div>
              </article>

              <article className="lp-cap-card" data-reveal>
                <div className="lp-icon-box">
                  <FiDatabase size={20} />
                </div>

                <div>
                  <h3>Context retrieval</h3>

                  <p>
                    Retrieve relevant project context when requirements
                    are analyzed or updated instead of treating every
                    request as isolated text.
                  </p>

                  <div className="lp-cap-list">
                    <span>RAG</span>
                    <span>Project context</span>
                    <span>Source aware</span>
                  </div>
                </div>
              </article>

              <article className="lp-cap-card" data-reveal>
                <div className="lp-icon-box">
                  <FiDownload size={20} />
                </div>

                <div>
                  <h3>SRS generation & revision</h3>

                  <p>
                    Generate structured requirements documentation,
                    preserve versions and make controlled updates
                    when project requirements change.
                  </p>

                  <div className="lp-cap-list">
                    <span>SRS</span>
                    <span>Version history</span>
                    <span>PDF / DOCX</span>
                  </div>
                </div>
              </article>

            </div>
          </div>
        </section>

        {/* ================= TRACEABILITY ================= */}

        <section className="lp-trace-section">
          <div className="lp-section">

            <div
              className="lp-section-header"
              data-reveal
            >
              <div className="lp-section-kicker">
                Traceability
              </div>

              <h2 className="lp-section-title">
                Every requirement has a place in the story.
              </h2>

              <p className="lp-section-description">
                Follow a requirement from its original project
                conversation to its final location inside the SRS.
              </p>
            </div>

            <div
              className="lp-trace-box"
              data-reveal
            >
              <div className="lp-trace-row">

                <div className="lp-trace-node">
                  <small>Source</small>
                  <strong>
                    USER-MSG-018
                  </strong>
                </div>

                <div className="lp-trace-arrow">
                  <FiArrowRight />
                </div>

                <div className="lp-trace-node">
                  <small>Requirement</small>
                  <strong>
                    FR-002 · Event Registration
                  </strong>
                </div>

                <div className="lp-trace-arrow">
                  <FiArrowRight />
                </div>

                <div className="lp-trace-node">
                  <small>SRS Section</small>
                  <strong>
                    3.1.3 Functional Requirements
                  </strong>
                </div>

                <div className="lp-trace-arrow">
                  <FiArrowRight />
                </div>

                <div className="lp-trace-node">
                  <small>Version</small>
                  <strong>
                    SRS v1.1
                  </strong>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ================= STANDARDS ================= */}

        <section id="standards">
          <div className="lp-section">

            <div
              className="lp-section-header"
              data-reveal
            >
              <div className="lp-section-kicker">
                Engineering foundation
              </div>

              <h2 className="lp-section-title">
                Designed around established requirements practices.
              </h2>
            </div>

            <div className="lp-standards-grid">

              <article
                className="lp-standard-card"
                data-reveal
              >
                <strong>
                  ISO/IEC/IEEE 29148:2018
                </strong>

                <p>
                  Requirements engineering processes,
                  characteristics and documentation practices.
                </p>
              </article>

              <article
                className="lp-standard-card"
                data-reveal
              >
                <strong>
                  IEEE 830
                </strong>

                <p>
                  Software requirements specification structure
                  and documentation principles.
                </p>
              </article>

              <article
                className="lp-standard-card"
                data-reveal
              >
                <strong>
                  Human review
                </strong>

                <p>
                  AI assists the engineering workflow while people
                  retain control over requirement decisions.
                </p>
              </article>

            </div>

          </div>
        </section>

        {/* ================= CTA ================= */}

        <section className="lp-cta-section">
          <div className="lp-cta-inner">

            <div className="lp-section-kicker">
              Start with your next project
            </div>

            <h2>
              Make requirements easier
              to understand, review and maintain.
            </h2>

            <p>
              Bring project conversations, requirements analysis,
              traceability and SRS generation into one structured
              workspace.
            </p>

            {user ? (
              <Link
                href="/dashboard"
                className="lp-btn lp-btn-primary"
              >
                Open Dashboard
                <FiArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="lp-btn lp-btn-primary"
              >
                Create your workspace
                <FiArrowRight size={16} />
              </Link>
            )}

          </div>
        </section>

        {/* ================= FOOTER ================= */}

        <footer className="lp-footer">
          <div className="lp-footer-inner">

            <div className="lp-footer-brand">
              <strong>
                Aether
              </strong>

              Requirements engineering,
              structured for modern software teams.
            </div>

            <div className="lp-footer-links">
              <a href="#platform">Platform</a>
              <a href="#workflow">Workflow</a>
              <a href="#demo">Demo</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#standards">Standards</a>
            </div>

          </div>
        </footer>

      </main>
    </>
  );
}