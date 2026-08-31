'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban,
  FileText,
  CheckCircle2,
  ArrowRight,
  Layers,
  Plus,
  Search,
  Filter,
  Sparkles,
  MessageSquareCode,
  Calendar,
  Tag,
  Building,
  ArrowUpRight
} from 'lucide-react';
import { projectAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // Filter projects by search and status
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.projectName?.toLowerCase().includes(q) ||
          p.projectId?.toLowerCase().includes(q) ||
          p.domain?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: projects.length,
      interviewing: projects.filter((p) => p.status === 'INTERVIEWING').length,
      generated: projects.filter((p) => p.status === 'SRS_GENERATED').length,
      approved: projects.filter((p) => p.status === 'SRS_APPROVED').length,
      draft: projects.filter((p) => p.status === 'DRAFT' || !p.status).length
    };
  }, [projects]);

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-xs text-slate-400">
        Verifying workspace identity...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title="Software Projects Directory"
          subtitle={`Manage software specifications, AI interview sessions, and baseline SRS records (${user?.organization || 'Engineering Department'})`}
          actions={
            <Link
              href="/projects/new"
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </Link>
          }
        />

        <main className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Top Control Bar: Search & Status Filter */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name, ID, or domain..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
              {[
                { id: 'ALL', label: 'All', count: counts.all },
                { id: 'INTERVIEWING', label: 'Interviewing', count: counts.interviewing },
                { id: 'SRS_GENERATED', label: 'Generated', count: counts.generated },
                { id: 'SRS_APPROVED', label: 'Approved', count: counts.approved },
                { id: 'DRAFT', label: 'Drafts', count: counts.draft }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    statusFilter === f.id
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    statusFilter === f.id ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Project List / Grid */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Active Project Specifications</h3>
                <p className="text-xs text-slate-400">
                  Showing {filteredProjects.length} of {projects.length} total software specifications
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                {counts.approved} Approved SRS
              </span>
            </div>

            {loading ? (
              <div className="p-16 text-center text-slate-400 text-xs">Loading projects directory...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">No Projects Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery ? 'No projects match your search query.' : 'Create your first project to start the requirements elicitation process.'}
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
              <div className="divide-y divide-slate-800/80">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj._id}
                    className="p-6 hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 max-w-3xl flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/projects/${proj._id}`}
                          className="font-bold text-base text-white group-hover:text-brand-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{proj.projectName}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-400" />
                        </Link>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800">
                          {proj.projectId}
                        </span>
                        <StatusBadge status={proj.status} size="xs" />
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {proj.description || proj.scope || 'No description provided.'}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Tag className="w-3 h-3 text-emerald-400" />
                          <span>Domain: {proj.domain || 'Software Platform'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created: {formatDate(proj.createdAt)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Step Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                      <Link
                        href={`/projects/${proj._id}`}
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                      >
                        Step 1 (Info)
                      </Link>
                      <Link
                        href={`/projects/${proj._id}/interview`}
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1"
                      >
                        <MessageSquareCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Step 2 (Interview)</span>
                      </Link>
                      <Link
                        href={`/projects/${proj._id}/srs`}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500/15 to-emerald-500/15 hover:from-brand-500/25 hover:to-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SRS Workbench</span>
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
