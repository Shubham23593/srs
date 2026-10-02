'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import { Settings, Cpu, Database, Trash2, Save, Sparkles, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server } from 'lucide-react';
import { projectAPI, systemAPI } from '../../../../lib/api';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiHealth, setAiHealth] = useState(null);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  const fetchHealth = async () => {
    setRefreshingHealth(true);
    try {
      const res = await systemAPI.getAIHealth();
      if (res.data?.success && res.data.data) {
        setAiHealth(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch AI health:', e);
    } finally {
      setRefreshingHealth(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      projectAPI.getById(projectId).then(res => {
        if (res.data?.success) setProject(res.data.data);
      }).finally(() => setLoading(false));
    }
    fetchHealth();
  }, [projectId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project and all associated requirements?')) return;
    try {
      await projectAPI.delete(projectId);
      router.push('/dashboard');
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const ollama = aiHealth?.ollama || aiHealth?.ai || {};
  const embedding = aiHealth?.embedding || {};
  const isOnline = ollama.status === 'ONLINE' || ollama.connected;
  const isRunning = ollama.modelRunning;
  const isRealEmbedding = embedding.realModel || embedding.isRealModel;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title="Project Settings & AI Engine Configuration"
          subtitle="Model parameters, embedding dimensions, RAG vector index, and lifecycle management"
          project={project}
        />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl mx-auto w-full custom-scrollbar">
          {/* AI Engine Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-600" />
                Live AI & Neural Engine Architecture
              </h3>
              <button
                onClick={fetchHealth}
                disabled={refreshingHealth}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${refreshingHealth ? 'animate-spin text-sky-600' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Ollama Service:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <span className="font-mono text-slate-900 block text-[11px] truncate">{ollama.baseUrl || 'http://127.0.0.1:11434'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Configured Model:</span>
                  <span className="text-slate-500 font-mono text-[10px]">active</span>
                </div>
                <span className="font-mono text-sky-700 font-bold block text-[11px] truncate" title={ollama.configuredModel || ollama.model}>
                  {ollama.configuredModel || ollama.model || 'Auto-detected'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Installed Locally:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ollama.modelInstalled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isOnline ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {ollama.modelInstalled ? 'YES' : isOnline ? 'NO' : 'UNKNOWN'}
                  </span>
                </div>
                <span className="text-slate-500 text-[11px] block truncate">
                  {ollama.modelInstalled ? 'Present in local Ollama library' : 'Not found in local tags'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Currently Running (/api/ps):</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {isRunning ? 'YES (IN RAM)' : 'NO (STANDBY)'}
                  </span>
                </div>
                <span className="text-slate-500 text-[11px] block truncate">
                  {isRunning ? 'Actively loaded in memory' : 'Standby (loads on request)'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Embedding Model:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isRealEmbedding ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {isRealEmbedding ? 'LOADED' : 'FALLBACK'}
                  </span>
                </div>
                <span className="font-mono text-purple-700 font-bold block text-[11px] truncate">
                  {embedding.modelName || 'Xenova/multilingual-e5-small'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Vector Dimensions:</span>
                  <span className="font-mono text-slate-900 text-[10px] font-bold">
                    {embedding.dimensions || 384}-dim
                  </span>
                </div>
                <span className="text-slate-600 block text-[11px] truncate">
                  {embedding.engine || (isRealEmbedding ? 'Transformers.js / ONNX Runtime' : 'Deterministic')}
                </span>
              </div>
            </div>
          </div>

          {/* RAG Vector Index Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              RAG Semantic Vector Store
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Stores normalized sentence embeddings for project scope, interview messages, atomic requirements, and SRS sections for context retrieval.
            </p>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                MongoDB Vector Store Active
              </span>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-rose-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-rose-700 tracking-tight flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Danger Zone
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Permanently delete this project, including its interview sessions, extracted requirements, SRS documents, and traceability links.
            </p>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
            >
              Delete Project
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

