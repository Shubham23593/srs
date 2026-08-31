'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';
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
  ChevronDown,
  ChevronRight,
  BookOpen,
  Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { user, logout } = useAuth();
  const projectId = params?.id;

  const [isSrsOpen, setIsSrsOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isLinkActive = (path) => {
    return pathname === path || (path !== '/' && pathname?.startsWith(path));
  };

  return (
    <>
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none sticky top-0 shrink-0">
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

          {/* Current Project Context — Single SRS Generation dropdown */}
          {projectId ? (
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              <div className="px-3 pb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Current Project</span>
              </div>

              {/* 1st option: SRS Generation Accordion Header */}
              <button
                type="button"
                onClick={() => setIsSrsOpen(!isSrsOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer",
                  isSrsOpen || pathname?.startsWith(`/projects/${projectId}`)
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>SRS Generation</span>
                </div>
                {isSrsOpen ? (
                  <ChevronDown className="w-4 h-4 text-emerald-400 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
                )}
              </button>

              {/* Dropdown child links */}
              {isSrsOpen && (
                <div className="pl-3 pt-1 space-y-1 border-l-2 border-slate-800 ml-4 animate-fade-in">
                  <Link
                    href={`/projects/${projectId}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      pathname === `/projects/${projectId}`
                        ? "bg-brand-500/15 text-emerald-400 font-bold border border-brand-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Project Overview
                  </Link>

                  <Link
                    href={`/projects/${projectId}/interview`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      pathname === `/projects/${projectId}/interview`
                        ? "bg-brand-500/15 text-emerald-400 font-bold border border-brand-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <MessageSquareCode className="w-3.5 h-3.5" />
                    AI Interview
                  </Link>

                  <Link
                    href={`/projects/${projectId}/requirements`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      pathname === `/projects/${projectId}/requirements`
                        ? "bg-brand-500/15 text-emerald-400 font-bold border border-brand-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    Requirements
                  </Link>

                  <Link
                    href={`/projects/${projectId}/analysis`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      pathname === `/projects/${projectId}/analysis`
                        ? "bg-brand-500/15 text-emerald-400 font-bold border border-brand-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Requirement Analysis
                  </Link>

                  <Link
                    href={`/projects/${projectId}/validation`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      pathname === `/projects/${projectId}/validation`
                        ? "bg-brand-500/15 text-emerald-400 font-bold border border-brand-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Validation
                  </Link>

                  <Link
                    href={`/projects/${projectId}/srs`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      pathname?.includes(`/projects/${projectId}/srs`) || pathname?.includes(`/projects/${projectId}/versions`) || pathname?.includes(`/projects/${projectId}/traceability`)
                        ? "bg-brand-500/15 text-emerald-400 font-bold border border-brand-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    SRS Workbench
                  </Link>
                </div>
              )}
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

        {/* User Footer — Clickable to open Profile & Edit Avatar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex-1 flex items-center gap-2.5 overflow-hidden text-left p-1.5 rounded-xl hover:bg-slate-800/70 transition group cursor-pointer"
              title="Click to view & edit Account Profile"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User DP'}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-colors">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="truncate flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate flex items-center gap-1">
                  <span className="truncate">{user?.name || 'Engineer'}</span>
                  <Edit2 className="w-2.5 h-2.5 text-slate-500 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="text-[10px] text-slate-400 truncate">{user?.organization || 'Engineering Lab'}</div>
              </div>
            </button>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Account Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
