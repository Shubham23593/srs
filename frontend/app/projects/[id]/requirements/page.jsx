'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import ProjectStepper from '../../../../components/ProjectStepper';
import RequirementCard from '../../../../components/RequirementCard';
import Modal from '../../../../components/Modal';
import {
  ListFilter,
  Plus,
  Sparkles,
  FileText,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { requirementAPI, projectAPI } from '../../../../lib/api';

export default function RequirementsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);

  const [newReq, setNewReq] = useState({
    title: '',
    description: '',
    type: 'FUNCTIONAL',
    category: 'Core Features',
    priority: 'HIGH'
  });

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

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
      console.error('Failed to load requirements:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReq = async (e) => {
    e.preventDefault();
    try {
      const res = await requirementAPI.create(projectId, newReq);
      if (res.data?.success) {
        setRequirements(prev => [...prev, res.data.data]);
        setIsAddOpen(false);
        setNewReq({
          title: '',
          description: '',
          type: 'FUNCTIONAL',
          category: 'Core Features',
          priority: 'HIGH'
        });
      }
    } catch (err) {
      console.error('Failed to create requirement:', err);
    }
  };

  const handleExtractReqs = async (e) => {
    e.preventDefault();
    if (!extractText.trim()) return;

    try {
      setExtractLoading(true);
      const res = await requirementAPI.extract(projectId, extractText);
      if (res.data?.success) {
        setIsExtractOpen(false);
        setExtractText('');
        loadData();
      }
    } catch (err) {
      console.error('Extraction error:', err);
    } finally {
      setExtractLoading(false);
    }
  };

  const handleDeleteReq = async (reqId) => {
    if (!confirm('Are you sure you want to remove this requirement?')) return;
    try {
      await requirementAPI.delete(reqId);
      setRequirements(prev => prev.filter(r => (r._id !== reqId && r.requirementId !== reqId)));
    } catch (err) {
      console.error('Failed to delete requirement:', err);
    }
  };

  const activeReqs = requirements.filter(r => r.status !== 'DEPRECATED');

  const filteredReqs = activeReqs.filter(r => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.requirementId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const frCount = activeReqs.filter(r => r.type === 'FUNCTIONAL').length;
  const nfrCount = activeReqs.filter(r => r.type === 'NON_FUNCTIONAL').length;
  const conCount = activeReqs.filter(r => r.type === 'CONSTRAINT').length;
  const asmCount = activeReqs.filter(r => r.type === 'ASSUMPTION').length;
  const intCount = activeReqs.filter(r => r.type === 'INTERFACE').length;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 3: Requirements Engineering Catalog"
          subtitle="Atomic, categorized, and traceable specifications with stable ID tracking"
          project={project}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExtractOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                AI Batch Extract
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Requirement
              </button>
              <Link
                href={`/projects/${projectId}/analysis`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 ml-2"
              >
                <span>Next: Step 4 (Quality Audit)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          }
        />

        {/* Guided Step-by-Step Stepper */}
        <ProjectStepper projectId={projectId} currentStatus={project?.status} />

        <main className="flex-1 p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Controls & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'ALL' ? 'bg-brand-500/10 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({activeReqs.length})
              </button>
              <button
                onClick={() => setFilterType('FUNCTIONAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'FUNCTIONAL' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                FR ({frCount})
              </button>
              <button
                onClick={() => setFilterType('NON_FUNCTIONAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'NON_FUNCTIONAL' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                NFR ({nfrCount})
              </button>
              <button
                onClick={() => setFilterType('CONSTRAINT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'CONSTRAINT' ? 'bg-orange-500/10 text-orange-300 border border-orange-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Constraints ({conCount})
              </button>
              <button
                onClick={() => setFilterType('ASSUMPTION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'ASSUMPTION' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Assumptions ({asmCount})
              </button>
              <button
                onClick={() => setFilterType('INTERFACE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'INTERFACE' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Interfaces ({intCount})
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by ID, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Requirements Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Loading requirements...</div>
          ) : filteredReqs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
              <Layers className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Requirements Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Elicit requirements through the AI Interview or use the AI Batch Extract tool to parse stakeholder notes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReqs.map(req => (
                <RequirementCard
                  key={req._id || req.requirementId}
                  requirement={req}
                  onDelete={handleDeleteReq}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Manual Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Define New Requirement">
        <form onSubmit={handleCreateReq} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Student Event Registration"
              value={newReq.title}
              onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Requirement Statement (The system shall...) *</label>
            <textarea
              rows={3}
              required
              placeholder="Students shall register for available events and receive confirmation."
              value={newReq.description}
              onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Type</label>
              <select
                value={newReq.type}
                onChange={(e) => setNewReq({ ...newReq, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="FUNCTIONAL">FUNCTIONAL (FR)</option>
                <option value="NON_FUNCTIONAL">NON-FUNCTIONAL (NFR)</option>
                <option value="CONSTRAINT">CONSTRAINT (CON)</option>
                <option value="ASSUMPTION">ASSUMPTION (ASM)</option>
                <option value="INTERFACE">INTERFACE (INT)</option>
                <option value="STAKEHOLDER">STAKEHOLDER (STK)</option>
              </select>

            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Security, Core"
                value={newReq.category}
                onChange={(e) => setNewReq({ ...newReq, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Priority</label>
              <select
                value={newReq.priority}
                onChange={(e) => setNewReq({ ...newReq, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-brand-400"
            >
              Save Requirement
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Batch Extract Modal */}
      <Modal isOpen={isExtractOpen} onClose={() => setIsExtractOpen(false)} title="AI Atomic Requirement Extraction">
        <form onSubmit={handleExtractReqs} className="space-y-4">
          <p className="text-xs text-slate-400">
            Paste meeting notes, customer transcripts, or unstructured specification paragraphs. The agent will extract atomic FRs and NFRs conforming to ISO/IEC/IEEE 29148.
          </p>
          <textarea
            rows={6}
            required
            placeholder="Paste raw requirements text here..."
            value={extractText}
            onChange={(e) => setExtractText(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsExtractOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={extractLoading || !extractText.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {extractLoading ? 'Extracting with Ollama...' : 'Extract Atomic Reqs'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
