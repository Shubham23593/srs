'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import StatusBadge from '../../../../components/StatusBadge';
import {
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { analysisAPI, projectAPI, requirementAPI } from '../../../../lib/api';

export default function ValidationPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

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
      const [pRes, rRes] = await Promise.all([
        projectAPI.getById(projectId),
        requirementAPI.getAll(projectId)
      ]);
      if (pRes.data?.success) setProject(pRes.data.data);
      if (rRes.data?.success) setRequirements(rRes.data.data || []);
    } catch (e) {
      console.error('Error loading validation data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunValidation = async () => {
    try {
      setValidating(true);
      await analysisAPI.validate(projectId);
      const rRes = await requirementAPI.getAll(projectId);
      if (rRes.data?.success) {
        setRequirements(rRes.data.data);
      }
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleApplySuggestion = async (req) => {
    if (!req.suggestedImprovement) return;
    try {
      await requirementAPI.update(req._id, {
        description: req.suggestedImprovement,
        validationStatus: 'VALID',
        validationIssues: []
      });
      loadData();
    } catch (e) {
      console.error('Failed to update requirement:', e);
    }
  };

  const validCount = requirements.filter(r => r.validationStatus === 'VALID').length;
  const reviewCount = requirements.filter(r => r.validationStatus === 'NEEDS_REVIEW').length;
  const invalidCount = requirements.filter(r => r.validationStatus === 'INVALID').length;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 5: Requirements Validation & Verification"
          subtitle="Verification against ISO/IEC/IEEE 29148 standards: clarity, correctness, completeness, and testability"
          project={project}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunValidation}
                disabled={validating}
                className="px-4 py-2 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                {validating ? 'Verifying Specifications...' : 'Run ISO/IEEE Validation'}
              </button>
              <Link
                href={`/projects/${projectId}/srs`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <span>Next: Step 6 (Generate SRS)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Validation Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valid Specifications</div>
                <div className="text-2xl font-extrabold text-emerald-400">{validCount}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Needs Review</div>
                <div className="text-2xl font-extrabold text-amber-400">{reviewCount}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invalid / Defective</div>
                <div className="text-2xl font-extrabold text-rose-400">{invalidCount}</div>
              </div>
            </div>
          </div>

          {/* Validation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Specification Quality Matrix</h3>
                <p className="text-xs text-slate-400">Audit results with recommended quantifiable formulations.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {requirements.map(req => (
                <div key={req._id} className="p-6 hover:bg-slate-800/40 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                        {req.requirementId}
                      </span>
                      <span className="font-bold text-sm text-white">{req.title}</span>
                      <StatusBadge status={req.type} size="xs" />
                    </div>
                    <StatusBadge status={req.validationStatus} size="xs" />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{req.description}</p>

                  {req.validationIssues?.length > 0 && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs space-y-2">
                      <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Audit Flag: {req.validationIssues.join(', ')}
                      </div>

                      {req.suggestedImprovement && (
                        <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-4">
                          <div className="text-slate-200">
                            <span className="text-emerald-400 font-bold block text-[11px] mb-0.5">Proposed Improvement:</span>
                            {req.suggestedImprovement}
                          </div>
                          <button
                            onClick={() => handleApplySuggestion(req)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
