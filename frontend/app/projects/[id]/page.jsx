'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import ProjectStepper from '../../../components/ProjectStepper';
import StatusBadge from '../../../components/StatusBadge';
import {
  FileText,
  MessageSquareCode,
  ListFilter,
  ShieldCheck,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  Sparkles,
  Users,
  Target,
  Layers,
  FileDown
} from 'lucide-react';
import { projectAPI, requirementAPI, srsAPI } from '../../../lib/api';

export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [srs, setSrs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (projectId && user) {
      loadData();
    }
  }, [projectId, user]);


  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, rRes, sRes] = await Promise.allSettled([
        projectAPI.getById(projectId),
        requirementAPI.getAll(projectId),
        srsAPI.get(projectId)
      ]);

      if (pRes.status === 'fulfilled') setProject(pRes.value.data?.data);
      if (rRes.status === 'fulfilled') setRequirements(rRes.value.data?.data || []);
      if (sRes.status === 'fulfilled') setSrs(sRes.value.data?.data);
    } catch (e) {
      console.error('Error loading project data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 p-8 text-center text-slate-400 text-xs">Loading project overview...</div>
      </div>
    );
  }

  const functionalCount = requirements.filter(r => r.type === 'FUNCTIONAL').length;
  const nfrCount = requirements.filter(r => r.type === 'NON_FUNCTIONAL').length;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={project.projectName}
          subtitle={`Requirements Engineering Hub for ${project.domain || 'Software Platform'}`}
          project={project}
          actions={
            <Link
              href={`/projects/${projectId}/interview`}
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Next: Step 2 (AI Interview)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project.status} />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Executive Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">{project.projectName}</h2>
                <StatusBadge status={project.status} />
              </div>
              <div className="text-xs font-mono text-emerald-400">
                Current Status: {srs ? `SRS v${srs.currentVersion}` : 'Elicitation Phase'}
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{project.description || 'No description provided.'}</p>
            {project.scope && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                <strong className="text-slate-200">System Scope:</strong> {project.scope}
              </div>
            )}
          </div>

          {/* Workflow Stage Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href={`/projects/${projectId}/interview`}
              className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 p-5 rounded-2xl transition-all shadow-lg group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Step 2: AI Interview</h3>
              <p className="text-xs text-slate-400">Elicit atomic requirements via adaptive AI questions.</p>
            </Link>

            <Link
              href={`/projects/${projectId}/requirements`}
              className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 p-5 rounded-2xl transition-all shadow-lg group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <ListFilter className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Step 3: Requirements</h3>
              <p className="text-xs text-slate-400">{functionalCount} FRs, {nfrCount} NFRs with stable ID tracking.</p>
            </Link>

            <Link
              href={`/projects/${projectId}/analysis`}
              className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 p-5 rounded-2xl transition-all shadow-lg group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Step 4: Quality Analysis</h3>
              <p className="text-xs text-slate-400">Detect ambiguities, duplicate % and rule conflicts.</p>
            </Link>

            <Link
              href={`/projects/${projectId}/srs`}
              className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 p-5 rounded-2xl transition-all shadow-lg group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-3 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Step 6: SRS Workbench</h3>
              <p className="text-xs text-slate-400">Template viewer, incremental update & PDF export.</p>
            </Link>
          </div>

          {/* Details & Stakeholders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-400" />
                Target Users & Stakeholders
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1.5">User Classes:</span>
                  <div className="flex flex-wrap gap-2">
                    {(project.targetUsers || ['Students', 'Faculty', 'Administrators']).map((u, i) => (
                      <span key={i} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                        {u}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1.5">Stakeholders:</span>
                  <div className="flex flex-wrap gap-2">
                    {(project.stakeholders || ['Dean of Students', 'Campus IT', 'Student Council']).map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Objectives & Constraints
              </h3>
              <div className="space-y-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Objectives:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {(project.objectives || ['Automate registration flows', 'Provide real-time updates']).map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Constraints & Assumptions:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {(project.constraints || ['Standard Web Browsers', 'Sub-2s response latency']).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
