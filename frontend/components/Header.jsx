'use client';

import React from 'react';
import AIStatusIndicator from './AIStatusIndicator';

export default function Header({ title, subtitle, project = null, actions = null }) {
  return (
    <header className="min-h-14 border-b border-slate-200 bg-white px-4 md:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0 shadow-subtle">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">{title}</h1>
          {project && (
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono font-medium">
              {project.projectId || project.projectName}
            </span>
          )}
        </div>
        {subtitle && <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Real-Time AI Status indicator */}
        <div className="hidden lg:block"><AIStatusIndicator /></div>

        {actions}
      </div>
    </header>
  );
}
