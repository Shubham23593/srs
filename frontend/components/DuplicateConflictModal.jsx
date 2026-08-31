'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { AlertCircle, GitMerge, Check, X, ShieldAlert, Edit3, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

export default function DuplicateConflictModal({ isOpen, onClose, issue, onResolve }) {
  const [activeTab, setActiveTab] = useState('MERGE'); // 'MERGE' | 'KEEP_BOTH' | 'EDIT' | 'RESOLVE'
  const [mergedDescription, setMergedDescription] = useState('');
  const [mergedTitle, setMergedTitle] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editText, setEditText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (issue) {
      setMergedDescription(issue.suggestedMerge || issue.suggestedResolution || '');
      setMergedTitle(issue.relatedRequirementIds ? `Unified ${issue.relatedRequirementIds.join(' & ')} Capability` : 'Unified Requirement');
      setEditTarget(issue.relatedRequirementIds?.[0] || '');
      setResolutionNotes('');
      setActiveTab(issue.issueType === 'DUPLICATE' ? 'MERGE' : 'RESOLVE');
    }
  }, [issue]);

  if (!issue) return null;

  const isDuplicate = issue.issueType === 'DUPLICATE';
  const isConflict = issue.issueType === 'RULE_CONFLICT' || issue.issueType === 'CONFLICT';
  const relatedIds = issue.relatedRequirementIds || [];

  const handleMergeSubmit = () => {
    onResolve(issue._id, 'MERGED', {
      resolutionType: 'MERGE',
      mergedTitle,
      mergedDescription,
      resolutionNotes: resolutionNotes || 'Merged duplicate requirements into unified specification.'
    });
  };

  const handleKeepBothSubmit = () => {
    onResolve(issue._id, 'IGNORED', {
      resolutionType: 'KEEP_BOTH',
      resolutionNotes: resolutionNotes || 'Kept both specifications independently per stakeholder decision.'
    });
  };

  const handleEditSubmit = () => {
    onResolve(issue._id, 'RESOLVED', {
      resolutionType: 'EDIT',
      targetRequirementId: editTarget,
      updatedDescription: editText,
      resolutionNotes: resolutionNotes || `Requirement ${editTarget} modified in-place to resolve issue.`
    });
  };

  const handleMarkResolvedSubmit = () => {
    onResolve(issue._id, 'RESOLVED', {
      resolutionType: 'MARK_RESOLVED',
      resolutionNotes: resolutionNotes || 'Issue resolved per stakeholder review.'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDuplicate ? 'Semantic Duplicate Resolution' : isConflict ? 'Rule Conflict Resolution' : 'Requirement Issue Resolution'}
    >
      <div className="space-y-5 max-w-2xl">
        {/* Severity Banner & AI Explanation */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isDuplicate ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {isDuplicate ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="font-semibold text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{isDuplicate ? `Similarity Score: ${issue.similarityScore ? Math.round(issue.similarityScore * 100) : 88}%` : 'Contradiction / Conflict'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700 font-mono">
                {issue.issueType}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed mb-2">{issue.description}</p>
            {issue.explanation && (
              <div className="text-[11px] text-amber-200/90 bg-amber-950/40 p-2 rounded border border-amber-500/20">
                <strong>AI Explanation:</strong> {issue.explanation}
              </div>
            )}
          </div>
        </div>

        {/* Affected Requirements Badges */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Affected Requirements</h4>
          <div className="flex flex-wrap gap-2">
            {relatedIds.map(id => (
              <span key={id} className="px-3 py-1 bg-slate-800 border border-slate-700 text-brand-400 font-mono text-xs rounded-lg font-bold">
                {id}
              </span>
            ))}
          </div>
        </div>

        {/* Resolution Tabs */}
        <div className="flex border-b border-slate-800 gap-2 pb-1">
          {isDuplicate && (
            <button
              onClick={() => setActiveTab('MERGE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'MERGE' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Merge Requirements
            </button>
          )}
          <button
            onClick={() => setActiveTab('KEEP_BOTH')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'KEEP_BOTH' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Keep Both
          </button>
          <button
            onClick={() => setActiveTab('EDIT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'EDIT' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Edit Requirement
          </button>
          <button
            onClick={() => setActiveTab('RESOLVE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'RESOLVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mark Resolved
          </button>
        </div>

        {/* Tab 1: MERGE FORM */}
        {activeTab === 'MERGE' && (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Proposed Unified Statement (Editable)
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Unified Title</label>
              <input
                type="text"
                value={mergedTitle}
                onChange={(e) => setMergedTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Normalized Description</label>
              <textarea
                value={mergedDescription}
                onChange={(e) => setMergedDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 leading-relaxed font-sans"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Merging will update primary requirement <strong>{relatedIds[0]}</strong> with source <span className="text-amber-300 font-mono">AI_MERGED</span> and archive secondary duplicates.
            </p>
          </div>
        )}

        {/* Tab 2: KEEP BOTH */}
        {activeTab === 'KEEP_BOTH' && (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-300 leading-relaxed">
              Both requirements ({relatedIds.join(', ')}) will be preserved in the catalog as distinct specifications.
            </p>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Stakeholder Justification (Optional)</label>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g., Distinct scope boundaries confirmed by product owner."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Tab 3: EDIT IN-PLACE */}
        {activeTab === 'EDIT' && (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Select Requirement to Edit</label>
              <select
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {relatedIds.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Updated Statement</label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="The system shall ..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Tab 4: RESOLVE */}
        {activeTab === 'RESOLVE' && (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-emerald-400">AI Suggested Resolution:</span>
              <p className="mt-1 leading-relaxed text-slate-300">{issue.suggestedResolution || 'Review both specifications to clarify scope boundaries.'}</p>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Resolution Notes</label>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g., Reviewed with stakeholder and validated."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'MERGE' && (
            <button
              onClick={handleMergeSubmit}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/20 transition-all"
            >
              <GitMerge className="w-4 h-4" />
              Confirm & Merge
            </button>
          )}
          {activeTab === 'KEEP_BOTH' && (
            <button
              onClick={handleKeepBothSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              Confirm Keep Both
            </button>
          )}
          {activeTab === 'EDIT' && (
            <button
              onClick={handleEditSubmit}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              Save In-Place Edit
            </button>
          )}
          {activeTab === 'RESOLVE' && (
            <button
              onClick={handleMarkResolvedSubmit}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
