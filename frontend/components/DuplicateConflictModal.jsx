'use client';

import React from 'react';
import Modal from './Modal';
import { AlertCircle, GitMerge, Check, X, ShieldAlert } from 'lucide-react';

export default function DuplicateConflictModal({ isOpen, onClose, issue, onResolve }) {
  if (!issue) return null;

  const isDuplicate = issue.issueType === 'DUPLICATE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDuplicate ? 'Potential Duplicate Requirement Detected' : 'Requirement Conflict Resolution'}
    >
      <div className="space-y-6">
        {/* Severity Banner */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${isDuplicate ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
          {isDuplicate ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />}
          <div>
            <div className="font-semibold text-xs uppercase tracking-wider mb-1">
              {isDuplicate ? `Semantic Similarity: ${issue.similarityScore ? (issue.similarityScore * 100).toFixed(0) : '85'}%` : 'Rule Contradiction'}
            </div>
            <p className="text-xs text-slate-200">{issue.description}</p>
          </div>
        </div>

        {/* Affected Requirement IDs */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Affected Requirements</h4>
          <div className="flex gap-2">
            {(issue.relatedRequirementIds || []).map(id => (
              <span key={id} className="px-3 py-1 bg-slate-800 border border-slate-700 text-brand-400 font-mono text-xs rounded-lg font-bold">
                {id}
              </span>
            ))}
          </div>
        </div>

        {/* AI Suggested Resolution */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">AI Recommendation</h4>
          <p className="text-xs text-slate-300 leading-relaxed">{issue.suggestedResolution || 'Review both specifications to clarify scope boundaries.'}</p>
        </div>

        {/* Decision Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => onResolve(issue._id, 'IGNORED', 'Kept both specifications independently.')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Keep Both
          </button>
          <button
            onClick={() => onResolve(issue._id, 'MERGED', 'Merged duplicate specifications into primary requirement.')}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-brand-500/20"
          >
            <GitMerge className="w-4 h-4" />
            Merge Requirements
          </button>
          <button
            onClick={() => onResolve(issue._id, 'RESOLVED', 'Resolved conflicts according to stakeholder specifications.')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark Resolved
          </button>
        </div>
      </div>
    </Modal>
  );
}
