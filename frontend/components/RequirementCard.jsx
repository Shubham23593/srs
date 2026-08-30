'use client';

import React from 'react';
import StatusBadge from './StatusBadge';
import { Tag, AlertTriangle, HelpCircle, Copy, Swords, Edit2, Trash2 } from 'lucide-react';

export default function RequirementCard({ requirement, onEdit, onDelete }) {
  // ALWAYS show the normalized statement — never raw interview text.
  const statement = requirement.normalizedDescription || requirement.description;
  const needsClarification = requirement.status === 'NEEDS_CLARIFICATION';
  const needsReview = requirement.status === 'NEEDS_REVIEW';
  const duplicates = requirement.duplicateCandidates || [];
  const conflicts = requirement.conflictReferences || [];

  return (
    <div className={`bg-slate-900 border rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all ${
      needsClarification ? 'border-amber-600/50' : needsReview ? 'border-orange-600/40' : 'border-slate-800 hover:border-slate-700'
    }`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              {requirement.requirementId}
            </span>
            <StatusBadge status={requirement.type} size="xs" />
            <StatusBadge status={requirement.priority} size="xs" />
          </div>
          <StatusBadge status={requirement.status || requirement.validationStatus} size="xs" />
        </div>

        <h3 className="font-semibold text-sm text-white mb-2">{requirement.title}</h3>
        <p className="text-xs text-slate-200 leading-relaxed mb-3">{statement}</p>

        {requirement.nfrSubcategory && requirement.nfrSubcategory !== 'N/A' && (
          <span className="inline-block text-[10px] text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded mb-2 mr-1">
            {requirement.nfrSubcategory}
          </span>
        )}
        {requirement.topicCluster && (
          <span className="inline-block text-[10px] text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded mb-2">
            {requirement.topicCluster}
          </span>
        )}

        {needsClarification && requirement.clarificationQuestion && (
          <div className="flex gap-2 items-start bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mt-2">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-200 leading-snug">{requirement.clarificationQuestion}</p>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="flex gap-2 items-start bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mt-2">
            <Copy className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-orange-200 leading-snug">Possible semantic duplicate of: {duplicates.join(', ')}</p>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="flex gap-2 items-start bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 mt-2">
            <Swords className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-rose-200 leading-snug">Rule conflict with: {conflicts.join(', ')} — needs stakeholder resolution.</p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 mt-3">
        <div className="flex items-center gap-1.5 truncate">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate">{requirement.targetSrsSection ? `§${requirement.targetSrsSection} · ` : ''}{requirement.category || 'Core'}</span>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button onClick={() => onEdit(requirement)} className="p-1 hover:text-white transition-colors" title="Edit Requirement">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(requirement._id || requirement.requirementId)} className="p-1 hover:text-rose-400 transition-colors" title="Delete Requirement">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
