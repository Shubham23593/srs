'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import StatusBadge from '../../../../components/StatusBadge';
import {
  MessageSquareCode,
  Send,
  SkipForward,
  CheckCircle2,
  Sparkles,
  User,
  Bot,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Languages,
  Check,
  FileCheck2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { interviewAPI, projectAPI, requirementAPI, srsAPI } from '../../../../lib/api';

import { useAuth } from '../../../../context/AuthContext';

const DEFAULT_SECTIONS = [
  { id: 'PROJECT_INFORMATION', name: 'Project Information', stepIndex: 1, description: 'Problem statement, core objective, scope' },
  { id: 'STAKEHOLDERS_AND_USERS', name: 'Stakeholders & Users', stepIndex: 2, description: 'Target users, clients, managers, admins' },
  { id: 'USER_ROLES_AND_PERMISSIONS', name: 'User Roles & Permissions', stepIndex: 3, description: 'Role hierarchy, access control rules' },
  { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', stepIndex: 4, description: 'Core features, workflows, atomic actions' },
  { id: 'NON_FUNCTIONAL_REQUIREMENTS', name: 'Non-Functional Requirements', stepIndex: 5, description: 'Performance, security, scalability' },
  { id: 'EXTERNAL_INTERFACES', name: 'External Interfaces', stepIndex: 6, description: 'APIs, payment gateways, databases' },
  { id: 'CONSTRAINTS', name: 'Constraints', stepIndex: 7, description: 'Tech stack, budget, time limits, legal' },
  { id: 'ASSUMPTIONS_AND_DEPENDENCIES', name: 'Assumptions & Dependencies', stepIndex: 8, description: 'Assumptions, 3rd-party services' },
  { id: 'REVIEW_AND_CONFIRMATION', name: 'Review & Confirmation', stepIndex: 9, description: 'Requirements summary & lock confirmation' }
];

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sectionsConfig, setSectionsConfig] = useState(DEFAULT_SECTIONS);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [extractedReqs, setExtractedReqs] = useState([]);
  const [reqFilter, setReqFilter] = useState('ALL');
  const [summary, setSummary] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (projectId && user) {
      loadSession();
    }
  }, [projectId, user]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSession = async () => {
    try {
      const [pRes, iRes, rRes] = await Promise.all([
        projectAPI.getById(projectId),
        interviewAPI.start(projectId),
        requirementAPI.getAll(projectId)
      ]);

      if (pRes.data?.success) setProject(pRes.data.data);
      if (iRes.data?.success) {
        setSession(iRes.data.data.session);
        setMessages(iRes.data.data.messages || []);
        if (iRes.data.data.sectionsConfig) {
          setSectionsConfig(iRes.data.data.sectionsConfig);
        }
        if (iRes.data.data.summary) {
          setSummary(iRes.data.data.summary);
        }
      }
      if (rRes.data?.success) {
        setExtractedReqs(rRes.data.data || []);
      }
    } catch (e) {
      console.error('Failed to initialize interview session:', e);
    }
  };

  const handleSendMessage = async (actionType = 'ANSWER') => {
    if (actionType === 'ANSWER' && !inputText.trim()) return;
    if (session?.isLocked || session?.status === 'COMPLETED') return;

    try {
      setLoading(true);
      const textToSend = actionType === 'ANSWER' ? inputText : '';
      setInputText('');

      if (actionType === 'ANSWER') {
        setMessages(prev => [...prev, {
          sender: 'USER',
          content: textToSend,
          section: session?.currentSection || 'PROJECT_INFORMATION',
          topic: session?.currentTopic || 'Project Information',
          timestamp: new Date()
        }]);
      }

      const res = await interviewAPI.send(projectId, {
        content: textToSend,
        action: actionType
      });

      if (res.data?.success) {
        const { session: updatedSession, aiMessage, summary: updatedSummary } = res.data.data;
        if (updatedSession) setSession(updatedSession);
        if (updatedSummary) setSummary(updatedSummary);
        if (aiMessage) {
          setMessages(prev => [...prev, aiMessage]);
        }

        const reqRes = await requirementAPI.getAll(projectId);
        if (reqRes.data?.success) {
          setExtractedReqs(reqRes.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to send interview message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndLock = async () => {
    try {
      setLocking(true);
      const res = await interviewAPI.send(projectId, {
        action: 'CONFIRM_AND_LOCK'
      });

      if (res.data?.success) {
        setSession(res.data.data.session);
        if (res.data.data.summary) setSummary(res.data.data.summary);

        // Generate baseline SRS or route to Step 6
        try {
          await srsAPI.generate(projectId);
        } catch (srsErr) {
          console.warn('SRS baseline generation on confirm:', srsErr);
        }

        router.push(`/projects/${projectId}/srs`);
      }
    } catch (e) {
      console.error('Error locking requirements:', e);
    } finally {
      setLocking(false);
    }
  };

  const handleReopenInterview = async () => {
    try {
      const res = await interviewAPI.send(projectId, {
        action: 'REOPEN'
      });
      if (res.data?.success) {
        setSession(res.data.data.session);
      }
    } catch (e) {
      console.error('Error reopening interview:', e);
    }
  };

  const currentSectionIdx = session?.sectionIndex || 0;
  const currentSectionConfig = sectionsConfig[currentSectionIdx] || sectionsConfig[0];
  const coveragePercent = session?.coverage || 15;
  const isLocked = session?.isLocked || session?.status === 'COMPLETED';
  const isAwaitingConfirmation = session?.status === 'AWAITING_CONFIRMATION' || currentSectionIdx === 8;

  const filteredExtractedReqs = extractedReqs.filter(r => {
    if (reqFilter === 'ALL') return true;
    if (reqFilter === 'FUNCTIONAL') return r.type === 'FUNCTIONAL';
    if (reqFilter === 'NON_FUNCTIONAL') return r.type === 'NON_FUNCTIONAL';
    if (reqFilter === 'CONSTRAINT') return r.type === 'CONSTRAINT';
    return true;
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 2: AI Requirements Interview"
          subtitle="9-Stage ISO/IEC/IEEE 29148 State Machine Elicitation with Real-Time Context Guard & Deduplication"
          project={project}
          actions={
            <div className="flex items-center gap-2">
              {isLocked ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Requirements Locked
                  </span>
                  <Link
                    href={`/projects/${projectId}/srs`}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                  >
                    <span>View Generated SRS (Step 6)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : isAwaitingConfirmation ? (
                <button
                  onClick={handleConfirmAndLock}
                  disabled={locking}
                  className="px-4 py-2 bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {locking ? 'Locking & Generating SRS...' : 'Confirm & Generate SRS'}
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage('SKIP_SECTION')}
                  disabled={loading}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Next Section
                </button>
              )}
            </div>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Column: 9-Section State Machine Navigator */}
          <div className="w-full lg:w-72 border-r border-slate-800 bg-slate-950/80 p-4 space-y-4 overflow-y-auto shrink-0 select-none">
            {/* Overall Coverage Card */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Interview Coverage</span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">{coveragePercent}%</span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{session?.sectionsState?.filter(s => s.status === 'COMPLETED').length || 0} of 9 Sections Done</span>
                <span className="font-mono text-emerald-400 font-bold">{extractedReqs.length} Reqs</span>
              </div>
            </div>

            {/* Section Checklist */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                Requirements Lifecycle Flow
              </div>

              {sectionsConfig.map((sec, idx) => {
                const secState = session?.sectionsState?.find(s => s.id === sec.id) || { status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED' };
                const isCurrent = session?.sectionIndex === idx;
                const isDone = secState.status === 'COMPLETED';

                return (
                  <div
                    key={sec.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                      isCurrent
                        ? 'bg-brand-500/10 border-brand-500/40 text-white shadow-md'
                        : isDone
                        ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                        : 'bg-transparent border-transparent text-slate-400'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[9px] font-mono">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold truncate ${isCurrent ? 'text-emerald-300' : isDone ? 'text-slate-200' : 'text-slate-400'}`}>
                          {sec.stepIndex}. {sec.name}
                        </span>
                        {isDone && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{sec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Interactive Chat Stream */}
          <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-950 min-w-0">
            {/* Top Section Banner */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Current Stage:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-emerald-300 font-bold uppercase tracking-wider text-[10px]">
                  Step {currentSectionConfig.stepIndex} • {currentSectionConfig.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Languages className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Multilingual (EN / HI / Hinglish)</span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  {messages.length} exchanges
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isAI = msg.sender === 'AI';
                const isOutOfScopeAlert = msg.isOutOfScope;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 ${
                      isAI
                        ? isOutOfScopeAlert
                          ? 'bg-gradient-to-tr from-amber-500 to-rose-400 text-white'
                          : 'bg-gradient-to-tr from-brand-500 to-emerald-400'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {isAI ? (isOutOfScopeAlert ? <ShieldAlert className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" />) : <User className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                      isAI
                        ? isOutOfScopeAlert
                          ? 'bg-amber-950/20 border border-amber-500/30 text-amber-200 shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-md'
                        : 'bg-brand-600 text-slate-950 font-medium'
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] opacity-75">
                        <span className="font-bold">
                          {isAI ? (isOutOfScopeAlert ? 'Context Guard Warning' : 'AI Requirements Engineer') : 'You (Requirements Analyst)'}
                        </span>
                        <div className="flex items-center gap-2">
                          {msg.languageDetected && msg.languageDetected !== 'English' && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 border border-slate-800 text-brand-300 font-mono text-[9px]">
                              {msg.languageDetected}
                            </span>
                          )}
                          {msg.topic && <span>#{msg.topic}</span>}
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {msg.extractedRequirementIds?.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Extracted Atomic Reqs:
                          </span>
                          {msg.extractedRequirementIds.map(rid => (
                            <span key={rid} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[10px] font-bold">
                              {rid}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Step 9 Confirmation Card in Stream */}
              {isAwaitingConfirmation && !isLocked && (
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Stage 9: Requirements Elicitation Summary</h4>
                      <p className="text-xs text-slate-400">All required sections complete. Ready for locking and ISO/IEC/IEEE 29148 SRS generation.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Functional (FR)</span>
                      <span className="text-lg font-bold text-blue-400">{summary?.functionalCount || extractedReqs.filter(r => r.type === 'FUNCTIONAL').length}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Non-Functional (NFR)</span>
                      <span className="text-lg font-bold text-purple-400">{summary?.nonFunctionalCount || extractedReqs.filter(r => r.type === 'NON_FUNCTIONAL').length}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Constraints</span>
                      <span className="text-lg font-bold text-amber-400">{summary?.constraintsCount || extractedReqs.filter(r => r.type === 'CONSTRAINT').length}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Coverage</span>
                      <span className="text-lg font-bold text-emerald-400">{coveragePercent}%</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/projects/${projectId}/requirements`}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                    >
                      Review Requirements Table
                    </Link>

                    <button
                      onClick={handleConfirmAndLock}
                      disabled={locking}
                      className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {locking ? 'Locking Specifications...' : 'Confirm & Generate SRS'}
                    </button>
                  </div>
                </div>
              )}

              {/* Locked Notice */}
              {isLocked && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-white">Interview Session Completed & Requirements Locked</div>
                      <div className="text-slate-400">Requirements are locked for baseline SRS v1.0. You can unlock to refine specifications.</div>
                    </div>
                  </div>

                  <button
                    onClick={handleReopenInterview}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                    Reopen for Refinement
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-3 text-xs text-slate-400 italic p-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  AI analyzing context, verifying ISO/IEC/IEEE rules, and checking duplicates...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60">
              {!isLocked ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('SKIP_SECTION')}
                        disabled={loading}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        Skip Section ({currentSectionConfig.name})
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 italic">
                      Tip: You can respond in English, Hindi, or Hinglish.
                    </span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage('ANSWER');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Provide details for ${currentSectionConfig.name} (e.g. "Admin ko users manage karna chahiye", "Response time < 2s")...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={loading}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loading || !inputText.trim()}
                      className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-brand-500/20"
                    >
                      <Send className="w-4 h-4" />
                      Answer
                    </button>
                  </form>
                </>
              ) : (
                <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Interview is complete. Requirements are locked for baseline SRS generation.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Extracted Requirements Drawer */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/40 p-5 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Live Extracted Reqs ({extractedReqs.length})
              </h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mb-3 text-[10px] font-semibold border-b border-slate-800 pb-2">
              <button
                onClick={() => setReqFilter('ALL')}
                className={`px-2 py-1 rounded ${reqFilter === 'ALL' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({extractedReqs.length})
              </button>
              <button
                onClick={() => setReqFilter('FUNCTIONAL')}
                className={`px-2 py-1 rounded ${reqFilter === 'FUNCTIONAL' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                FR ({extractedReqs.filter(r => r.type === 'FUNCTIONAL').length})
              </button>
              <button
                onClick={() => setReqFilter('NON_FUNCTIONAL')}
                className={`px-2 py-1 rounded ${reqFilter === 'NON_FUNCTIONAL' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                NFR ({extractedReqs.filter(r => r.type === 'NON_FUNCTIONAL').length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredExtractedReqs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Respond to AI interview questions to extract atomic requirements live.
                </div>
              ) : (
                filteredExtractedReqs.map((req) => (
                  <div
                    key={req._id || req.requirementId}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 shadow-sm hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-xs text-brand-400">{req.requirementId}</span>
                      <StatusBadge status={req.type} size="xs" />
                    </div>
                    <div className="font-semibold text-xs text-white">{req.title}</div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-3">{req.description}</p>
                    {req.nfrSubcategory && req.nfrSubcategory !== 'N/A' && (
                      <span className="inline-block text-[9px] font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                        {req.nfrSubcategory}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-3 space-y-2">
              <Link
                href={`/projects/${projectId}/requirements`}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Requirements Table (Step 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

