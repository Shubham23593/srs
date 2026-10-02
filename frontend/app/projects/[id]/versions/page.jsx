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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title="Step 8: Version Control & Diff Studio"
          subtitle="Continuous quality improvement: side-by-side SRS version diffs and immutable revision history"
          project={project}
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
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
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  SRS Revision History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Strictly conforms to Section Revision History in standard SRS template.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {versions.map((v) => (
                <div key={v._id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        v{v.version}
                      </span>
                      <span className="text-xs text-slate-500">Recorded: {new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">Reason: {v.reasonForChanges}</div>
                    <p className="text-xs text-slate-600">{v.summaryOfChanges}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200 block">
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

