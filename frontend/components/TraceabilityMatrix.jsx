'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function TraceabilityMatrix({ matrixData = [] }) {
  if (!matrixData || matrixData.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No Traceability Matrix Built Yet</h4>
        <p className="text-xs text-slate-400 mt-1">Generate or approve the SRS to construct complete forward and backward traceability links.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Bidirectional Traceability Matrix (BTM)</h3>
          <p className="text-xs text-slate-400">Verifies that every requirement is sourced from stakeholder input and mapped to SRS sections.</p>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs rounded-full font-bold">
          {matrixData.length} Linked Requirements
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3 border-b border-slate-700">Req ID</th>
              <th className="p-3 border-b border-slate-700">Requirement Title</th>
              <th className="p-3 border-b border-slate-700">Elicitation Source</th>
              <th className="p-3 border-b border-slate-700">System Feature</th>
              <th className="p-3 border-b border-slate-700">SRS Section</th>
              <th className="p-3 border-b border-slate-700">SRS Version</th>
              <th className="p-3 border-b border-slate-700">Verification Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {matrixData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 font-mono font-bold text-emerald-400">{row.requirementId}</td>
                <td className="p-3 font-medium text-white">{row.requirementTitle}</td>
                <td className="p-3 text-slate-400 font-mono text-[11px]">{row.source || 'User Input'}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                    {row.systemFeature || '3.1'}
                  </span>
                </td>
                <td className="p-3 font-mono text-brand-400">{row.srsSection || '3.1.3'}</td>
                <td className="p-3 font-mono text-slate-400">v{row.version || '1.0'}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-semibold">
                    {row.verificationMethod || 'TEST'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
