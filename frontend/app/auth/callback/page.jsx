'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const processToken = async () => {
      const token = searchParams.get('token');
      const err = searchParams.get('error');

      if (err) {
        setError(decodeURIComponent(err));
        return;
      }

      if (!token) {
        setError('No authentication token received from provider.');
        return;
      }

      try {
        if (handleOAuthToken) {
          await handleOAuthToken(token);
        } else {
          localStorage.setItem('token', token);
        }
        router.replace('/dashboard');
      } catch (e) {
        console.error('OAuth processing failed:', e);
        setError('Failed to establish session. Please try signing in again.');
      }
    };

    processToken();
  }, [searchParams, router, handleOAuthToken]);

  if (error) {
    return (
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Authentication Failed</h2>
          <p className="text-xs text-rose-300 mt-2">{error}</p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/20">
        <Sparkles className="w-7 h-7 text-slate-950" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Completing Secure Sign In</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying your OAuth credentials and preparing workspace...</p>
      </div>
      <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs py-4">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Authenticating...</span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-brand-500/30">
      <Suspense fallback={
        <div className="text-slate-400 text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Loading...</span>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
