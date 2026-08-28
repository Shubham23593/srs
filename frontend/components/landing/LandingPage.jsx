'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useAuth } from '../../context/AuthContext';
import Hero3D from './Hero3D';
import LiveDemo from './LiveDemo';

// Register ScrollTrigger plugin once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const PRELOADER_STATUSES = [
  'Initializing AI core…',
  'Loading interview agent…',
  'Calibrating embedding model…',
  'Auditing requirement quality…',
  'Generating SRS v1.0…',
  'Traceability matrix ready',
];

export default function LandingPage() {
  const { user } = useAuth();
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const pinRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;

    window.gsap = gsap; // shared with Hero3D's intro
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced) root.classList.add('reduced');

    document.body.classList.add('landing-active');
    document.documentElement.style.background = '#05060e';

    /* ---------------- Lenis smooth scroll ---------------- */
    let lenis = null;
    let tickFn = null;
    let headerHandler = null;
    let mobileStageHandler = null;
    let cursorAlive = false;
    let rotIv = null;
    if (!reduced) {
      lenis = new Lenis({ duration: 1.15 });
      lenis.on('scroll', ScrollTrigger.update);
      tickFn = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tickFn);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      /* ---------------- custom cursor ---------------- */
      const dot = document.getElementById('cursor-dot');
      const ring = document.getElementById('cursor-ring');
      let cx = 0, cy = 0, rx = 0, ry = 0;

      const moveCursor = (e) => {
        cx = e.clientX; cy = e.clientY;
        if (dot) { dot.style.left = `${cx}px`; dot.style.top = `${cy}px`; }
      };
      const loopCursor = () => {
        if (!cursorAlive) return;
        rx += (cx - rx) * 0.16;
        ry += (cy - ry) * 0.16;
        if (ring) { ring.style.left = `${rx}px`; ring.style.top = `${ry}px`; }
        requestAnimationFrame(loopCursor);
      };
      if (!coarse) {
        cursorAlive = true;
        window.addEventListener('pointermove', moveCursor, { passive: true });
        loopCursor();
        root.addEventListener('mouseover', (e) => {
          if (ring && e.target.closest('a, button, .dt, .tool-chip')) ring.classList.add('hovering');
        });
        root.addEventListener('mouseout', (e) => {
          if (ring && e.target.closest('a, button, .dt, .tool-chip')) ring.classList.remove('hovering');
        });
      }

      /* ---------------- magnetic buttons ---------------- */
      if (!coarse) {
        gsap.utils.toArray('.magnetic').forEach((el) => {
          const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
          const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
          el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * 0.32);
            yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
          });
          el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
      }

      /* ---------------- tilt cards ---------------- */
      if (!coarse) {
        gsap.utils.toArray('.tilt-card').forEach((card) => {
          const rxTo = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
          const ryTo = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
          card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            ryTo(px * 7);
            rxTo(-py * 7);
          });
          card.addEventListener('pointerleave', () => { rxTo(0); ryTo(0); });
        });
      }

      /* ---------------- header hide / show ---------------- */
      const header = root.querySelector('#site-header');
      let lastScroll = window.scrollY;
      headerHandler = () => {
        const y = window.scrollY;
        if (y > 40) header.classList.add('scrolled'); else header.classList.remove('scrolled');
        if (y > 500 && y > lastScroll + 4 && !root.classList.contains('menu-open')) header.classList.add('hide');
        else if (y < lastScroll - 4 || y <= 500) header.classList.remove('hide');
        lastScroll = y;
      };
      if (!reduced) {
        window.addEventListener('scroll', headerHandler, { passive: true });
        headerHandler();
      }

      /* ---------------- scroll progress ---------------- */
      const progressEl = root.querySelector('#scroll-progress');
      if (progressEl && !reduced) {
        gsap.to(progressEl, {
          width: '100%', ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
        });
      }

      /* ---------------- mobile menu ---------------- */
      const menuToggle = root.querySelector('#menu-toggle');
      const mobileMenu = root.querySelector('#mobile-menu');
      const closeMenu = () => {
        if (!mobileMenu.classList.contains('open')) return;
        mobileMenu.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        root.classList.remove('menu-open');
        header.classList.remove('hide');
        if (lenis) lenis.start();
      };
      menuToggle.addEventListener('click', () => {
        const open = mobileMenu.classList.toggle('open');
        menuToggle.classList.toggle('open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        root.classList.toggle('menu-open', open);
        if (lenis) open ? lenis.stop() : lenis.start();
      });
      mobileMenu.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          closeMenu();
          const target = document.querySelector(a.getAttribute('href'));
          if (target && lenis) lenis.scrollTo(target, { offset: -60 });
        });
      });

      /* ---------------- anchor links ---------------- */
      root.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (!href || href === '#') return;
          const target = document.querySelector(href);
          if (!target) return;
          e.preventDefault();
          if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.4 });
          else target.scrollIntoView({ behavior: 'smooth' });
        });
      });

      /* ---------------- hero title rotator ---------------- */
      const words = gsap.utils.toArray('.rot-word');
      if (words.length && !reduced) {
        gsap.set(words, { yPercent: 100, autoAlpha: 0 });
        // absolute children don't size the container — measure & set width
        const wordsWrap = root.querySelector('.rot-words');
        if (wordsWrap) {
          const maxW = Math.max(...words.map((w) => w.scrollWidth));
          gsap.set(wordsWrap, { width: maxW + 2 });
        }
        let wi = 0;
        const showWord = (i) => {
          words.forEach((w, j) => {
            if (j === i) gsap.fromTo(w, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out' });
            else gsap.to(w, { yPercent: -100, autoAlpha: 0, duration: 0.45, ease: 'power3.in' });
          });
        };
        showWord(0);
        rotIv = setInterval(() => { wi = (wi + 1) % words.length; showWord(wi); }, 2800);
      }

      /* ---------------- preloader ---------------- */
      const preloader = root.querySelector('#preloader');
      const prePct = root.querySelector('#pre-pct');
      const preStatus = root.querySelector('#pre-status');
      const preWords = preloader.querySelectorAll('.pre-wordmark span');
      const preFill = preloader.querySelector('.pre-bar-fill');

      const runPreloader = () => {
        gsap.timeline()
          .to(preWords, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.045, ease: 'power3.out' })
          .to('#preloader .pre-sub', { autoAlpha: 1, duration: 0.5 }, '-=0.2');

        const obj = { p: 0 };
        const statusDur = Math.ceil(2.4 / PRELOADER_STATUSES.length * 10) / 10;
        gsap.to(obj, {
          p: 100, duration: 2.4, ease: 'power2.inOut',
          onUpdate: () => {
            const v = Math.round(obj.p);
            if (prePct) prePct.textContent = `${v}%`;
            if (preFill) preFill.style.width = `${v}%`;
            if (preStatus) {
              const idx = Math.min(PRELOADER_STATUSES.length - 1, Math.floor(obj.p / 100 * PRELOADER_STATUSES.length));
              preStatus.textContent = PRELOADER_STATUSES[idx];
            }
          },
          onComplete: () => {
            window.dispatchEvent(new Event('landing:ready'));
            if (document.activeElement && document.activeElement.tagName === 'BODY') document.activeElement.blur();
            gsap.to(preloader, {
              yPercent: -100, duration: 0.9, ease: 'power4.inOut',
              onComplete: () => { if (preloader.parentNode) preloader.parentNode.removeChild(preloader); ScrollTrigger.refresh(); },
            });
          },
        });
      };

      /* ---------------- hero intro ---------------- */
      const runHeroIntro = () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.fromTo('.hero-title .line span', { yPercent: 115 }, { yPercent: 0, duration: 1.15, stagger: 0.13 }, 0.05)
          .fromTo('.hero-eyebrow', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.15)
          .fromTo('.hero-rotator', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.4)
          .fromTo('.hero-sub', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.85 }, 0.5)
          .fromTo('.hero-ctas .btn', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09 }, 0.62)
          .fromTo('.hero-stats .stat', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.82)
          .fromTo('.orbit', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4 }, 0.35)
          .fromTo('#site-header', { autoAlpha: 0, y: -22 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.55)
          .fromTo('.scroll-cue', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.15);
      };

      window.addEventListener('landing:ready', runHeroIntro, { once: true });

      if (reduced) {
        if (preloader) preloader.remove();
        runHeroIntro();
      } else {
        gsap.set('.hero-eyebrow, .hero-rotator, .hero-sub, .hero-ctas .btn, .hero-stats .stat, .scroll-cue, #site-header, .orbit', { autoAlpha: 0 });
        runPreloader();
      }

      /* ---------------- hero canvas fade on scroll ---------------- */
      gsap.to('#hero-canvas', {
        autoAlpha: 0.15, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      /* ---------------- counters ---------------- */
      gsap.utils.toArray('[data-count]').forEach((el) => {
        const target = parseInt(el.dataset.count, 10) || 0;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
          onUpdate: () => { el.textContent = Math.round(obj.v); },
        });
      });

      /* ---------------- generic reveals ---------------- */
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        gsap.fromTo(el,
          { autoAlpha: 0, y: 46 },
          {
            autoAlpha: 1, y: 0, duration: 1.05, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
      });

      /* ---------------- journey (pinned horizontal) ---------------- */
      const setActiveByScroll = () => {
        const stations = gsap.utils.toArray('.station');
        if (!stations.length) return;
        let best = 0;
        stations.forEach((s, j) => {
          const r = s.getBoundingClientRect();
          const c = r.left + r.width / 2 - window.innerWidth / 2;
          const rb = stations[best].getBoundingClientRect();
          if (Math.abs(c) < Math.abs(rb.left + rb.width / 2 - window.innerWidth / 2)) best = j;
        });
        stations.forEach((s, j) => s.classList.toggle('lit', j === best));
        const counter = root.querySelector('.jc-current');
        if (counter) counter.textContent = String(best + 1).padStart(2, '0');
      };

      const mm = gsap.matchMedia();
      mm.add('(min-width: 861px)', () => {
        if (!pinRef.current || !trackRef.current) return;
        const track = trackRef.current;
        const stations = gsap.utils.toArray('.station');
        const counter = root.querySelector('.jc-current');
        const railFill = root.querySelector('.journey-rail-fill');
        const distance = () => track.scrollWidth - window.innerWidth;

        gsap.set(track, { x: 0 });
        const setStage = (p) => {
          const i = Math.min(stations.length - 1, Math.max(0, Math.floor(p * stations.length)));
          stations.forEach((s, j) => s.classList.toggle('lit', j === i));
          if (counter) counter.textContent = String(i + 1).padStart(2, '0');
          if (railFill) railFill.style.transform = `scaleX(${p})`;
        };
        setStage(0);

        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: pinRef.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => setStage(self.progress),
          },
        });
      });
      mm.add('(max-width: 860px)', () => {
        setActiveByScroll();
        mobileStageHandler = setActiveByScroll;
        window.addEventListener('scroll', mobileStageHandler, { passive: true });
      });

      /* ---------------- traceability path draw ---------------- */
      const tracePath = root.querySelector('#trace-path');
      const traceSteps = gsap.utils.toArray('.trace-step');
      if (tracePath && traceSteps.length && !reduced) {
        const len = tracePath.getTotalLength();
        tracePath.style.strokeDasharray = len;
        tracePath.style.strokeDashoffset = len;
        gsap.to(tracePath, {
          strokeDashoffset: 0, ease: 'none',
          scrollTrigger: {
            trigger: '#traceability', start: 'top 65%', end: 'bottom 55%', scrub: 1,
            onUpdate: (self) => {
              const i = Math.min(traceSteps.length - 1, Math.floor(self.progress * traceSteps.length));
              traceSteps.forEach((s, j) => s.classList.toggle('on', j <= i));
            },
          },
        });
      }

      /* ---------------- journey start reveal (head) ---------------- */
      gsap.fromTo('#journey .journey-head',
        { autoAlpha: 0, y: 50 },
        {
          autoAlpha: 1, y: 0, duration: 1,
          scrollTrigger: { trigger: '#journey', start: 'top 80%', once: true },
        });
    }, root);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      cursorAlive = false;
      window.removeEventListener('load', onLoad);
      if (headerHandler) window.removeEventListener('scroll', headerHandler);
      if (mobileStageHandler) window.removeEventListener('scroll', mobileStageHandler);
      if (rotIv) clearInterval(rotIv);
      ctx.revert();
      if (lenis) lenis.destroy();
      if (tickFn) gsap.ticker.remove(tickFn);
      document.body.classList.remove('landing-active');
    };
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      {/* ═══════ PRELOADER ═══════ */}
      <div id="preloader" aria-hidden="true">
        <div className="pre-inner">
          <div className="pre-wordmark">
            <span>I</span><span>N</span><span>T</span><span>E</span><span>L</span><span>L</span><span>i</span><span>S</span><span>D</span><span>L</span><span>C</span><span className="pre-ai">AI</span>
          </div>
          <div className="pre-sub">SOFTWARE REQUIREMENTS ENGINEERING PLATFORM</div>
          <div className="pre-bar"><div className="pre-bar-fill" /></div>
          <div className="pre-meta">
            <span id="pre-status">Initializing AI core…</span>
            <span id="pre-pct">0%</span>
          </div>
        </div>
      </div>

      <div id="scroll-progress" aria-hidden="true" />
      <div id="grain" aria-hidden="true" />

      {/* ═══════ HEADER ═══════ */}
      <header id="site-header">
        <Link className="brand" href="#hero" data-cursor="link">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26"><path d="M7 22 L12.5 9.5 L15.5 17 L18.5 9.5 L25 22" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="brand-name">IntelliSDLC&nbsp;<em>AI</em></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary">
          <a href="#about" data-cursor="link">Platform</a>
          <a href="#journey" data-cursor="link">Journey</a>
          <a href="#demo" data-cursor="link">Live Demo</a>
          <a href="#capabilities" data-cursor="link">Capabilities</a>
          <a href="#stack" data-cursor="link">Stack</a>
        </nav>
        <div className="nav-cta">
          {user ? (
            <Link className="btn btn-ghost btn-sm magnetic" href="/dashboard" data-cursor="link">Open Dashboard</Link>
          ) : (
            <Link className="btn btn-ghost btn-sm magnetic" href="/register" data-cursor="link">Enter Platform</Link>
          )}
          <button id="menu-toggle" className="menu-toggle" aria-label="Menu" aria-expanded="false"><span /><span /></button>
        </div>
      </header>

      <div id="mobile-menu" aria-hidden="true">
        <nav>
          <a href="#about">Platform</a>
          <a href="#journey">Journey</a>
          <a href="#demo">Live Demo</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#traceability">Traceability</a>
          <a href="#stack">Stack</a>
        </nav>
      </div>

      {/* ═══════ HERO ═══════ */}
      <section id="hero">
        <Hero3D />

        <div className="orbit" aria-hidden="true">
          <div className="orbit-ring ring-1" />
          <div className="orbit-ring ring-2" />
          <div className="orbit-ring ring-3" />
          <div className="chip chip-fr">FR-001 · view events</div>
          <div className="chip chip-nfr">NFR-001 · auth required</div>
          <div className="chip chip-con">CON-003</div>
          <div className="chip chip-asm">ASM-002</div>
          <div className="chip chip-int">INT-005</div>
          <div className="chip chip-stk">STK-006</div>
        </div>

        <div className="hero-grid-bg" aria-hidden="true" />

        <div className="hero-content">
          <p className="eyebrow hero-eyebrow">AI-POWERED · ISO/IEC/IEEE 29148:2018 ALIGNED · IEEE 830-1998</p>
          <h1 className="hero-title">
            <span className="line"><span>From Project Idea to</span></span>
            <span className="line gradient-text"><span>Production-Ready SRS.</span></span>
          </h1>
          <div className="hero-rotator" aria-hidden="true">
            <span className="rot-label">IntelliSDLC AI</span>
            <span className="rot-words">
              <span className="rot-word">interviews you.</span>
              <span className="rot-word">extracts requirements.</span>
              <span className="rot-word">audits quality.</span>
              <span className="rot-word">validates everything.</span>
              <span className="rot-word">generates your SRS.</span>
            </span>
          </div>
          <p className="hero-sub">
            A 9-stage, stage-gated AI pipeline that turns a raw project idea into a complete,
            traceable, version-controlled Software Requirements Specification — in minutes, not weeks.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary magnetic" href="#demo" data-cursor="link">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
              Watch it work
            </Link>
            <Link className="btn btn-ghost magnetic" href="#journey" data-cursor="link">Explore the 9-stage journey</Link>
          </div>

          <div className="hero-stats">
            <div className="stat"><span className="stat-num" data-count="9">0</span><span className="stat-label">stage-gated pipeline</span></div>
            <div className="stat"><span className="stat-num" data-count="6">0</span><span className="stat-label">requirement types</span></div>
            <div className="stat"><span className="stat-num" data-count="5">0</span><span className="stat-label">tier traceability</span></div>
            <div className="stat"><span className="stat-num" data-count="384">0</span><span className="stat-label">dim embeddings</span></div>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true"><span>SCROLL</span><div className="cue-line" /></div>
      </section>

      {/* ═══════ MARQUEE ═══════ */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          <div className="marquee-set">
            <span>FR-001</span><i>◆</i><span>NFR-002</span><i>◆</i><span>CON-003</span><i>◆</i><span>ASM-004</span><i>◆</i><span>INT-005</span><i>◆</i><span>STK-006</span><i>◆</i><span>SRS v1.0 → v1.1</span><i>◆</i><span>92% SIMILARITY</span><i>◆</i><span>PDF · DOCX</span><i>◆</i><span>RAG RETRIEVAL</span><i>◆</i><span>TBD — NEEDS CLARIFICATION</span><i>◆</i>
          </div>
          <div className="marquee-set">
            <span>FR-001</span><i>◆</i><span>NFR-002</span><i>◆</i><span>CON-003</span><i>◆</i><span>ASM-004</span><i>◆</i><span>INT-005</span><i>◆</i><span>STK-006</span><i>◆</i><span>SRS v1.0 → v1.1</span><i>◆</i><span>92% SIMILARITY</span><i>◆</i><span>PDF · DOCX</span><i>◆</i><span>RAG RETRIEVAL</span><i>◆</i><span>TBD — NEEDS CLARIFICATION</span><i>◆</i>
          </div>
        </div>
      </div>

      {/* ═══════ ABOUT ═══════ */}
      <section id="about" className="section">
        <div className="wrap about-grid">
          <div className="about-copy">
            <p className="eyebrow" data-reveal>THE PLATFORM</p>
            <h2 className="h2" data-reveal>A real requirements engineering platform. <span className="gradient-text">Not a chatbot.</span></h2>
            <p className="lead" data-reveal>
              IntelliSDLC AI understands your project through a structured AI interview, extracts atomic
              requirements, audits their quality, classifies FR/NFR, validates them, retrieves context with RAG —
              and then writes your entire SRS against the exact uploaded template.
            </p>
            <p className="lead lead-2" data-reveal>
              Every requirement is traced to its source. Every version is preserved. Every change is reviewed
              by a human before it lands. The AI suggests — <strong>you decide</strong>.
            </p>
            <div className="about-chips" data-reveal>
              <span className="pill">9-stage pipeline</span>
              <span className="pill">Stage-gated · Context Guard</span>
              <span className="pill">EN · हिंदी · Hinglish</span>
              <span className="pill">Anti-hallucination</span>
            </div>
          </div>

          <div className="about-visual" data-reveal>
            <div className="doc-3d tilt-card">
              <div className="doc-head">
                <span className="doc-dot" />
                <span className="doc-title">srs_template.doc</span>
                <span className="doc-ver">v1.0</span>
              </div>
              <div className="doc-body">
                <div className="doc-line w90" />
                <div className="doc-line w60" />
                <div className="doc-line w80" />
                <div className="doc-sec"><span>1.</span> Introduction</div>
                <div className="doc-line w70 indent" />
                <div className="doc-line w85 indent" />
                <div className="doc-sec"><span>2.</span> Overall Description</div>
                <div className="doc-line w75 indent" />
                <div className="doc-sec"><span>3.</span> System Features</div>
                <div className="doc-line w65 indent accent-cyan" />
                <div className="doc-sec"><span>4.</span> External Interface Requirements</div>
                <div className="doc-line w50 indent" />
                <div className="doc-sec"><span>5.</span> Other Nonfunctional Requirements</div>
                <div className="doc-line w72 indent" />
                <div className="doc-sec"><span>6.</span> Other Requirements</div>
                <div className="doc-sec app"><span>A.</span> Glossary · <span>B.</span> Analysis Models · <span>C.</span> Issues List</div>
              </div>
              <div className="doc-foot">
                <span className="doc-btn">Export PDF</span>
                <span className="doc-btn">Export DOCX</span>
              </div>
              <div className="doc-glow" />
            </div>

            <div className="float-tag tag-a">FR-002 validated ✓</div>
            <div className="float-tag tag-b">SRS v1.0 approved</div>
            <div className="float-tag tag-c">Δ v1.1 — 2 sections updated</div>
          </div>
        </div>
      </section>

      {/* ═══════ JOURNEY ═══════ */}
      <section id="journey">
        <div className="journey-bg" aria-hidden="true" />
        <div className="journey-head">
          <p className="eyebrow">THE JOURNEY</p>
          <h2 className="h2">One idea. <span className="gradient-text">Twelve stages.</span> A finished SRS.</h2>
          <p className="journey-hint">Keep scrolling — the pipeline scrolls with you <span className="hint-arrow">→</span></p>
        </div>

        <div className="journey-pin" ref={pinRef}>
          <div className="journey-viewport">
            <div className="journey-rail"><div className="journey-rail-fill" /></div>
            <div className="journey-counter"><span className="jc-current">01</span><span className="jc-div">/</span><span className="jc-total">12</span></div>
            <div className="track" ref={trackRef}>
              <article className="station" data-stage="01">
                <div className="station-num">01</div>
                <h3>Project Idea</h3>
                <p>Every SRS starts as a rough idea. IntelliSDLC captures it with scope, stakeholders, objectives, constraints and assumptions.</p>
                <div className="station-art">
                  <span className="sa-chip">College Event Management System</span>
                  <span className="sa-chip dim">scope ✓</span><span className="sa-chip dim">stakeholders ✓</span>
                </div>
              </article>

              <article className="station" data-stage="02">
                <div className="station-num">02</div>
                <h3>AI Interview</h3>
                <p>The AI interviews you in English, Hindi or Hinglish. Answer, edit, skip, go back, or add requirements — you stay in control.</p>
                <div className="station-art chat-mini">
                  <span className="cm-ai">What should students be able to do?</span>
                  <span className="cm-user">View events &amp; register for them.</span>
                  <span className="cm-tools"><i>Answer</i><i>Edit</i><i>Skip</i><i>Back</i><i>Finish</i></span>
                </div>
              </article>

              <article className="station" data-stage="03">
                <div className="station-num">03</div>
                <h3>Requirement Extraction</h3>
                <p>Real-time atomic extraction. Every requirement gets a stable ID, type, confidence and a trace to its source message.</p>
                <div className="station-art">
                  <span className="sa-chip fr">FR-001 · view events</span>
                  <span className="sa-chip fr">FR-002 · register</span>
                  <span className="sa-chip nfr">NFR-001 · auth</span>
                  <span className="sa-chip">CON-003</span>
                  <span className="sa-chip">ASM-004</span>
                  <span className="sa-chip">INT-005 · STK-006</span>
                </div>
              </article>

              <article className="station" data-stage="04">
                <div className="station-num">04</div>
                <h3>Quality Analysis</h3>
                <p>Ambiguity, duplicates and conflicts are flagged with explanations and suggestions — never silently fixed.</p>
                <div className="station-art">
                  <span className="sa-warn">“The system should be fast.” → <b>AMBIGUOUS</b></span>
                  <span className="sa-dup">FR-002 ↔ FR-004 · 92% similar</span>
                  <span className="sa-conflict">REQ-001 ⚡ REQ-002 · conflict</span>
                </div>
              </article>

              <article className="station" data-stage="05">
                <div className="station-num">05</div>
                <h3>FR / NFR Classification</h3>
                <p>Functional vs non-functional — split across 12 NFR categories. Manual correction is always allowed.</p>
                <div className="station-art">
                  <span className="sa-chip fr">FUNCTIONAL ×3</span>
                  <span className="sa-chip nfr">PERFORMANCE</span>
                  <span className="sa-chip nfr">SECURITY</span>
                  <span className="sa-chip dim">USABILITY · SCALABILITY · RELIABILITY</span>
                </div>
              </article>

              <article className="station" data-stage="06">
                <div className="station-num">06</div>
                <h3>Validation</h3>
                <p>Every requirement is scored on clarity, correctness, consistency and testability — VALID · NEEDS_REVIEW · INVALID.</p>
                <div className="station-art">
                  <span className="sa-score"><i style={{ '--v': '96%' }} /><span>Clarity <b>96</b></span></span>
                  <span className="sa-score"><i style={{ '--v': '91%' }} /><span>Testability <b>91</b></span></span>
                  <span className="sa-score"><i style={{ '--v': '98%' }} /><span>Consistency <b>98</b></span></span>
                  <span className="sa-chip ok">ISO 29148 SCORE · 4.6/5</span>
                </div>
              </article>

              <article className="station" data-stage="07">
                <div className="station-num">07</div>
                <h3>RAG Context Retrieval</h3>
                <p>384-dimensional embeddings and semantic search pull everything you&apos;ve said into context. The AI never invents.</p>
                <div className="station-art">
                  <span className="sa-chip">BAAI/bge-small-en-v1.5</span>
                  <span className="sa-chip dim">chunk → embed → vector → search</span>
                  <span className="sa-chip ok">no hallucinated requirements</span>
                </div>
              </article>

              <article className="station" data-stage="08">
                <div className="station-num">08</div>
                <h3>SRS Generation</h3>
                <p>Sections 1–6 plus Appendices A, B and C — generated against your exact template, numbering preserved, section by section.</p>
                <div className="station-art doc-mini">
                  <span>1. Introduction</span><span>2. Overall Description</span><span>3. System Features</span><span>4. External Interfaces</span><span>5. Nonfunctional Reqs</span><span>6. Other Requirements</span><span>App. A · B · C</span>
                </div>
              </article>

              <article className="station" data-stage="09">
                <div className="station-num">09</div>
                <h3>Review &amp; Approval</h3>
                <p>Human in the loop. The AI suggests, drafts and recommends — important changes require your approval. Always.</p>
                <div className="station-art">
                  <span className="sa-chip ok">Generate ✓</span>
                  <span className="sa-chip">Save ✓</span>
                  <span className="sa-chip">Validate ✓</span>
                  <span className="sa-chip glow-chip">Approve → v1.0</span>
                </div>
              </article>

              <article className="station" data-stage="10">
                <div className="station-num">10</div>
                <h3>Traceability</h3>
                <p>A 5-tier bidirectional matrix ties user input → message → requirement → feature → section → version.</p>
                <div className="station-art trace-mini">
                  <span>USER-MSG-042</span><i>→</i><span>FR-007</span><i>→</i><span>3.1 Event Registration</span><i>→</i><span>§3.1.3</span><i>→</i><span>v1.0</span>
                </div>
              </article>

              <article className="station" data-stage="11">
                <div className="station-num">11</div>
                <h3>Change Control</h3>
                <p>One requirement changes — only the affected sections update. v1.0 → v1.1, nothing is ever overwritten.</p>
                <div className="station-art diff-mini">
                  <span className="dm-old">FR-002 · Students shall register.</span>
                  <span className="dm-new">FR-002 · Registration requires admin approval.</span>
                </div>
              </article>

              <article className="station" data-stage="12">
                <div className="station-num">12</div>
                <h3>Export &amp; Deliver</h3>
                <p>PDF and DOCX — template-exact, revision history intact, appendices complete. Done.</p>
                <div className="station-art">
                  <span className="sa-file">SRS_v1.1.pdf</span>
                  <span className="sa-file">SRS_v1.1.docx</span>
                  <span className="sa-chip ok">revision history ✓</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ LIVE DEMO ═══════ */}
      <section id="demo" className="section">
        <div className="wrap">
          <div className="demo-head">
            <div>
              <p className="eyebrow" data-reveal>LIVE DEMO · COLLEGE EVENT MANAGEMENT SYSTEM</p>
              <h2 className="h2" data-reveal>Watch the AI <span className="gradient-text">do the work.</span></h2>
            </div>
          </div>
          <LiveDemo />
        </div>
      </section>

      {/* ═══════ CAPABILITIES ═══════ */}
      <section id="capabilities" className="section">
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">CAPABILITIES</p>
            <h2 className="h2">Five pillars. <span className="gradient-text">Zero guesswork.</span></h2>
          </div>
          <div className="caps-grid">
            <article className="cap-card tilt-card" data-reveal>
              <span className="cap-num">01</span>
              <h3>9-Stage Controlled Elicitation</h3>
              <p>Strict sequential lifecycle with stage-gating and Context Guard. No freewheeling — every answer feeds the next stage.</p>
              <div className="cap-tags"><span>Stage-gated</span><span>Context Guard</span><span>EN · HI · Hinglish</span></div>
              <div className="cap-glow" />
            </article>
            <article className="cap-card tilt-card" data-reveal>
              <span className="cap-num">02</span>
              <h3>Quality &amp; Ambiguity Audit</h3>
              <p>Heuristic non-verifiable word detection, semantic conflict analysis and vector-based duplicate catching at 92% similarity.</p>
              <div className="cap-tags"><span>Duplicate detect</span><span>Conflict detect</span><span>Cosine similarity</span></div>
              <div className="cap-glow" />
            </article>
            <article className="cap-card tilt-card" data-reveal>
              <span className="cap-num">03</span>
              <h3>ISO 29148 Verification</h3>
              <p>Completeness, consistency, singularity and testability — scored per requirement, not guessed.</p>
              <div className="cap-tags"><span>ISO/IEC/IEEE 29148:2018</span><span>IEEE 830-1998</span><span>Score 4.6/5</span></div>
              <div className="cap-glow" />
            </article>
            <article className="cap-card tilt-card" data-reveal>
              <span className="cap-num">04</span>
              <h3>Exact-Template SRS Generation</h3>
              <p>IEEE Sections 1–6 plus Appendices A, B and C. The uploaded template is the source of truth — numbering preserved.</p>
              <div className="cap-tags"><span>Template-exact</span><span>PDF</span><span>DOCX</span></div>
              <div className="cap-glow" />
            </article>
            <article className="cap-card tilt-card" data-reveal>
              <span className="cap-num">05</span>
              <h3>Traceability &amp; Change Control</h3>
              <p>5-tier bidirectional matrix. Semantic diff viewer. Incremental v1.0 → v1.1 updates that never overwrite history.</p>
              <div className="cap-tags"><span>5-tier matrix</span><span>Semantic diff</span><span>Versioned</span></div>
              <div className="cap-glow" />
            </article>
            <article className="cap-card cap-card-wide tilt-card" data-reveal>
              <span className="cap-num">✦</span>
              <div>
                <h3>Anti-Hallucination by Design</h3>
                <p>No invented requirements, stakeholders, APIs, performance numbers or references. Missing information becomes <code>TBD — Needs Clarification</code>. RAG retrieves — it never imagines.</p>
                <div className="cap-tags"><span>RAG-grounded</span><span>Zod-validated output</span><span>Human approval gate</span></div>
              </div>
              <div className="cap-glow" />
            </article>
          </div>
        </div>
      </section>

      {/* ═══════ TRACEABILITY ═══════ */}
      <section id="traceability" className="section">
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">TRACEABILITY</p>
            <h2 className="h2">Every word. <span className="gradient-text">Accounted for.</span></h2>
            <p className="lead">From your first chat message to the final exported PDF — nothing floats, nothing is invented, everything links back.</p>
          </div>
          <div className="trace-visual" data-reveal>
            <svg id="trace-svg" viewBox="0 0 1120 320" fill="none" aria-hidden="true">
              <path id="trace-path" d="M60 160 H180 C210 160 210 160 220 150 L340 90 C350 80 370 80 380 90 L480 160 C490 170 510 170 520 160 L600 90 C610 80 630 80 640 90 L740 160 C750 170 770 170 780 160 L860 90 C870 80 890 80 900 90 L980 160 C990 170 1010 170 1020 160 H1080" stroke="url(#trace-grad)" strokeWidth="2.5" />
              <defs>
                <linearGradient id="trace-grad" x1="0" y1="0" x2="1120" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#38e8ff" /><stop offset=".55" stopColor="#8b7bff" /><stop offset="1" stopColor="#38e8ff" />
                </linearGradient>
              </defs>
            </svg>
            <div className="trace-steps">
              <div className="trace-step"><span className="ts-idx">1</span><b>User Input</b><em>“Students will register for events”</em></div>
              <div className="trace-step"><span className="ts-idx">2</span><b>Interview Message</b><em>USER-MSG-042</em></div>
              <div className="trace-step"><span className="ts-idx">3</span><b>Requirement ID</b><em>FR-007</em></div>
              <div className="trace-step"><span className="ts-idx">4</span><b>System Feature</b><em>3.1 Event Registration</em></div>
              <div className="trace-step"><span className="ts-idx">5</span><b>SRS Section</b><em>3.1.3 Functional Reqs</em></div>
              <div className="trace-step"><span className="ts-idx">6</span><b>SRS Version</b><em>v1.0 → v1.1</em></div>
            </div>
          </div>
          <div className="standards-row" data-reveal>
            <div className="std-card"><b>ISO/IEC/IEEE 29148:2018</b><span>requirements engineering processes — aligned</span></div>
            <div className="std-card"><b>IEEE 830-1998</b><span>recommended practice for SRS — aligned</span></div>
            <div className="std-card"><b>Research-informed</b><span>LLM-based SRS evaluation · trace-to-source · deterministic pipelines</span></div>
          </div>
        </div>
      </section>

      {/* ═══════ TECH STACK ═══════ */}
      <section id="stack" className="section">
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">TECH STACK</p>
            <h2 className="h2">Built to run <span className="gradient-text">local &amp; private.</span></h2>
          </div>
          <div className="stack-grid" data-reveal>
            <div className="stack-col">
              <h4>Frontend</h4>
              <ul>
                <li><span className="st-dot cyan" />Next.js · App Router</li>
                <li><span className="st-dot violet" />React · JSX</li>
                <li><span className="st-dot cyan" />Tailwind CSS</li>
                <li><span className="st-dot violet" />Lucide Icons</li>
              </ul>
            </div>
            <div className="stack-col">
              <h4>Backend</h4>
              <ul>
                <li><span className="st-dot cyan" />Node.js · Express</li>
                <li><span className="st-dot violet" />MongoDB · Mongoose</li>
                <li><span className="st-dot cyan" />JWT · bcrypt · Helmet</li>
                <li><span className="st-dot violet" />REST API · rate-limited</li>
              </ul>
            </div>
            <div className="stack-col">
              <h4>AI Engine</h4>
              <ul>
                <li><span className="st-dot cyan" />Ollama · CodeLlama 7B</li>
                <li><span className="st-dot violet" />BAAI/bge-small-en-v1.5</li>
                <li><span className="st-dot cyan" />384-dim embeddings</li>
                <li><span className="st-dot violet" />RAG · MongoDB vector search</li>
              </ul>
            </div>
            <div className="stack-col">
              <h4>Agents</h4>
              <ul>
                <li><span className="st-dot cyan" />InterviewAgent</li>
                <li><span className="st-dot violet" />Extraction · Analysis</li>
                <li><span className="st-dot cyan" />Classification · Validation</li>
                <li><span className="st-dot violet" />SRS Generation · Review · Update</li>
              </ul>
            </div>
          </div>
          <p className="stack-note" data-reveal>Fully local LLM via Ollama — your requirements never leave your machine.</p>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section id="cta" className="section">
        <div className="wrap">
          <div className="cta-inner" data-reveal>
            <div className="cta-orb" aria-hidden="true" />
            <p className="eyebrow">READY WHEN YOU ARE</p>
            <h2 className="h2">Write requirements that<br /><span className="gradient-text">survive review.</span></h2>
            <p className="lead">Stop rewriting SRS documents by hand. Interview, extract, validate, generate, version — one platform.</p>
            {user ? (
              <Link className="btn btn-primary btn-lg magnetic" href="/dashboard" data-cursor="link">Open Dashboard</Link>
            ) : (
              <Link className="btn btn-primary btn-lg magnetic" href="/register" data-cursor="link">Launch IntelliSDLC AI</Link>
            )}
            <p className="cta-note">Runs fully local · ISO/IEC/IEEE 29148:2018 &amp; IEEE 830-1998 aligned · PDF/DOCX export</p>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer id="footer">
        <div className="wrap footer-row">
          <div className="footer-brand">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" width="22" height="22"><path d="M7 22 L12.5 9.5 L15.5 17 L18.5 9.5 L25 22" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span>IntelliSDLC <em>AI</em></span>
            <p>Requirements engineering, engineered.<br />AI-powered · human-approved.</p>
          </div>
          <div className="footer-links">
            <a href="#about">Platform</a>
            <a href="#journey">Journey</a>
            <a href="#demo">Live Demo</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#stack">Stack</a>
          </div>
          <div className="footer-note">
            <span>© 2026 IntelliSDLC AI</span>
            <span>ISO/IEC/IEEE 29148:2018 &amp; IEEE 830-1998 aligned</span>
            <span>No requirements were hallucinated in the making of this page.</span>
          </div>
        </div>
      </footer>

      {/* custom cursor */}
      <div id="cursor-dot" aria-hidden="true" />
      <div id="cursor-ring" aria-hidden="true" />
    </div>
  );
}
