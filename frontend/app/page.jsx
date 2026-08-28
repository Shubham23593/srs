'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  FileCheck2,
  GitBranch,
  LogIn,
  UserPlus,
  Plus
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-brand-500/20">
      {/* Top Navbar */}
      <nav className="h-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white block">IntelliSDLC AI</span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase">
              Software Requirements Engineering
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800/60 transition-colors"
              >
                Dashboard ({user.name})
              </Link>
              <Link
                href="/projects/new"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 font-bold text-xs hover:shadow-lg hover:shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 font-bold text-xs hover:shadow-lg hover:shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            ISO/IEC/IEEE 29148:2018 & IEEE 830 Standard Aligned
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            AI-Powered Software <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-emerald-300 to-teal-200">
              Requirements Engineering
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Follow a strict, step-by-step engineering flow: Project Definition → AI Interview → Atomic Requirement Extraction → Quality Audit (Ambiguity & Duplicates) → ISO/IEEE Validation → Exact-Template SRS Generation → Continuous Versioning (v1.0 → v1.1).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm shadow-xl shadow-brand-500/25 transition-all flex items-center gap-2"
              >
                Enter Engineering Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm shadow-xl shadow-brand-500/25 transition-all flex items-center gap-2"
                >
                  Sign In to Start
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">1. AI Interview & Extraction</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Targeted domain questioning with real-time atomic requirement extraction and confidence scoring.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">2. Exact SRS Template Fidelity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates IEEE compliant specifications adhering strictly to Sections 1–6 and Appendices A, B, and C with PDF/DOCX export.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">3. Incremental Change Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects affected requirements and sections, generates precise modifications, and tracks immutable version diffs.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-8 text-center text-xs text-slate-500">
        IntelliSDLC AI • Software Requirements Engineering Platform • Built with Next.js, Express, and Ollama
      </footer>
    </div>
  );
}
