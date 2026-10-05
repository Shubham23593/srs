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
      setProject(null);
      setSession(null);
      setMessages([]);
      setExtractedReqs([]);
      setSummary(null);
      loadSession();
    }
  }, [projectId, user]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSession = async () => {
    try {
      const [pRes, iRes, rRes] = await Promise.allSettled([
        projectAPI.getById(projectId),
        interviewAPI.start(projectId),
        requirementAPI.getAll(projectId)
      ]);

      if (pRes.status === 'fulfilled' && pRes.value.data?.success) {
        setProject(pRes.value.data.data);
      } else {
        try {
          const all = await projectAPI.getAll();
          const f = (all.data?.data || []).find(p => p._id === projectId || p.projectId === projectId);
          if (f) setProject(f);
        } catch (err) { }
      }

      if (iRes.status === 'fulfilled' && iRes.value.data?.success) {
        setSession(iRes.value.data.data.session);
        setMessages(iRes.value.data.data.messages || []);
        if (iRes.value.data.data.sectionsConfig) {
          setSectionsConfig(iRes.value.data.data.sectionsConfig);
        }
        if (iRes.value.data.data.summary) {
          setSummary(iRes.value.data.data.summary);
        }
      }

      if (rRes.status === 'fulfilled' && rRes.value.data?.success) {
        setExtractedReqs(rRes.value.data.data || []);
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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span className="text-white font-bold">{locking ? 'Locking & Generating SRS...' : 'Confirm & Generate SRS'}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage('SKIP_SECTION')}
                  disabled={loading}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <SkipForward className="w-4 h-4 text-slate-700" />
                  <span className="text-slate-800 font-bold">Next Section</span>
                </button>
              )}
            </div>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
          {/* Left Column: 9-Section State Machine Navigator */}
          <div className="w-full lg:w-72 border-r border-slate-200 bg-white p-4 space-y-4 overflow-y-auto shrink-0 select-none custom-scrollbar">
            {/* Overall Coverage Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Interview Coverage</span>
                <span className="font-mono font-extrabold text-emerald-700 text-sm">{coveragePercent}%</span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 font-medium">
                <span>{session?.sectionsState?.filter(s => s.status === 'COMPLETED').length || 0} of 9 Sections Done</span>
                <span className="font-mono text-emerald-700 font-bold">{extractedReqs.length} Reqs</span>
              </div>
            </div>

            {/* Section Checklist */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-2 py-1 mb-1">
                Requirements Lifecycle Flow
              </div>

              {sectionsConfig.map((sec, idx) => {
                const secState = session?.sectionsState?.find(s => s.id === sec.id) || { status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED' };
                const isCurrent = session?.sectionIndex === idx;
                const isDone = secState.status === 'COMPLETED';
                const isSkipped = secState.status === 'SKIPPED';

                return (
                  <div
                    key={sec.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${isCurrent
                        ? 'bg-blue-50 border-blue-400 text-slate-900 shadow-sm'
                        : isDone
                          ? 'bg-white border-slate-200 text-slate-800'
                          : isSkipped
                            ? 'bg-slate-50 border-slate-200 text-slate-600 opacity-80'
                            : 'bg-transparent border-transparent text-slate-600'
                      }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : isSkipped ? (
                        <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
                          <SkipForward className="w-2.5 h-2.5" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-mono border border-slate-300">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isCurrent ? 'text-blue-700' : isDone ? 'text-slate-900' : isSkipped ? 'text-slate-700' : 'text-slate-700'}`}>
                          {sec.stepIndex}. {sec.name}
                        </span>
                        {isDone && (
                          <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 font-bold">
                            Done
                          </span>
                        )}
                        {isSkipped && (
                          <span className="text-[9px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 font-bold">
                            Skipped
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{sec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Interactive Chat Stream */}
          <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50 min-w-0">
            {/* Top Section Banner */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-[11px] font-medium">Current Stage:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold uppercase tracking-wider text-[10px]">
                  Step {currentSectionConfig.stepIndex} • {currentSectionConfig.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                  <Languages className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Multilingual (EN / HI / Hinglish)</span>
                </div>
                <div className="text-slate-600 font-mono text-[11px] font-medium">
                  {messages.length} exchanges
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar scroll-smooth">
              {messages.map((msg, idx) => {
                const isAI = msg.sender === 'AI';
                const isOutOfScopeAlert = msg.isOutOfScope;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ${isAI
                        ? isOutOfScopeAlert
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-white border border-slate-700'
                      }`}>
                      {isAI ? (
                        isOutOfScopeAlert ? <ShieldAlert className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />
                      ) : user?.avatar ? (
                        <img src={user.avatar} alt={user?.name || 'User DP'} className="w-full h-full object-cover" />
                      ) : (
                        <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>

                    <div className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${isAI
                        ? isOutOfScopeAlert
                          ? 'bg-amber-50 border border-amber-300 text-slate-900 shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                        : 'bg-blue-50 text-slate-950 font-medium border border-blue-200 shadow-sm'
                      }`}>
                      <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px]">
                        <span className={`font-bold ${isAI ? (isOutOfScopeAlert ? 'text-amber-950 font-extrabold' : 'text-slate-900 font-extrabold') : 'text-slate-950 font-extrabold'}`}>
                          {isAI ? (isOutOfScopeAlert ? 'Context Guard Warning' : 'AI Requirements Engineer') : `${user?.name || 'You'} (Requirements Analyst)`}
                        </span>
                        <div className="flex items-center gap-2">
                          {msg.languageDetected && msg.languageDetected !== 'English' && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-blue-700 font-mono text-[9px] font-bold">
                              {msg.languageDetected}
                            </span>
                          )}
                          {msg.topic && <span className={isAI && isOutOfScopeAlert ? 'text-amber-900 font-bold' : !isAI ? 'text-blue-900 font-bold' : 'text-blue-700 font-bold'}>#{msg.topic}</span>}
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap text-slate-800 font-medium">{msg.content}</p>

                      {msg.extractedRequirementIds?.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Extracted Atomic Reqs:
                          </span>
                          {msg.extractedRequirementIds.map(rid => (
                            <span key={rid} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[10px] font-bold">
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
                <div className="p-5 bg-white border border-emerald-500/40 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                      <FileCheck2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Stage 9: Requirements Elicitation Summary</h4>
                      <p className="text-xs text-slate-600 font-medium">All required sections complete. Ready for locking and ISO/IEC/IEEE 29148 SRS generation.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Functional (FR)</span>
                      <span className="text-lg font-bold text-blue-600">{summary?.functionalCount || extractedReqs.filter(r => r.type === 'FUNCTIONAL').length}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Non-Functional (NFR)</span>
                      <span className="text-lg font-bold text-purple-600">{summary?.nonFunctionalCount || extractedReqs.filter(r => r.type === 'NON_FUNCTIONAL').length}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Constraints</span>
                      <span className="text-lg font-bold text-amber-600">{summary?.constraintsCount || extractedReqs.filter(r => r.type === 'CONSTRAINT').length}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Coverage</span>
                      <span className="text-lg font-bold text-emerald-600">{coveragePercent}%</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/projects/${projectId}/requirements`}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-sm transition-colors"
                    >
                      <span className="text-slate-800 font-bold">Review Requirements Table</span>
                    </Link>

                    <button
                      onClick={handleConfirmAndLock}
                      disabled={locking}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">{locking ? 'Locking Specifications...' : 'Confirm & Generate SRS'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Locked Notice */}
              {isLocked && (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Interview Session Completed & Requirements Locked</div>
                      <div className="text-slate-600 font-medium">Requirements are locked for baseline SRS v1.0. You can unlock to refine specifications.</div>
                    </div>
                  </div>

                  <button
                    onClick={handleReopenInterview}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-lg border border-slate-300 shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Unlock className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-900 font-bold">Reopen for Refinement</span>
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-3 text-xs text-slate-500 italic p-2 font-medium">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                  AI analyzing context, verifying ISO/IEC/IEEE rules, and checking duplicates...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200 bg-white">
              {!isLocked ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('SKIP_SECTION')}
                        disabled={loading}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm transition-colors flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-700 font-semibold">Skip Section ({currentSectionConfig.name})</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-500 italic font-medium">
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
                      className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading || !inputText.trim()}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Send className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">Answer</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="py-2 text-center text-xs text-slate-600 flex items-center justify-center gap-2 font-medium">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Interview is complete. Requirements are locked for baseline SRS generation.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Extracted Requirements Drawer */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-5 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-slate-900 font-bold">Live Extracted Reqs ({extractedReqs.length})</span>
              </h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mb-3 text-[10px] font-semibold border-b border-slate-200 pb-2">
              <button
                onClick={() => setReqFilter('ALL')}
                className={`px-2 py-1 rounded font-bold transition-all ${reqFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
              >
                All ({extractedReqs.length})
              </button>
              <button
                onClick={() => setReqFilter('FUNCTIONAL')}
                className={`px-2 py-1 rounded font-bold transition-all ${reqFilter === 'FUNCTIONAL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
              >
                FR ({extractedReqs.filter(r => r.type === 'FUNCTIONAL').length})
              </button>
              <button
                onClick={() => setReqFilter('NON_FUNCTIONAL')}
                className={`px-2 py-1 rounded font-bold transition-all ${reqFilter === 'NON_FUNCTIONAL' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
              >
                NFR ({extractedReqs.filter(r => r.type === 'NON_FUNCTIONAL').length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {filteredExtractedReqs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-medium">
                  Respond to AI interview questions to extract atomic requirements live.
                </div>
              ) : (
                filteredExtractedReqs.map((req) => (
                  <div
                    key={req._id || req.requirementId}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-xs text-blue-600">{req.requirementId}</span>
                      <StatusBadge status={req.type} size="xs" />
                    </div>
                    <div className="font-bold text-xs text-slate-900">{req.title}</div>
                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-3 font-medium">{req.description}</p>
                    {req.nfrSubcategory && req.nfrSubcategory !== 'N/A' && (
                      <span className="inline-block text-[9px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                        {req.nfrSubcategory}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 mt-3 space-y-2">
              <Link
                href={`/projects/${projectId}/requirements`}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="text-slate-800 font-bold">Requirements Table (Step 3)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

