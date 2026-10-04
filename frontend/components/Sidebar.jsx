'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';
import {
  FiBookOpen as BookOpen,
  FiCheckCircle as CheckCircle2,
  FiChevronDown as ChevronDown,
  FiChevronRight as ChevronRight,
  FiEdit2 as Edit2,
  FiFileText as FileText,
  FiFolder as FolderKanban,
  FiGrid as LayoutDashboard,
  FiList as ListFilter,
  FiLogOut as LogOut,
  FiMessageSquare as MessageSquareCode,
  FiSettings as Settings,
  FiShield as ShieldCheck,
} from 'react-icons/fi';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { user, logout } = useAuth();
  const projectId = params?.id;

  const [isSrsOpen, setIsSrsOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Visual classes only — navigation logic/routes remain unchanged.
  // Active navigation intentionally merges into the light page surface:
  // white active "tab" + dark readable text + squared right edge.
  // Active navigation is intentionally flush with the sidebar's right edge.
  // The page surface uses the same #F8FAFC, creating a clean continuous surface.
  const activeNavClass =
    'relative z-20 !text-slate-900 bg-[#F8FAFC] border border-[#F8FAFC] rounded-l-xl rounded-r-none shadow-[0_2px_10px_rgba(15,23,42,0.06)]';

  const inactiveNavClass =
    '!text-slate-300 hover:!text-white hover:bg-white/[0.055] border border-transparent';

  const activeChildClass =
    'relative !text-slate-900 bg-[#F8FAFC] font-semibold border border-[#F8FAFC] rounded-lg shadow-sm';

  const inactiveChildClass =
    '!text-slate-300 hover:!text-white hover:bg-white/[0.045] border border-transparent';

  return (
    <>
      <aside
        className="
          app-sidebar
          w-16 md:w-64
          max-w-64
          overflow-visible
          bg-[#0b1220]
          border-r border-slate-800/90
          flex flex-col
          h-screen
          select-none
          sticky top-0
          shrink-0
          shadow-[8px_0_28px_rgba(15,23,42,0.10)]
          transition-[width] duration-200
        "
      >
        {/* Brand */}
        <div className="hidden md:flex h-[76px] items-center px-5 border-b border-white/[0.07] shrink-0">
          <div className="min-w-0">
            <span className="font-bold text-[17px] tracking-tight !text-white block">
              Aether
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.16em] font-medium block style={{ color: '#cbd5e1' }}">
              Requirements Workspace
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden px-2 md:px-3 py-5">
          {/* Workspace */}
          <div className="mb-6">
            <div className="hidden md:flex px-3 mb-2 items-center">
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">
                Workspace
              </span>
            </div>

            <div className="space-y-1">
              <Link
                href="/dashboard"
                className={cn(
                  'group flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname === '/dashboard' || pathname === '/'
                    ? activeNavClass
                    : `${inactiveNavClass} mr-3`
                )}
              >
                <LayoutDashboard
                  className={cn(
                    'w-[17px] h-[17px] shrink-0 transition-colors',
                    pathname === '/dashboard' || pathname === '/'
                      ? 'text-slate-900'
                      : 'text-slate-300 group-hover:text-white'
                  )}
                />
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              <Link
                href="/projects"
                className={cn(
                  'group flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname === '/projects'
                    ? activeNavClass
                    : `${inactiveNavClass} mr-3`
                )}
              >
                <FolderKanban
                  className={cn(
                    'w-[17px] h-[17px] shrink-0 transition-colors',
                    pathname === '/projects'
                      ? 'text-slate-900'
                      : 'text-slate-300 group-hover:text-white'
                  )}
                />
                <span className="hidden md:inline">Projects</span>
              </Link>
            </div>
          </div>

          {/* Mobile project shortcuts */}
          {projectId && (
            <div className="md:hidden space-y-1 pt-4 border-t border-white/[0.07]">
              <Link
                href={`/projects/${projectId}`}
                title="Project overview"
                className="flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:bg-white/[0.055] hover:text-sky-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
              </Link>

              <Link
                href={`/projects/${projectId}/interview`}
                title="AI interview"
                className="flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:bg-white/[0.055] hover:text-sky-200 transition-colors"
              >
                <MessageSquareCode className="w-4 h-4" />
              </Link>

              <Link
                href={`/projects/${projectId}/requirements`}
                title="Requirements"
                className="flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:bg-white/[0.055] hover:text-sky-200 transition-colors"
              >
                <ListFilter className="w-4 h-4" />
              </Link>

              <Link
                href={`/projects/${projectId}/srs`}
                title="SRS workbench"
                className="flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:bg-white/[0.055] hover:text-sky-200 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Current Project */}
          {projectId ? (
            <div className="hidden md:block pt-5 border-t border-white/[0.07]">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">
                  Current Project
                </span>
              </div>

              {/* SRS Generation */}
              <button
                type="button"
                onClick={() => setIsSrsOpen(!isSrsOpen)}
                className={cn(
                  'group w-full flex items-center justify-between px-3 py-2.5 rounded-l-xl rounded-r-none text-sm font-semibold transition-all duration-200 cursor-pointer',
                  isSrsOpen || pathname?.startsWith(`/projects/${projectId}`)
                    ? activeNavClass
                    : `${inactiveNavClass} mr-3`
                )}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className={cn(
                    'w-4 h-4 group-hover:scale-105 transition-transform',
                    isSrsOpen || pathname?.startsWith(`/projects/${projectId}`)
                      ? 'text-slate-800'
                      : 'text-sky-300'
                  )} />
                  <span>SRS Generation</span>
                </div>

                {isSrsOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-700" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200" />
                )}
              </button>

              {/* Project child navigation */}
              {isSrsOpen && (
                <div className="pl-3 pt-1.5 space-y-1 border-l border-slate-700/70 ml-4">
                  <Link
                    href={`/projects/${projectId}`}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      pathname === `/projects/${projectId}`
                        ? activeChildClass
                        : inactiveChildClass
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Project Overview
                  </Link>

                  <Link
                    href={`/projects/${projectId}/interview`}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      pathname === `/projects/${projectId}/interview`
                        ? activeChildClass
                        : inactiveChildClass
                    )}
                  >
                    <MessageSquareCode className="w-3.5 h-3.5" />
                    AI Interview
                  </Link>

                  <Link
                    href={`/projects/${projectId}/requirements`}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      pathname === `/projects/${projectId}/requirements`
                        ? activeChildClass
                        : inactiveChildClass
                    )}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    Requirements
                  </Link>

                  <Link
                    href={`/projects/${projectId}/analysis`}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      pathname === `/projects/${projectId}/analysis`
                        ? activeChildClass
                        : inactiveChildClass
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Requirement Analysis
                  </Link>

                  <Link
                    href={`/projects/${projectId}/validation`}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      pathname === `/projects/${projectId}/validation`
                        ? activeChildClass
                        : inactiveChildClass
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Validation
                  </Link>

                  <Link
                    href={`/projects/${projectId}/srs`}
                    className={cn(
                      'group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      pathname?.includes(`/projects/${projectId}/srs`) ||
                      pathname?.includes(`/projects/${projectId}/versions`) ||
                      pathname?.includes(`/projects/${projectId}/traceability`)
                        ? activeChildClass
                        : inactiveChildClass
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    SRS Workbench
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {/* Settings */}
          <div className="pt-5 mt-5 border-t border-white/[0.07]">
            {projectId && (
              <Link
                href={`/projects/${projectId}/settings`}
                className={cn(
                  'group flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname === `/projects/${projectId}/settings`
                    ? activeNavClass
                    : `${inactiveNavClass} mr-3`
                )}
              >
                <Settings
                  className={cn(
                    'w-[17px] h-[17px] shrink-0 transition-colors',
                    pathname === `/projects/${projectId}/settings`
                      ? 'text-slate-900'
                      : 'text-slate-300 group-hover:text-white'
                  )}
                />
                <span className="hidden md:inline">Settings</span>
              </Link>
            )}
          </div>
        </div>

        {/* User Footer */}
        <div className="p-2 md:p-3 border-t border-white/[0.07] bg-[#080e19] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="hidden md:flex flex-1 min-w-0 items-center gap-2.5 overflow-hidden text-left p-2 rounded-xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.055] hover:border-white/[0.11] transition-all duration-200 group cursor-pointer"
              title="Click to view & edit Account Profile"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User DP'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0 group-hover:border-sky-400/50 group-hover:text-sky-300 transition-colors">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <div className="truncate flex-1 min-w-0">
                <div className="text-xs font-semibold !text-slate-200 group-hover:!text-white truncate flex items-center gap-1">
                  <span className="truncate">{user?.name || 'Engineer'}</span>
                  <Edit2 className="w-2.5 h-2.5 text-slate-600 group-hover:text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="text-[10px] !text-slate-400 truncate">
                  {user?.organization || 'Engineering Lab'}
                </div>
              </div>
            </button>

            <button
              onClick={logout}
              title="Logout"
              className="p-2.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all duration-200 shrink-0"
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
