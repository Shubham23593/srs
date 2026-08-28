'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import VersionDiffViewer from '../../../../components/VersionDiffViewer';
import { GitBranch, Clock, ArrowRight, History } from 'lucide-react';
import { srsAPI, projectAPI } from '../../../../lib/api';

export default function VersionsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [diffData, setDiffData] = useState(null);
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
      const [pRes, vRes] = await Promise.all([
        projectAPI.getById(projectId),
        srsAPI.getVersions(projectId)
      ]);

      if (pRes.data?.success) setProject(pRes.data.data);
      if (vRes.data?.success) {
        setVersions(vRes.data.data || []);
        if (vRes.data.data?.length > 1) {
          const diffRes = await srsAPI.compareVersions(projectId, '1.0', '1.1');
          if (diffRes.data?.success) {
            setDiffData(diffRes.data.data);
          }
        }
      }
    } catch (e) {
      console.error('Error loading versions:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 8: Version Control & Diff Studio"
          subtitle="Continuous quality improvement: side-by-side SRS version diffs and immutable revision history"
          project={project}
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Comparative Diff Viewer */}
          <VersionDiffViewer
            diffData={diffData?.diff || {
              added: [],
              modified: ['FR-002 (Event Registration with Admin Approval)'],
              removed: []
            }}
            v1="1.0"
            v2="1.1"
            reason={diffData?.reasonForChanges || 'Event registration requires administrator approval.'}
            summary={diffData?.summaryOfChanges || 'Modified FR-002 and Section 3.1 to incorporate administrative approval gate before registration confirmation.'}
          />

          {/* Immutable Revision History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  SRS Revision History
                </h3>
                <p className="text-xs text-slate-400">Strictly conforms to Section Revision History in standard SRS template.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {versions.map((v) => (
                <div key={v._id} className="p-6 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                        v{v.version}
                      </span>
                      <span className="text-xs text-slate-400">Recorded: {new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-bold text-white">Reason: {v.reasonForChanges}</div>
                    <p className="text-xs text-slate-400">{v.summaryOfChanges}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-mono text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded border border-slate-800 block">
                      {v.changedRequirementIds?.length || 0} Reqs Impacted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
