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
      <div className="space-y-4 max-w-2xl text-slate-800">
        {/* Severity Banner & AI Explanation */}
        <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
          isDuplicate ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {isDuplicate ? <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" /> : <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{isDuplicate ? `Similarity Score: ${issue.similarityScore ? Math.round(issue.similarityScore * 100) : 88}%` : 'Contradiction / Conflict'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-700 font-medium">
                {issue.issueType}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed mb-2">{issue.description}</p>
            {issue.explanation && (
              <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                <strong>AI Diagnostic Note:</strong> {issue.explanation}
              </div>
            )}
          </div>
        </div>

        {/* Affected Requirements Badges */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Affected Requirements</h4>
          <div className="flex flex-wrap gap-1.5">
            {relatedIds.map(id => (
              <span key={id} className="px-2.5 py-0.5 bg-sky-50 border border-sky-200 text-sky-800 font-mono text-xs rounded-md font-bold">
                {id}
              </span>
            ))}
          </div>
        </div>

        {/* Resolution Tabs */}
        <div className="flex border-b border-slate-200 gap-1 pb-1">
          {isDuplicate && (
            <button
              onClick={() => setActiveTab('MERGE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'MERGE' ? 'bg-sky-50 text-sky-800 border border-sky-200 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Merge Requirements
            </button>
          )}
          <button
            onClick={() => setActiveTab('KEEP_BOTH')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'KEEP_BOTH' ? 'bg-blue-50 text-blue-800 border border-blue-200 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Keep Both
          </button>
          <button
            onClick={() => setActiveTab('EDIT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'EDIT' ? 'bg-purple-50 text-purple-800 border border-purple-200 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Edit Requirement
          </button>
          <button
            onClick={() => setActiveTab('RESOLVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'RESOLVE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mark Resolved
          </button>
        </div>

        {/* Tab 1: MERGE FORM */}
        {activeTab === 'MERGE' && (
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Proposed Unified Statement (Editable)
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Unified Title</label>
              <input
                type="text"
                value={mergedTitle}
                onChange={(e) => setMergedTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Normalized Description</label>
              <textarea
                value={mergedDescription}
                onChange={(e) => setMergedDescription(e.target.value)}
                rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed font-sans"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Merging will update primary requirement <strong className="text-slate-900">{relatedIds[0]}</strong> with source <span className="text-amber-800 font-mono">AI_MERGED</span> and archive secondary duplicates.
            </p>
          </div>
        )}

        {/* Tab 2: KEEP BOTH */}
        {activeTab === 'KEEP_BOTH' && (
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-700 leading-relaxed">
              Both requirements ({relatedIds.join(', ')}) will be preserved in the catalog as distinct specifications.
            </p>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Stakeholder Justification (Optional)</label>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g., Distinct scope boundaries confirmed by product owner."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: EDIT IN-PLACE */}
        {activeTab === 'EDIT' && (
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Select Requirement to Edit</label>
              <select
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {relatedIds.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Updated Statement</label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="The system shall ..."
                rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Tab 4: RESOLVE */}
        {activeTab === 'RESOLVE' && (
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-emerald-800">AI Suggested Resolution:</span>
              <p className="mt-1 leading-relaxed text-slate-700">{issue.suggestedResolution || 'Review both specifications to clarify scope boundaries.'}</p>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Resolution Notes</label>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g., Reviewed with stakeholder and validated."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'MERGE' && (
            <button
              onClick={handleMergeSubmit}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <GitMerge className="w-3.5 h-3.5" />
              Confirm & Merge
            </button>
          )}
          {activeTab === 'KEEP_BOTH' && (
            <button
              onClick={handleKeepBothSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Keep Both
            </button>
          )}
          {activeTab === 'EDIT' && (
            <button
              onClick={handleEditSubmit}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Save In-Place Edit
            </button>
          )}
          {activeTab === 'RESOLVE' && (
            <button
              onClick={handleMarkResolvedSubmit}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
