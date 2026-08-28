'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import { Settings, Cpu, Database, Trash2, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { projectAPI } from '../../../../lib/api';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      projectAPI.getById(projectId).then(res => {
        if (res.data?.success) setProject(res.data.data);
      }).finally(() => setLoading(false));
    }
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

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Project Settings & AI Engine Configuration"
          subtitle="Model parameters, embedding dimensions, RAG vector index, and lifecycle management"
          project={project}
        />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-4xl mx-auto w-full">
          {/* AI Engine Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-400" />
              Primary AI Engine Architecture
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">AI Provider:</span>
                <span className="font-mono text-emerald-400 font-bold">Ollama (Local Provider)</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Base URL:</span>
                <span className="font-mono text-slate-200">http://localhost:11434</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">LLM Model:</span>
                <span className="font-mono text-slate-200">codellama:7b-instruct</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Embedding Model:</span>
                <span className="font-mono text-slate-200">BAAI/bge-small-en-v1.5 (384-dim)</span>
              </div>
            </div>
          </div>

          {/* RAG Vector Index Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              RAG Semantic Vector Store
            </h3>
            <p className="text-xs text-slate-400">
              Stores normalized sentence embeddings for project scope, interview messages, atomic requirements, and SRS sections for context retrieval.
            </p>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                MongoDB Vector Store Active
              </span>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-slate-900 border border-rose-500/20 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-rose-400 tracking-tight flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Danger Zone
            </h3>
            <p className="text-xs text-slate-400">
              Permanently delete this project, including its interview sessions, extracted requirements, SRS documents, and traceability links.
            </p>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Delete Project
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
