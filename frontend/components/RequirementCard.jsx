'use client';

import React from 'react';
import StatusBadge from './StatusBadge';
import { Tag, AlertTriangle, HelpCircle, Copy, Swords, Edit2, Trash2, Archive, RefreshCw, Sparkles, User, GitMerge, FileCode } from 'lucide-react';

export default function RequirementCard({ requirement, onEdit, onDelete, onArchive, onRevalidate }) {
  const statement = requirement.normalizedDescription || requirement.description;
  const needsClarification = requirement.status === 'NEEDS_CLARIFICATION';
  const needsReview = requirement.status === 'NEEDS_REVIEW';
  const duplicates = requirement.duplicateCandidates || [];
  const conflicts = requirement.conflictReferences || [];
  const relevance = requirement.contextRelevance || { status: 'RELEVANT' };
  const source = requirement.source || 'AI_INTERVIEW';

  const sourceConfig = {
    MANUAL: { label: 'Manual Entry', icon: User, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    AI_INTERVIEW: { label: 'AI Interview', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    AI_ATOMIC_EXTRACTION: { label: 'Atomic Extraction', icon: Sparkles, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    AI_MERGED: { label: 'AI Merged', icon: GitMerge, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    IMPORTED: { label: 'Imported', icon: FileCode, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
  };

  const currentSource = sourceConfig[source] || sourceConfig.AI_INTERVIEW;
  const SourceIcon = currentSource.icon;

  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all ${requirement.archived
      ? 'opacity-60 border-slate-300 bg-slate-50'
      : relevance.status === 'CONTEXT_MISMATCH'
        ? 'border-rose-300 bg-rose-50/30'
        : needsClarification
          ? 'border-amber-300 bg-amber-50/20'
          : needsReview
            ? 'border-orange-300 bg-orange-50/20'
            : 'border-slate-200 hover:border-slate-300'
      }`}>
      <div>
        {/* Top Header: ID, Source Badge, Priority, Validation */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {requirement.requirementId}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${currentSource.color}`}>
              <SourceIcon className="w-3 h-3" />
              {currentSource.label}
            </span>
            <StatusBadge status={requirement.type} size="xs" />
            <StatusBadge status={requirement.priority} size="xs" />
          </div>

          <div className="flex items-center gap-1.5">
            {relevance.status === 'CONTEXT_MISMATCH' && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Scope Mismatch
              </span>
            )}
            <StatusBadge status={requirement.status || requirement.validationStatus} size="xs" />
          </div>
        </div>

        {/* Title and Statement */}
        <h3 className="font-bold text-sm text-slate-900 mb-2">{requirement.title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{statement}</p>

        {/* Subcategories & Metadata */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {requirement.nfrSubcategory && requirement.nfrSubcategory !== 'N/A' && (
            <span className="text-[10px] text-cyan-800 bg-cyan-100 px-1.5 py-0.5 rounded border border-cyan-300 font-bold">
              {requirement.nfrSubcategory}
            </span>
          )}
          {requirement.topicCluster && (
            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
              {requirement.topicCluster}
            </span>
          )}
          {requirement.mergedFrom && requirement.mergedFrom.length > 0 && (
            <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-bold">
              Merged from: {requirement.mergedFrom.join(', ')}
            </span>
          )}
        </div>

        {/* Context Relevance Warning Box */}
        {relevance.status === 'CONTEXT_MISMATCH' && relevance.reason && (
          <div className="flex gap-2 items-start bg-rose-50 border border-rose-200 rounded-lg p-2.5 mt-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-rose-800">Project Context Relevance Alert</div>
              <p className="text-[11px] text-rose-700 leading-snug">{relevance.reason}</p>
            </div>
          </div>
        )}

        {/* Clarification Alert */}
        {needsClarification && requirement.clarificationQuestion && (
          <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-snug">{requirement.clarificationQuestion}</p>
          </div>
        )}

        {/* Duplicates Alert */}
        {duplicates.length > 0 && (
          <div className="flex gap-2 items-start bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2">
            <Copy className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-orange-800 leading-snug">Possible semantic duplicate of: {duplicates.join(', ')}</p>
          </div>
        )}

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="flex gap-2 items-start bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2">
            <Swords className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-rose-800 leading-snug">Rule conflict with: {conflicts.join(', ')} — needs stakeholder resolution.</p>
          </div>
        )}
      </div>

      {/* Card Footer: Section Mapping & Actions */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 mt-3">
        <div className="flex items-center gap-1.5 truncate">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate font-medium">{requirement.targetSrsSection ? `§${requirement.targetSrsSection} · ` : ''}{requirement.category || 'Core'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {onRevalidate && (
            <button
              onClick={() => onRevalidate(requirement._id || requirement.requirementId)}
              className="p-1 text-slate-500 hover:text-emerald-600 transition-colors"
              title="Revalidate Requirement against Project Context"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onArchive && (
            <button
              onClick={() => onArchive(requirement._id || requirement.requirementId)}
              className={`p-1 transition-colors ${requirement.archived ? 'text-amber-600' : 'text-slate-500 hover:text-amber-600'}`}
              title={requirement.archived ? 'Restore Requirement' : 'Archive Requirement'}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(requirement)}
              className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
              title="Edit Requirement"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(requirement._id || requirement.requirementId)}
              className="p-1 text-slate-500 hover:text-rose-600 transition-colors"
              title="Delete Requirement"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
