'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@intellisdlc.ai');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-brand-500/30">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/20 mb-3">
          <Sparkles className="w-7 h-7 text-slate-950" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">IntelliSDLC AI</h1>
        <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest">
          Software Requirements Engineering Platform
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Sign In to Your Workspace</h2>
          <p className="text-xs text-slate-400 mt-1">
            Access requirements engineering projects, AI interview logs, and SRS baselines.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials Fill */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-brand-400 hover:text-brand-300 font-semibold"
          >
            Fill Demo Credentials
          </button>

          <Link href="/register" className="text-slate-400 hover:text-white font-medium">
            Create Account →
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-6">
        Conforms to ISO/IEC/IEEE 29148:2018 & IEEE 830-1998 Standards
      </p>
    </div>
  );
}
