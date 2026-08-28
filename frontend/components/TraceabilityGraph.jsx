'use client';

import React from 'react';
import { ArrowRight, Layers, MessageSquare, Tag, FileText, CheckCircle } from 'lucide-react';

export default function TraceabilityGraph({ matrixData = [] }) {
  if (!matrixData || matrixData.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Traceability Dependency Chain</h3>
          <p className="text-xs text-slate-400">Step-by-step lineage from stakeholder interview to versioned SRS baseline.</p>
        </div>
      </div>

      <div className="space-y-4">
        {matrixData.map((item, idx) => (
          <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            {/* Source */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-[11px]">{item.source || 'USER-MSG'}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Requirement */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg text-brand-300">
              <Tag className="w-3.5 h-3.5 text-brand-400" />
              <span className="font-mono font-bold">{item.requirementId}</span>
              <span className="text-slate-300 truncate max-w-[140px] font-medium">({item.requirementTitle})</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Feature */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Feature {item.systemFeature || '3.1'}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* SRS Section */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">Section {item.srsSection || '3.1.3'}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            {/* Version */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold">SRS v{item.version || '1.0'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
