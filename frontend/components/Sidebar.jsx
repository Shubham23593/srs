'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ListFilter,
  CheckCircle2,
  GitBranch,
  Settings,
  User,
  LogOut,
  Sparkles,
  MessageSquareCode,
  ShieldCheck,
  Network
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { user, logout } = useAuth();
  const projectId = params?.id;

  const isLinkActive = (path) => {
    return pathname === path || (path !== '/' && pathname?.startsWith(path));
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white block">IntelliSDLC AI</span>
          <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold block">Requirements Engine</span>
        </div>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === '/dashboard' || pathname === '/'
                ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/projects"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === '/projects'
                ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            )}
          >
            <FolderKanban className="w-4 h-4" />
            Projects
          </Link>
        </div>

        {/* Current Project Context */}
        {projectId ? (
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <div className="px-3 pb-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Current Project</span>
            </div>

            <Link
              href={`/projects/${projectId}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/projects/${projectId}`
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <FileText className="w-4 h-4" />
              Project Overview
            </Link>

            <Link
              href={`/projects/${projectId}/interview`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/projects/${projectId}/interview`
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <MessageSquareCode className="w-4 h-4" />
              AI Interview
            </Link>

            <Link
              href={`/projects/${projectId}/requirements`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/projects/${projectId}/requirements`
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <ListFilter className="w-4 h-4" />
              Requirements
            </Link>

            <Link
              href={`/projects/${projectId}/analysis`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/projects/${projectId}/analysis`
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Requirement Analysis
            </Link>

            <Link
              href={`/projects/${projectId}/validation`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/projects/${projectId}/validation`
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              Validation
            </Link>

            <Link
              href={`/projects/${projectId}/srs`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname?.includes(`/projects/${projectId}/srs`) || pathname?.includes(`/projects/${projectId}/versions`) || pathname?.includes(`/projects/${projectId}/traceability`)
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              SRS Workbench
            </Link>
          </div>
        ) : null}

        {/* Global Settings */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          {projectId && (
            <Link
              href={`/projects/${projectId}/settings`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/projects/${projectId}/settings`
                  ? "bg-brand-500/10 text-emerald-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-slate-200 truncate">{user?.name || 'Engineer'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.organization || 'Lab'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
