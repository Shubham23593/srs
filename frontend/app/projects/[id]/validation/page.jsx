'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import StatusBadge from '../../../../components/StatusBadge';
import Modal from '../../../../components/Modal';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Edit3,
  Check,
  X,
  RotateCw,
  HelpCircle,
  Compass
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
  const [activeReqId, setActiveReqId] = useState(null);

  // Edit suggestion modal state
  const [isEditSuggestionOpen, setIsEditSuggestionOpen] = useState(false);
  const [editingTargetReq, setEditingTargetReq] = useState(null);
  const [customSuggestionText, setCustomSuggestionText] = useState('');
  const [altLoading, setAltLoading] = useState({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Priority 13: Reset state on projectId switch
  useEffect(() => {
    if (projectId && user) {
      setRequirements([]);
      setProject(null);
      setLoading(true);
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

  const handleRevalidateSingle = async (reqId) => {
    try {
      setActiveReqId(reqId);
      const res = await requirementAPI.revalidate(reqId);
      if (res.data?.success) {
        setRequirements(prev => prev.map(r => (r._id === reqId || r.requirementId === reqId) ? res.data.data : r));
      }
    } catch (e) {
      console.error('Revalidation error:', e);
    } finally {
      setActiveReqId(null);
    }
  };

  // Priority 8: Apply AI Suggestion
  const handleApplySuggestion = async (req, text = null) => {
    const newDesc = text || req.suggestedImprovement;
    if (!newDesc) return;
    try {
      await requirementAPI.update(req._id || req.requirementId, {
        description: newDesc,
        validationStatus: 'VALID',
        validationIssues: []
      });
      loadData();
    } catch (e) {
      console.error('Failed to update requirement:', e);
    }
  };

  // Priority 8: Edit Suggestion before applying
  const handleOpenEditSuggestion = (req) => {
    setEditingTargetReq(req);
    setCustomSuggestionText(req.suggestedImprovement || req.normalizedDescription || req.description);
    setIsEditSuggestionOpen(true);
  };

  const handleSaveCustomSuggestion = async (e) => {
    e.preventDefault();
    if (!editingTargetReq || !customSuggestionText.trim()) return;
    await handleApplySuggestion(editingTargetReq, customSuggestionText.trim());
    setIsEditSuggestionOpen(false);
    setEditingTargetReq(null);
  };

  // Priority 8: Reject Suggestion
  const handleRejectSuggestion = async (req) => {
    try {
      await requirementAPI.update(req._id || req.requirementId, {
        suggestedImprovement: ''
      });
      setRequirements(prev => prev.map(r => r._id === req._id ? { ...r, suggestedImprovement: '' } : r));
    } catch (e) {
      console.error('Failed to dismiss suggestion:', e);
    }
  };

  // Priority 8: Generate Alternative Suggestion
  const handleGenerateAlternative = async (req) => {
    const id = req._id || req.requirementId;
    try {
      setAltLoading(prev => ({ ...prev, [id]: true }));
      const res = await analysisAPI.getAlternativeSuggestion(id);
      if (res.data?.success && res.data.data?.alternativeSuggestion) {
        const altText = res.data.data.alternativeSuggestion;
        setRequirements(prev => prev.map(r => (r._id === id || r.requirementId === id) ? { ...r, suggestedImprovement: altText } : r));
      }
    } catch (e) {
      console.error('Alternative suggestion error:', e);
    } finally {
      setAltLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const validCount = requirements.filter(r => r.validationStatus === 'VALID').length;
  const reviewCount = requirements.filter(r => r.validationStatus === 'NEEDS_REVIEW').length;
  const invalidCount = requirements.filter(r => r.validationStatus === 'INVALID').length;
  const mismatchCount = requirements.filter(r => r.contextRelevance?.status === 'CONTEXT_MISMATCH').length;

  const DIMENSIONS_LIST = [
    { key: 'specific', label: 'Specific' },
    { key: 'complete', label: 'Complete' },
    { key: 'unambiguous', label: 'Unambiguous' },
    { key: 'consistent', label: 'Consistent' },
    { key: 'feasible', label: 'Feasible' },
    { key: 'verifiable', label: 'Verifiable' },
    { key: 'necessary', label: 'Necessary' },
    { key: 'traceable', label: 'Traceable' },
    { key: 'measurable', label: 'Measurable' },
    { key: 'projectContextRelevance', label: 'Context Relevance' }
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title="Step 5: Requirements Validation & Verification"
          subtitle="Verification against ISO/IEC/IEEE 29148 criteria and project context relevance"
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

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
          {/* Validation Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scope Mismatch</div>
                <div className="text-2xl font-extrabold text-purple-400">{mismatchCount}</div>
              </div>
            </div>
          </div>

          {/* Validation Table / Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">10-Dimension ISO 29148 Validation Matrix</h3>
                <p className="text-xs text-slate-400">
                  Comprehensive audit assessing specific, complete, unambiguous, consistent, feasible, verifiable, necessary, traceable, measurable quality, and project context relevance.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                  Loading validation metrics...
                </div>
              ) : requirements.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">No requirements to validate.</div>
              ) : (
                requirements.map(req => {
                  const dims = req.validationDimensions || {
                    specific: true, complete: true, unambiguous: true, consistent: true,
                    feasible: true, verifiable: true, necessary: true, traceable: true,
                    measurable: true, projectContextRelevance: true
                  };
                  const relevance = req.contextRelevance || { status: 'RELEVANT' };
                  const isBusy = activeReqId === (req._id || req.requirementId);
                  const isAltBusy = altLoading[req._id || req.requirementId];

                  return (
                    <div key={req._id || req.requirementId} className="p-6 hover:bg-slate-800/40 transition-colors space-y-4">
                      {/* Top bar: ID, Title, Status & Actions */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                            {req.requirementId}
                          </span>
                          <span className="font-bold text-sm text-white">{req.title}</span>
                          <StatusBadge status={req.type} size="xs" />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRevalidateSingle(req._id || req.requirementId)}
                            disabled={isBusy}
                            className="p-1.5 text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
                            title="Re-run ISO/IEEE validation for this requirement"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-emerald-400' : ''}`} />
                            <span className="text-[11px]">Revalidate</span>
                          </button>
                          <StatusBadge status={req.validationStatus} size="xs" />
                        </div>
                      </div>

                      {/* Requirement Statement */}
                      <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                        {req.normalizedDescription || req.description}
                      </p>

                      {/* Priority 9: 10 Validation Dimensions Grid */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          ISO 29148 Quality & Relevance Dimensions
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {DIMENSIONS_LIST.map(({ key, label }) => {
                            const passed = dims[key] !== false;
                            return (
                              <div
                                key={key}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-between ${
                                  passed
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                                }`}
                              >
                                <span>{label}</span>
                                {passed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Project Context Relevance Alert Box */}
                      {relevance.status === 'CONTEXT_MISMATCH' && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1">
                          <div className="text-rose-300 font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            Project Scope Mismatch Detected
                          </div>
                          <p className="text-rose-200 text-[11px] leading-relaxed">{relevance.reason}</p>
                        </div>
                      )}

                      {/* Validation Issues & AI Recommendations */}
                      {req.validationIssues?.length > 0 && (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs space-y-2">
                          <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            Audit Flags: {req.validationIssues.join('; ')}
                          </div>

                          {req.suggestedImprovement && (
                            <div className="pt-2 border-t border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="text-slate-200 flex-1">
                                <span className="text-emerald-400 font-bold block text-[11px] mb-0.5">AI Proposed Improvement:</span>
                                <p className="text-xs text-slate-200 leading-relaxed font-sans">{req.suggestedImprovement}</p>
                              </div>

                              {/* Priority 8: Interactive Recommendation Action Workflow */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                <button
                                  onClick={() => handleApplySuggestion(req)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Apply
                                </button>
                                <button
                                  onClick={() => handleOpenEditSuggestion(req)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-700"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleGenerateAlternative(req)}
                                  disabled={isAltBusy}
                                  className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-purple-500/30"
                                  title="Ask AI for an alternative formulation"
                                >
                                  <RotateCw className={`w-3.5 h-3.5 ${isAltBusy ? 'animate-spin' : ''}`} />
                                  Alternative
                                </button>
                                <button
                                  onClick={() => handleRejectSuggestion(req)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                                  title="Dismiss suggestion"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Edit Suggestion Modal */}
      {isEditSuggestionOpen && (
        <Modal
          isOpen={isEditSuggestionOpen}
          onClose={() => setIsEditSuggestionOpen(false)}
          title={`Edit Suggestion: ${editingTargetReq?.requirementId}`}
        >
          <form onSubmit={handleSaveCustomSuggestion} className="space-y-4">
            <p className="text-xs text-slate-400">
              Modify the proposed requirement statement before saving it to the catalog.
            </p>
            <textarea
              rows={4}
              required
              value={customSuggestionText}
              onChange={(e) => setCustomSuggestionText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-brand-500 focus:outline-none leading-relaxed"
            />
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditSuggestionOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply Modified Statement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
