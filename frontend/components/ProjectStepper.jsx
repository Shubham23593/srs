'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  MessageSquareCode,
  ListFilter,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Layers,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProjectStepper({ projectId, currentStatus = 'DRAFT' }) {
  const pathname = usePathname();

  const steps = [
    { id: 'overview', label: '1. Project Info', href: `/projects/${projectId}`, icon: FileText },
    { id: 'interview', label: '2. AI Interview', href: `/projects/${projectId}/interview`, icon: MessageSquareCode },
    { id: 'requirements', label: '3. Requirements', href: `/projects/${projectId}/requirements`, icon: ListFilter },
    { id: 'analysis', label: '4. Quality Audit', href: `/projects/${projectId}/analysis`, icon: ShieldCheck },
    { id: 'validation', label: '5. Validation', href: `/projects/${projectId}/validation`, icon: CheckCircle2 },
    { id: 'srs', label: '6. SRS Baseline', href: `/projects/${projectId}/srs`, icon: FileCheck2 },
    { id: 'traceability', label: '7. Traceability', href: `/projects/${projectId}/traceability`, icon: Layers },
    { id: 'versions', label: '8. Version Control', href: `/projects/${projectId}/versions`, icon: GitBranch },
  ];

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 px-6 py-3 overflow-x-auto shadow-inner">
      <div className="flex items-center min-w-max gap-2 text-xs">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = pathname === step.href;
          
          return (
            <React.Fragment key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all select-none",
                  isActive
                    ? "bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 shadow-md shadow-brand-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-slate-950" : "text-emerald-400")} />
                <span>{step.label}</span>
              </Link>

              {index < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
