'use client';

import React from 'react';
import AIStatusIndicator from './AIStatusIndicator';

export default function Header({ title, subtitle, project = null, actions = null }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
          {project && (
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              {project.projectId || project.projectName}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Real-Time AI Status indicator */}
        <AIStatusIndicator />

        {actions}
      </div>
    </header>
  );
}
