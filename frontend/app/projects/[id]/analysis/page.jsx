'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import StatusBadge from '../../../../components/StatusBadge';
import DuplicateConflictModal from '../../../../components/DuplicateConflictModal';
import {
  ShieldCheck,
  AlertTriangle,
  GitMerge,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Percent,
  Search,
  ArrowRight
} from 'lucide-react';
import { analysisAPI, projectAPI } from '../../../../lib/api';

export default function AnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [activeIssue, setActiveIssue] = useState(null);
  const [notification, setNotification] = useState(null);

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
      const [pRes, iRes] = await Promise.all([
        projectAPI.getById(projectId),
        analysisAPI.getIssues(projectId)
      ]);
      if (pRes.data?.success) setProject(pRes.data.data);
      if (iRes.data?.success) setIssues(iRes.data.data || []);
    } catch (e) {
      console.error('Error loading analysis issues:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await analysisAPI.analyze(projectId);
      if (res.data?.success) {
        setIssues(res.data.data || []);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setNotification({ type: 'error', message: 'Analysis failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResolveIssue = async (issueId, status, resolutionNotes, primaryRequirementId, secondaryRequirementId) => {
    try {
      setResolving(true);
      const res = await analysisAPI.resolveIssue(issueId, {
        status,
        resolutionNotes,
        primaryRequirementId,
        secondaryRequirementId
      });

      if (res.data?.success) {
        const updatedIssue = res.data.data;
        setIssues(prev => prev.map(iss => iss._id === issueId ? (updatedIssue || { ...iss, status, resolutionNotes }) : iss));
        setActiveIssue(null);

        const successMsg = res.data.message || (status === 'MERGED'
          ? `${primaryRequirementId || 'FR-001'} and ${secondaryRequirementId || 'FR-002'} were successfully merged into ${primaryRequirementId || 'FR-001'}.`
          : 'Issue resolved successfully.');

        setNotification({ type: 'success', message: successMsg });
        setTimeout(() => setNotification(null), 7000);
      } else {
        setNotification({ type: 'error', message: res.data?.message || 'Failed to resolve issue.' });
      }
    } catch (err) {
      console.error('Error resolving issue:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error occurred while resolving issue.';
      setNotification({ type: 'error', message: errorMsg });
    } finally {
      setResolving(false);
    }
  };

  const openIssues = issues.filter(i => i.status === 'OPEN');
  const duplicateIssues = issues.filter(i => i.issueType === 'DUPLICATE');
  const conflictIssues = issues.filter(i => i.issueType === 'CONFLICT');
  const ambiguityIssues = issues.filter(i => i.issueType === 'AMBIGUITY');

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 4: Quality & Defect Analysis"
          subtitle="Cosine similarity duplicate detection, rule contradiction & ambiguity audits"
          project={project}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="px-4 py-2 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {analyzing ? 'Analyzing Semantics...' : 'Run Quality Audit'}
              </button>
              <Link
                href={`/projects/${projectId}/validation`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <span>Next: Step 5 (Validation)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Notification Banner */}
          {notification && (
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="text-xs font-semibold">{notification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-850 hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Metrics summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Open Issues</div>
              <div className="text-2xl font-extrabold text-white">{openIssues.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Requiring user review</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Duplicates Detected</div>
              <div className="text-2xl font-extrabold text-amber-400">{duplicateIssues.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Cosine similarity ≥ 75%</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Rule Conflicts</div>
              <div className="text-2xl font-extrabold text-rose-400">{conflictIssues.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Contradicting rules</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Ambiguities</div>
              <div className="text-2xl font-extrabold text-blue-400">{ambiguityIssues.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Non-quantified language</div>
            </div>
          </div>

          {/* Issues List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Quality Audit Findings</h3>
                <p className="text-xs text-slate-400">All findings are tracked in Appendix C of the SRS until resolved by the requirements engineer.</p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading analysis results...</div>
            ) : issues.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-200">No Quality Defects Identified</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your requirements pass ISO/IEC/IEEE 29148 checks for non-ambiguity, non-redundancy, and consistency.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {issues.map(iss => {
                  return (
                    <div key={iss._id} className="p-6 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-400">[{iss.issueId}]</span>
                          <StatusBadge status={iss.issueType} size="xs" />
                          <StatusBadge status={iss.severity} size="xs" />
                          <StatusBadge status={iss.status} size="xs" />
                          {iss.similarityScore && (
                            <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {(iss.similarityScore * 100).toFixed(0)}% Match
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed font-medium">{iss.description}</p>

                        {iss.relatedRequirementIds?.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-slate-300">Linked:</span>
                            {iss.relatedRequirementIds.map(rid => (
                              <span key={rid} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-brand-400 text-[11px]">
                                {rid}
                              </span>
                            ))}
                          </div>
                        )}

                        {iss.suggestedResolution && (
                          <div className="text-xs text-emerald-400/90 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                            <strong>AI Suggested Improvement:</strong> {iss.suggestedResolution}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {iss.status === 'OPEN' ? (
                          <button
                            onClick={() => setActiveIssue(iss)}
                            className="px-3.5 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            Resolve Issue
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Resolution Logged</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <DuplicateConflictModal
        isOpen={Boolean(activeIssue)}
        onClose={() => setActiveIssue(null)}
        issue={activeIssue}
        onResolve={handleResolveIssue}
        isResolving={resolving}
      />
    </div>
  );
}
