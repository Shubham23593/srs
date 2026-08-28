'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Database, FileDown } from 'lucide-react';
import api from '../lib/api';

export default function Header({ title, subtitle, project = null, actions = null }) {
  const [aiOnline, setAiOnline] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.get('/health');
        setAiOnline(true);
      } catch (e) {
        setAiOnline(false);
      }
    };
    checkHealth();
  }, []);

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

      <div className="flex items-center gap-4">
        {/* Ollama AI Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
          <div className={`w-2 h-2 rounded-full ${aiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300 font-medium">Ollama: codellama:7b</span>
        </div>

        {actions}
      </div>
    </header>
  );
}
