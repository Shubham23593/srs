'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  FolderPlus,
  FolderKanban,
  FileText,
  CheckCircle2,
  ArrowRight,
  Layers,
  Plus
} from 'lucide-react';
import { projectAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadProjects();
      }
    }
  }, [user, authLoading, router]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectAPI.getAll();
      if (res.data?.success) {
        setProjects(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-xs text-slate-400">
        Verifying authentication...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={`Engineering Dashboard — ${user?.name || 'Workspace'}`}
          subtitle={`Logged in as ${user?.email} (${user?.organization || 'Software Engineering Lab'})`}
          actions={
            <Link
              href="/projects/new"
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          }
        />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Active Projects</span>
                <FolderKanban className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{projects.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Requirements lifecycle tracked</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>AI Interview & Elicitation</span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-extrabold text-blue-400">Live Ollama</div>
              <div className="text-[11px] text-emerald-400 mt-1">ISO/IEC/IEEE 29148 questioning</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>SRS Generation & PDF/DOCX</span>
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">Exact Template</div>
              <div className="text-[11px] text-slate-400 mt-1">Sections 1–6 & Appendices A, B, C</div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Your Software Projects</h3>
                <p className="text-xs text-slate-400">Manage software specifications from initial interview to version-controlled SRS.</p>
              </div>
              <Link
                href="/projects/new"
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
              >
                + Create Project
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">No Projects Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the button below to define your project scope, target users, and start the AI requirements interview.
                </p>
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create First Project
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {projects.map((proj) => (
                  <div
                    key={proj._id}
                    className="p-6 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/projects/${proj._id}`}
                          className="font-bold text-base text-white hover:text-brand-400 transition-colors"
                        >
                          {proj.projectName}
                        </Link>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {proj.projectId}
                        </span>
                        <StatusBadge status={proj.status} size="xs" />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{proj.description || proj.scope || 'No description provided.'}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Domain: {proj.domain || 'Software'}</span>
                        <span>Created: {formatDate(proj.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/projects/${proj._id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                      >
                        Step 1 (Info)
                      </Link>
                      <Link
                        href={`/projects/${proj._id}/interview`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                      >
                        Step 2 (Interview)
                      </Link>
                      <Link
                        href={`/projects/${proj._id}/srs`}
                        className="px-3.5 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        SRS Workbench
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
