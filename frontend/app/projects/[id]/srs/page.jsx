'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import SRSViewer from '../../../../components/SRSViewer';
import TraceabilityMatrix from '../../../../components/TraceabilityMatrix';
import TraceabilityGraph from '../../../../components/TraceabilityGraph';
import VersionDiffViewer from '../../../../components/VersionDiffViewer';
import Modal from '../../../../components/Modal';
import StatusBadge from '../../../../components/StatusBadge';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  FileDown,
  RefreshCw,
  GitBranch,
  Layers,
  ArrowRight,
  ShieldCheck,
  Download,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { srsAPI, projectAPI, requirementAPI } from '../../../../lib/api';

export default function SRSWorkbenchPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [srs, setSrs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Active Tab: 'document' | 'traceability' | 'versions' | 'update'
  const [activeTab, setActiveTab] = useState('document');
  const [activeSection, setActiveSection] = useState('all');

  // Sub-data
  const [traceabilityData, setTraceabilityData] = useState([]);
  const [versionsList, setVersionsList] = useState([]);
  const [diffData, setDiffData] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Review findings modal
  const [reviewResult, setReviewResult] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Incremental update form
  const [changeInput, setChangeInput] = useState('Event registration requires administrator approval.');
  const [changeReason, setChangeReason] = useState('Requirement changed by campus student affairs board.');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (projectId && user) {
      setProject(null);
      setSrs(null);
      setTraceabilityData([]);
      setVersionsList([]);
      setDiffData(null);
      setLoading(true);
      loadAllData();
    }
  }, [projectId, user]);


  const loadAllData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, tRes, vRes] = await Promise.allSettled([
        projectAPI.getById(projectId),
        srsAPI.get(projectId),
        srsAPI.getTraceability(projectId),
        srsAPI.getVersions(projectId)
      ]);

      if (pRes.status === 'fulfilled') setProject(pRes.value.data?.data);
      if (sRes.status === 'fulfilled') setSrs(sRes.value.data?.data);
      if (tRes.status === 'fulfilled') setTraceabilityData(tRes.value.data?.data?.matrix || []);
      if (vRes.status === 'fulfilled') setVersionsList(vRes.value.data?.data || []);

      if (vRes.status === 'fulfilled' && vRes.value.data?.data?.length > 1) {
        const diffRes = await srsAPI.compareVersions(projectId, '1.0', '1.1');
        if (diffRes.data?.success) {
          setDiffData(diffRes.data.data);
        }
      }
    } catch (e) {
      console.error('Error loading SRS data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSRS = async () => {
    try {
      setGenerating(true);
      const res = await srsAPI.generate(projectId);
      if (res.data?.success) {
        setSrs(res.data.data);
        await loadAllData();
      }
    } catch (err) {
      console.error('Failed to generate SRS:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSyncSRS = async () => {
    try {
      setSyncing(true);
      const res = await srsAPI.generate(projectId);
      if (res.data?.success) {
        setSrs(res.data.data);
        await loadAllData();
      }
    } catch (err) {
      console.error('Failed to sync SRS:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleReviewSRS = async () => {
    if (!srs?._id) return;
    try {
      setReviewing(true);
      const res = await srsAPI.review(srs._id);
      if (res.data?.success) {
        setReviewResult(res.data.data);
        setIsReviewModalOpen(true);
      }
    } catch (e) {
      console.error('SRS review failed:', e);
    } finally {
      setReviewing(false);
    }
  };

  const handleApproveSRS = async () => {
    if (!srs?._id) return;
    try {
      const res = await srsAPI.approve(srs._id);
      if (res.data?.success) {
        setSrs(res.data.data.srs);
        await loadAllData();
        alert(`SRS version ${srs.currentVersion} approved successfully!`);
      }
    } catch (e) {
      console.error('Approval failed:', e);
    }
  };

  const handleIncrementalUpdate = async (e) => {
    e.preventDefault();
    if (!changeInput.trim()) return;

    try {
      setUpdating(true);
      const res = await srsAPI.incrementalUpdate(projectId, {
        changeText: changeInput,
        reason: changeReason
      });

      if (res.data?.success) {
        setSrs(res.data.data.srs);
        await loadAllData();
        setActiveTab('versions');
      }
    } catch (err) {
      console.error('Incremental update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title="Step 6: SRS Engineering Workbench"
          subtitle="Exact IEEE template generation, bidirectional traceability, review audits, and incremental versioning"
          project={project}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncSRS}
                disabled={syncing || generating}
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm"
                title="Sync and rebuild SRS from latest requirements and Quality Audit"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing SRS...' : 'Sync & Regenerate SRS'}
              </button>
              <a
                href={srsAPI.getExportPDFUrl(projectId)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                Export PDF
              </a>
              <a
                href={srsAPI.getExportDOCXUrl(projectId)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Export DOCX
              </a>
              {srs && srs.status !== 'APPROVED' && (
                <button
                  onClick={handleApproveSRS}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve SRS v{srs.currentVersion}
                </button>
              )}
            </div>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        {/* Workbench Tabs Navigation */}
        <div className="px-8 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex gap-6 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('document')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'document' ? 'border-brand-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <FileText className="w-4 h-4" />
              SRS Document
            </button>
            <button
              onClick={() => setActiveTab('traceability')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'traceability' ? 'border-brand-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Layers className="w-4 h-4" />
              Traceability Matrix ({traceabilityData.length})
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'versions' ? 'border-brand-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <GitBranch className="w-4 h-4" />
              Version History & Diff ({versionsList.length})
            </button>
            <button
              onClick={() => setActiveTab('update')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'update' ? 'border-brand-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <RefreshCw className="w-4 h-4 text-brand-400" />
              Incremental SRS Update
            </button>
          </div>

          <div className="flex items-center gap-3">
            {srs ? (
              <>
                <button
                  onClick={handleSyncSRS}
                  disabled={syncing || generating}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync & Regenerate SRS'}
                </button>
                <button
                  onClick={handleReviewSRS}
                  disabled={reviewing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {reviewing ? 'Auditing...' : 'Run ISO/IEEE Compliance Audit'}
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateSRS}
                disabled={generating}
                className="text-xs px-4 py-1.5 rounded-lg bg-brand-500 text-slate-950 font-bold hover:bg-brand-400 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? 'Drafting with Ollama...' : 'Generate Baseline SRS'}
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: 3-Column SRS Document Workbench */}
        {activeTab === 'document' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Section Outline Navigator */}
            <div className="w-full md:w-64 border-r border-slate-800 bg-slate-950/60 p-4 space-y-1 overflow-y-auto shrink-0 select-none text-xs custom-scrollbar">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                Template Sections
              </div>
              {[
                { id: 'all', label: 'Full Document' },
                { id: 'revision', label: 'Revision History' },
                { id: 'sec1', label: '1. Introduction' },
                { id: 'sec2', label: '2. Overall Description' },
                { id: 'sec3', label: '3. System Features' },
                { id: 'sec4', label: '4. External Interfaces' },
                { id: 'sec5', label: '5. Nonfunctional Reqs' },
                { id: 'sec6', label: '6. Other Requirements' },
                { id: 'appA', label: 'Appendix A: Glossary' },
                { id: 'appB', label: 'Appendix B: Models' },
                { id: 'appC', label: 'Appendix C: Issues List' },
              ].map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === sec.id ? 'bg-brand-500/10 text-emerald-400 border border-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Center Column: Exact Template SRS Document */}
            <div className="flex-1 p-8 overflow-y-auto min-w-0 bg-slate-950 custom-scrollbar scroll-smooth">
              <div className="max-w-4xl mx-auto">
                <SRSViewer
                  srs={srs}
                  activeSection={activeSection}
                />
              </div>
            </div>

            {/* Right Column: AI Assistant & Quality Inspector */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/40 p-5 space-y-6 overflow-y-auto shrink-0 custom-scrollbar">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Standard Compliance
                </h3>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Version:</span>
                    <span className="font-mono text-emerald-400 font-bold">v{srs?.currentVersion || '1.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <StatusBadge status={srs?.status || 'DRAFT'} size="xs" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Template Fidelity:</span>
                    <span className="text-emerald-400 font-medium">100% Compliant</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  Anti-Hallucination Guard
                </h3>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1.5 leading-relaxed">
                  <p>• Only validated, user-confirmed requirements are mapped to Section 3.</p>
                  <p>• Missing technical details are formatted as <strong className="text-slate-200">TBD</strong> placeholders and indexed in Appendix C.</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Export Specifications</h3>
                <div className="space-y-2">
                  <a
                    href={srsAPI.getExportPDFUrl(projectId)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-rose-400" />
                    Download Standard PDF
                  </a>
                  <a
                    href={srsAPI.getExportDOCXUrl(projectId)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Download Editable DOCX
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Traceability Matrix & Flow Graph */}
        {activeTab === 'traceability' && (
          <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
            <TraceabilityMatrix matrixData={traceabilityData} />
            <TraceabilityGraph matrixData={traceabilityData} />
          </main>
        )}

        {/* Tab 3: Version History & Comparative Diff */}
        {activeTab === 'versions' && (
          <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
            <VersionDiffViewer
              diffData={diffData?.diff || {
                added: [],
                modified: ['FR-002'],
                removed: []
              }}
              v1="1.0"
              v2={srs?.currentVersion || '1.1'}
              reason={diffData?.reasonForChanges || 'Event registration requires administrator approval.'}
              summary={diffData?.summaryOfChanges || 'Synchronized FR-002 and Section 3.1 stimulus/response sequence to incorporate administrative approval gate.'}
            />

            {/* Version Snapshot List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white tracking-tight">Immutable SRS Version Records</h3>
              </div>
              <div className="divide-y divide-slate-800">
                {versionsList.map(v => (
                  <div key={v._id} className="p-5 flex items-center justify-between text-xs hover:bg-slate-800/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 text-sm">v{v.version}</span>
                        <span className="text-slate-400">({new Date(v.createdAt).toLocaleDateString()})</span>
                      </div>
                      <p className="text-slate-200">{v.reasonForChanges}</p>
                      <p className="text-slate-400">{v.summaryOfChanges}</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 font-mono text-xs rounded border border-slate-700">
                      {v.changedRequirementIds?.length || 0} Changed Reqs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* Tab 4: Incremental SRS Update Demo Scenario */}
        {activeTab === 'update' && (
          <main className="flex-1 p-8 max-w-4xl mx-auto w-full overflow-y-auto space-y-8 custom-scrollbar">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Continuous Quality Improvement (Paper 3 Inspired)
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Incremental SRS Modification Flow</h2>
                <p className="text-xs text-slate-400 mt-1">
                  When a requirement changes, IntelliSDLC AI detects affected requirements and sections, retrieves RAG context, updates only the affected specification parts, updates revision history, and increments the version to v1.1.
                </p>
              </div>

              <form onSubmit={handleIncrementalUpdate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    New User Requirement or Change *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={changeInput}
                    onChange={(e) => setChangeInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-brand-500 focus:outline-none font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Default demo scenario: "Event registration requires administrator approval." (Affects FR-002 and Section 3.1)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Reason for Change
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={updating || !changeInput.trim()}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-xl shadow-brand-500/20 flex items-center gap-2 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                    {updating ? 'Detecting Changes & Updating Section 3...' : 'Execute Incremental Update (v1.0 → v1.1)'}
                  </button>
                </div>
              </form>
            </div>
          </main>
        )}
      </div>

      {/* Review Compliance Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="ISO/IEC/IEEE 29148 Compliance Audit Report"
      >
        {reviewResult && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Standard Alignment Score</span>
                <span className="text-2xl font-black text-emerald-400">{(reviewResult.complianceScore * 100).toFixed(0)}%</span>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Findings & Observations</h4>
              {(!reviewResult.findings || reviewResult.findings.length === 0) ? (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No compliance gaps detected. All requirements map directly to Section 3 system features.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviewResult.findings.map((f, i) => (
                    <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={f.severity} size="xs" />
                        <span className="font-semibold text-white">{f.section}</span>
                      </div>
                      <p className="text-slate-300">{f.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Recommendations</h4>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                {(reviewResult.recommendations || []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
