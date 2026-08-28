'use client';

import React from 'react';
import { cn } from '../lib/utils';

export default function StatusBadge({ status, size = 'sm' }) {
  const s = (status || '').toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['VALID', 'APPROVED', 'RESOLVED', 'COMPLETED', 'LOCKED'].includes(s)) {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (['NEEDS_REVIEW', 'PROPOSED', 'IN_PROGRESS', 'DRAFT', 'MODIFIED', 'AWAITING_CONFIRMATION'].includes(s)) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (['INVALID', 'HIGH', 'CONFLICT', 'REJECTED'].includes(s)) {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (['FUNCTIONAL', 'CORE'].includes(s)) {
    colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  } else if (['NON_FUNCTIONAL', 'NFR', 'SECURITY'].includes(s)) {
    colorClasses = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  } else if (['CONSTRAINT'].includes(s)) {
    colorClasses = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  } else if (['ASSUMPTION'].includes(s)) {
    colorClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  } else if (['INTERFACE'].includes(s)) {
    colorClasses = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  } else if (['STAKEHOLDER'].includes(s)) {
    colorClasses = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  }


  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={cn('inline-flex items-center font-medium rounded-full border', colorClasses, sizeClasses)}>
      {status || 'Unknown'}
    </span>
  );
}
