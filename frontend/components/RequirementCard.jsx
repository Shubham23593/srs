'use client';

import React from 'react';
import StatusBadge from './StatusBadge';
import { Tag, AlertCircle, CheckCircle2, Shield, Edit2, Trash2 } from 'lucide-react';

export default function RequirementCard({ requirement, onEdit, onDelete }) {
  const isFR = requirement.type === 'FUNCTIONAL';

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              {requirement.requirementId}
            </span>
            <StatusBadge status={requirement.type} size="xs" />
            <StatusBadge status={requirement.priority} size="xs" />
          </div>
          <StatusBadge status={requirement.validationStatus} size="xs" />
        </div>

        <h3 className="font-semibold text-sm text-white mb-2">{requirement.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">{requirement.description}</p>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate">{requirement.category || 'Core'}</span>
          {requirement.sourceMessageId && (
            <span className="text-[10px] text-slate-400 font-mono">[{requirement.sourceMessageId}]</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(requirement)}
              className="p-1 hover:text-white transition-colors"
              title="Edit Requirement"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(requirement._id || requirement.requirementId)}
              className="p-1 hover:text-rose-400 transition-colors"
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
