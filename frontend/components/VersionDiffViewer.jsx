'use client';

import React from 'react';
import { GitCommit, PlusCircle, RefreshCw, Trash2, ArrowRight } from 'lucide-react';

export default function VersionDiffViewer({ diffData, v1 = '1.0', v2 = '1.1', reason = '', summary = '' }) {
  if (!diffData) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        No comparative version diff data available.
      </div>
    );
  }

  const added = diffData.added || [];
  const modified = diffData.modified || [];
  const removed = diffData.removed || [];

  return (
    <div className="space-y-6">
      {/* Version Header Card */}
      <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-slate-800 rounded-lg text-slate-300 font-mono font-bold text-xs">
            v{v1}
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400" />
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 font-mono font-bold text-xs">
            v{v2}
          </div>
        </div>

        {reason && (
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Reason:</span> {reason}
          </div>
        )}
      </div>

      {summary && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
          <strong className="text-white block mb-1">Summary of Modifications:</strong>
          {summary}
        </div>
      )}

      {/* Delta Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Added Requirements */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
            <PlusCircle className="w-4 h-4" />
            Added Requirements ({added.length})
          </div>
          {added.length === 0 ? (
            <p className="text-xs text-slate-400 italic">None added</p>
          ) : (
            <div className="space-y-1.5">
              {added.map(id => (
                <div key={id} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs rounded">
                  + {id}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modified Requirements */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
            <RefreshCw className="w-4 h-4" />
            Modified Requirements ({modified.length})
          </div>
          {modified.length === 0 ? (
            <p className="text-xs text-slate-400 italic">None modified</p>
          ) : (
            <div className="space-y-1.5">
              {modified.map(id => (
                <div key={id} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs rounded">
                  Δ {id} (Admin Approval Added)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Removed Requirements */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">
            <Trash2 className="w-4 h-4" />
            Removed Requirements ({removed.length})
          </div>
          {removed.length === 0 ? (
            <p className="text-xs text-slate-400 italic">None deprecated</p>
          ) : (
            <div className="space-y-1.5">
              {removed.map(id => (
                <div key={id} className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs rounded">
                  - {id}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section Level Diff Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Section Changes (Section 3.1 & 3.1.3)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs space-y-1">
            <div className="font-bold text-rose-400 text-[11px] uppercase tracking-wider mb-2">Previous Version (v{v1})</div>
            <p className="text-slate-300"><strong>FR-002:</strong> Students shall register for available college events directly online without administrator approval gates.</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
            <div className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider mb-2">Updated Version (v{v2})</div>
            <p className="text-slate-300"><strong>FR-002:</strong> Students shall submit event registration requests, which shall require administrator approval before confirmation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
