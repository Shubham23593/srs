'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero3D — the glowing "neural core" rendered behind the hero text.
 * Wireframe icosahedron + vertex particles + orbiting data flecks + beams.
 */
export default function Hero3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer, scene, camera, core, coreWire, particles, flecks, beams, rings;
    let raf = 0;
    let mouseX = 0, mouseY = 0, tx = 0, ty = 0;
    let introTween = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- setup ---------- */
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060e, 0.045);

    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    camera.position.set(0, 0, 7.2);

    const COL_A = new THREE.Color('#38e8ff');
    const COL_B = new THREE.Color('#8b7bff');
    const COL_C = new THREE.Color('#3df0b0');

    /* ---------- core group ---------- */
    core = new THREE.Group();
    scene.add(core);

    const icoGeo = new THREE.IcosahedronGeometry(1.28, 1);
    const icoMat = new THREE.MeshBasicMaterial({ color: 0x1b2350, wireframe: true, transparent: true, opacity: 0.32 });
    coreWire = new THREE.Mesh(icoGeo, icoMat);
    core.add(coreWire);

    const innerGeo = new THREE.IcosahedronGeometry(0.86, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x2b3a8f, wireframe: true, transparent: true, opacity: 0.22,
    });
    core.add(new THREE.Mesh(innerGeo, innerMat));

    // glowing vertex particles on the core surface
    const vCount = 620;
    const vPositions = new Float32Array(vCount * 3);
    const vColors = new Float32Array(vCount * 3);
    const vBase = new Float32Array(vCount * 3);
    const vPhase = new Float32Array(vCount);
    for (let i = 0; i < vCount; i++) {
      const p = new THREE.Vector3().randomDirection().multiplyScalar(1.29);
      p.toArray(vPositions, i * 3);
      p.toArray(vBase, i * 3);
      const c = Math.random() < 0.7 ? COL_A : COL_B;
      c.toArray(vColors, i * 3);
      vPhase[i] = Math.random() * Math.PI * 2;
    }
    const vGeo = new THREE.BufferGeometry();
    vGeo.setAttribute('position', new THREE.BufferAttribute(vPositions, 3));
    vGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));
    const vMat = new THREE.PointsMaterial({
      size: 0.045, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    particles = new THREE.Points(vGeo, vMat);
    core.add(particles);

    // data flecks floating around the core
    const fCount = 420;
    const fPositions = new Float32Array(fCount * 3);
    const fBase = new Float32Array(fCount * 3);
    const fPhase = new Float32Array(fCount);
    const fSpeed = new Float32Array(fCount);
    for (let i = 0; i < fCount; i++) {
      const r = 2.1 + Math.random() * 3.6;
      const dir = new THREE.Vector3().randomDirection().multiplyScalar(r);
      dir.toArray(fPositions, i * 3);
      dir.toArray(fBase, i * 3);
      fPhase[i] = Math.random() * Math.PI * 2;
      fSpeed[i] = 0.15 + Math.random() * 0.4;
    }
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.BufferAttribute(fPositions, 3));
    const fMat = new THREE.PointsMaterial({
      size: 0.032, color: 0x6fd7ff, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    flecks = new THREE.Points(fGeo, fMat);
    scene.add(flecks);

    // light beams radiating from the core
    const bCount = 46;
    const bGroup = new THREE.Group();
    const bMat = new THREE.LineBasicMaterial({
      color: 0x4d8dff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < bCount; i++) {
      const dir = new THREE.Vector3().randomDirection();
      const len = 2.1 + Math.random() * 1.9;
      const g = new THREE.BufferGeometry().setFromPoints([
        dir.clone().multiplyScalar(1.45),
        dir.clone().multiplyScalar(len),
      ]);
      bGroup.add(new THREE.Line(g, bMat));
    }
    core.add(bGroup);
    beams = bGroup;

    // orbit rings (world-space, tilted)
    rings = new THREE.Group();
    const makeRing = (radius, color, opacity) => {
      const g = new THREE.RingGeometry(radius - 0.004, radius + 0.004, 128);
      const m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      return new THREE.Mesh(g, m);
    };
    const r1 = makeRing(2.4, 0x38e8ff, 0.13); r1.rotation.x = Math.PI / 2.3;
    const r2 = makeRing(3.0, 0x8b7bff, 0.1); r2.rotation.x = Math.PI / 1.9; r2.rotation.y = 0.5;
    const r3 = makeRing(1.9, 0x3df0b0, 0.09); r3.rotation.x = Math.PI / 2.6; r3.rotation.y = -0.7;
    rings.add(r1, r2, r3);
    scene.add(rings);

    /* ---------- resize ---------- */
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    /* ---------- input ---------- */
    const onPointer = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    /* ---------- loop ---------- */
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const scroll = typeof window !== 'undefined' ? window.scrollY : 0;

      tx += (mouseX * 0.35 - tx) * 0.04;
      ty += (mouseY * 0.25 - ty) * 0.04;

      core.rotation.y = t * 0.12 + tx * 0.5;
      core.rotation.x = Math.sin(t * 0.1) * 0.2 + ty * 0.4;

      coreWire.rotation.y = t * 0.05;
      coreWire.rotation.z = t * 0.03;

      rings.rotation.z = t * 0.04;
      rings.rotation.y = t * 0.06;
      rings.rotation.x = Math.sin(t * 0.12) * 0.25;

      beams.rotation.z = -t * 0.05;
      bMat.opacity = 0.11 + Math.sin(t * 0.8) * 0.035;

      // vertex particles breathe
      const pAttr = vGeo.attributes.position;
      for (let i = 0; i < vCount; i++) {
        const s = 1 + Math.sin(t * 0.9 + vPhase[i]) * 0.05;
        pAttr.array[i * 3] = vBase[i * 3] * s;
        pAttr.array[i * 3 + 1] = vBase[i * 3 + 1] * s;
        pAttr.array[i * 3 + 2] = vBase[i * 3 + 2] * s;
      }
      pAttr.needsUpdate = true;

      // flecks drift
      const fAttr = fGeo.attributes.position;
      for (let i = 0; i < fCount; i++) {
        const ang = t * fSpeed[i] + fPhase[i];
        const s = 1 + Math.sin(ang) * 0.22;
        fAttr.array[i * 3] = fBase[i * 3] * s;
        fAttr.array[i * 3 + 1] = fBase[i * 3 + 1] * Math.cos(ang * 0.7);
        fAttr.array[i * 3 + 2] = fBase[i * 3 + 2] * s;
      }
      fAttr.needsUpdate = true;

      // scroll parallax
      camera.position.y = -scroll * 0.0016;
      camera.position.z = 7.2 - scroll * 0.0012;

      renderer.render(scene, camera);
    };

    if (reduced) {
      renderer.render(scene, camera); // single static frame
    } else {
      animate();
    }

    /* ---------- intro (triggered by the preloader) ---------- */
    let gsap = null;
    try { gsap = require('gsap'); } catch (e) { gsap = null; }

    const onReady = () => {
      if (!introTween && gsap && !reduced) {
        introTween = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .to(camera.position, { z: 7.2, duration: 2.4, ease: 'power2.out' }, 0)
          .fromTo(core.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 2.2, ease: 'expo.out' }, 0.1)
          .fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.4 }, 0.2);
      }
      if (!gsap) canvas.style.opacity = '1';
    };
    if (!reduced) {
      camera.position.set(0, 0, 8.6);
      window.addEventListener('landing:ready', onReady, { once: true });
    } else {
      canvas.style.opacity = '1';
    }

    /* ---------- cleanup ---------- */
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('landing:ready', onReady);
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (introTween) introTween.kill();
      const dispose = (obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      };
      [coreWire, particles, flecks, rings, core, scene].forEach((o) => {
        if (!o) return;
        o.traverse && o.traverse(dispose);
        o.geometry && dispose(o);
        o.material && dispose(o);
      });
      renderer.dispose();
    };
  }, []);

  return <canvas id="hero-canvas" ref={canvasRef} aria-hidden="true" />;
}
