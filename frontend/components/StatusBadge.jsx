'use client';

import React from 'react';
import { cn } from '../lib/utils';

export default function StatusBadge({ status, size = 'sm' }) {
  const s = (status || '').toUpperCase();

  let colorClasses = 'bg-slate-100 text-slate-900 border-slate-300 font-bold';

  if (['VALID', 'APPROVED', 'RESOLVED', 'COMPLETED', 'LOCKED'].includes(s)) {
    colorClasses = 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold';
  } else if (['NEEDS_REVIEW', 'PROPOSED', 'IN_PROGRESS', 'DRAFT', 'MODIFIED', 'AWAITING_CONFIRMATION'].includes(s)) {
    colorClasses = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
  } else if (['INVALID', 'HIGH', 'CONFLICT', 'REJECTED'].includes(s)) {
    colorClasses = 'bg-rose-100 text-rose-950 border-rose-300 font-bold';
  } else if (['FUNCTIONAL', 'CORE'].includes(s)) {
    colorClasses = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
  } else if (['NON_FUNCTIONAL', 'NFR', 'SECURITY'].includes(s)) {
    colorClasses = 'bg-purple-100 text-purple-950 border-purple-300 font-bold';
  } else if (['CONSTRAINT'].includes(s)) {
    colorClasses = 'bg-orange-100 text-orange-950 border-orange-300 font-bold';
  } else if (['ASSUMPTION'].includes(s)) {
    colorClasses = 'bg-cyan-100 text-cyan-950 border-cyan-300 font-bold';
  } else if (['INTERFACE'].includes(s)) {
    colorClasses = 'bg-indigo-100 text-indigo-950 border-indigo-300 font-bold';
  } else if (['STAKEHOLDER'].includes(s)) {
    colorClasses = 'bg-teal-100 text-teal-950 border-teal-300 font-bold';
  }


  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={cn('inline-flex items-center font-medium rounded-full border', colorClasses, sizeClasses)}>
      {status || 'Unknown'}
    </span>
  );
}
