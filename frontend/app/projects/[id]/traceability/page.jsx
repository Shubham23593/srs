'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import TraceabilityMatrix from '../../../../components/TraceabilityMatrix';
import TraceabilityGraph from '../../../../components/TraceabilityGraph';
import { Layers, ArrowRight } from 'lucide-react';
import { srsAPI, projectAPI } from '../../../../lib/api';

export default function TraceabilityPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [matrixData, setMatrixData] = useState([]);
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
      const [pRes, tRes] = await Promise.all([
        projectAPI.getById(projectId),
        srsAPI.getTraceability(projectId)
      ]);

      if (pRes.data?.success) setProject(pRes.data.data);
      if (tRes.data?.success) setMatrixData(tRes.data.data?.matrix || []);
    } catch (e) {
      console.error('Error loading traceability data:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 7: Bidirectional Traceability Studio"
          subtitle="5-Tier forward and backward requirement lineage: Source → REQ ID → Feature → Section → Version"
          project={project}
          actions={
            <Link
              href={`/projects/${projectId}/versions`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Next: Step 8 (Version Control)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <TraceabilityMatrix matrixData={matrixData} />
          <TraceabilityGraph matrixData={matrixData} />
        </main>
      </div>
    </div>
  );
}
