'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Database, Cpu } from 'lucide-react';
import { systemAPI } from '../lib/api';

export default function Header({ title, subtitle, project = null, actions = null }) {
  const [aiDetails, setAiDetails] = useState({ provider: 'ollama', connected: false, model: 'codellama:7b' });
  const [embedInfo, setEmbedInfo] = useState({ model: 'multilingual-e5-small', realModel: true });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await systemAPI.getAIHealth();
        if (res.data?.success && res.data.data) {
          const { ai, embedding } = res.data.data;
          if (ai) setAiDetails(ai);
          if (embedding) setEmbedInfo(embedding);
        }
      } catch (e) {
        // Keep initial state
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
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

      <div className="flex items-center gap-3">
        {/* Ollama AI Status indicator (Priority 11) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
            aiDetails.connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
          title={aiDetails.connected ? `Connected to Ollama (${aiDetails.model || 'codellama:7b'})` : 'Ollama offline – fallback pipeline active'}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${aiDetails.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-semibold">AI: {aiDetails.model || 'codellama:7b'}</span>
        </div>

        {/* Embedding Model indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
            embedInfo.realModel
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
          title={`Active Embedding Engine: ${embedInfo.model || 'Xenova/multilingual-e5-small'}`}
        >
          <Cpu className="w-3 h-3 text-purple-400" />
          <span className="font-mono">{embedInfo.realModel ? 'multilingual-e5' : 'deterministic'}</span>
        </div>

        {actions}
      </div>
    </header>
  );
}
