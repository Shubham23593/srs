'use client';

import React from 'react';
import { ArrowRight, Layers, MessageSquare, Tag, FileText, CheckCircle } from 'lucide-react';

export default function TraceabilityGraph({ matrixData = [] }) {
  if (!matrixData || matrixData.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Traceability Dependency Chain</h3>
          <p className="text-xs text-slate-500">Step-by-step lineage from stakeholder interview to versioned SRS baseline.</p>
        </div>
      </div>

      <div className="space-y-4">
        {matrixData.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            {/* Source */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-mono text-[11px]">{item.source || 'USER-MSG'}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Requirement */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 shadow-2xs">
              <Tag className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-mono font-bold">{item.requirementId}</span>
              <span className="text-slate-700 truncate max-w-[140px] font-medium">({item.requirementTitle})</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Feature */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Feature {item.systemFeature || '3.1'}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* SRS Section */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 shadow-2xs">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono">Section {item.srsSection || '3.1.3'}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Version */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 shadow-2xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono font-bold">SRS v{item.version || '1.0'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
