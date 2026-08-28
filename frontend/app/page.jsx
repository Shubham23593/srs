'use client';

import dynamic from 'next/dynamic';

const LandingPage = dynamic(() => import('../components/landing/LandingPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <span className="text-sm font-medium tracking-wide">Initializing IntelliSDLC AI...</span>
      </div>
    </div>
  )
});

export default function Page() {
  return <LandingPage />;
}
