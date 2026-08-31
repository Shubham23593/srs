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
  ArrowRight,
  CheckSquare,
  Square,
  AlertTriangle,
  Edit2,
  Trash2,
  RefreshCw
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
  const [showArchived, setShowArchived] = useState(false);

  // Manual Add Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newReq, setNewReq] = useState({
    title: '',
    description: '',
    type: 'FUNCTIONAL',
    category: 'Core Features',
    priority: 'HIGH'
  });

  // Edit Modal state (Priority 3)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReq, setEditingReq] = useState(null);

  // AI Extract & Preview Modal states (Priority 6)
  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCandidates, setPreviewCandidates] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Priority 13: Reset state immediately when projectId changes
  useEffect(() => {
    if (projectId) {
      setRequirements([]);
      setProject(null);
      setLoading(true);
      loadData();
    }
  }, [projectId, showArchived]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, rRes] = await Promise.all([
        projectAPI.getById(projectId),
        requirementAPI.getAll(projectId, { includeArchived: showArchived ? 'true' : 'false' })
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
      const res = await requirementAPI.create(projectId, { ...newReq, source: 'MANUAL' });
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

  const handleEditClick = (req) => {
    setEditingReq({ ...req });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReq) return;
    try {
      const res = await requirementAPI.update(editingReq._id || editingReq.requirementId, editingReq);
      if (res.data?.success) {
        setRequirements(prev => prev.map(r => (r._id === editingReq._id || r.requirementId === editingReq.requirementId) ? res.data.data : r));
        setIsEditOpen(false);
        setEditingReq(null);
      }
    } catch (err) {
      console.error('Failed to update requirement:', err);
    }
  };

  const handleDeleteReq = async (reqId) => {
    if (!confirm('Are you sure you want to delete this requirement? It will be completely removed.')) return;
    try {
      await requirementAPI.delete(reqId);
      setRequirements(prev => prev.filter(r => (r._id !== reqId && r.requirementId !== reqId)));
    } catch (err) {
      console.error('Failed to delete requirement:', err);
    }
  };

  const handleArchiveReq = async (reqId) => {
    try {
      const res = await requirementAPI.archive(reqId);
      if (res.data?.success) {
        if (!showArchived) {
          setRequirements(prev => prev.filter(r => (r._id !== reqId && r.requirementId !== reqId)));
        } else {
          setRequirements(prev => prev.map(r => (r._id === reqId || r.requirementId === reqId) ? res.data.data : r));
        }
      }
    } catch (err) {
      console.error('Failed to toggle archive requirement:', err);
    }
  };

  const handleRevalidateReq = async (reqId) => {
    try {
      const res = await requirementAPI.revalidate(reqId);
      if (res.data?.success) {
        setRequirements(prev => prev.map(r => (r._id === reqId || r.requirementId === reqId) ? res.data.data : r));
      }
    } catch (err) {
      console.error('Failed to revalidate requirement:', err);
    }
  };

  // AI Extraction Preview Flow (Priority 6)
  const handleExtractReqs = async (e) => {
    e.preventDefault();
    if (!extractText.trim()) return;

    try {
      setExtractLoading(true);
      const res = await requirementAPI.extractPreview(projectId, extractText);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPreviewCandidates(res.data.data.map(item => ({ ...item, selected: true })));
        setIsExtractOpen(false);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      console.error('Extraction preview error:', err);
    } finally {
      setExtractLoading(false);
    }
  };

  const toggleCandidateSelection = (tempId) => {
    setPreviewCandidates(prev => prev.map(c => c.tempId === tempId ? { ...c, selected: !c.selected } : c));
  };

  const selectAllCandidates = (select) => {
    setPreviewCandidates(prev => prev.map(c => ({ ...c, selected: select })));
  };

  const updateCandidateField = (tempId, field, val) => {
    setPreviewCandidates(prev => prev.map(c => c.tempId === tempId ? { ...c, [field]: val } : c));
  };

  const handleSaveSelectedCandidates = async () => {
    const selected = previewCandidates.filter(c => c.selected);
    if (selected.length === 0) return;

    try {
      setSavingBatch(true);
      const res = await requirementAPI.batchCreate(projectId, selected);
      if (res.data?.success) {
        setIsPreviewOpen(false);
        setExtractText('');
        setPreviewCandidates([]);
        loadData();
      }
    } catch (err) {
      console.error('Batch save error:', err);
    } finally {
      setSavingBatch(false);
    }
  };

  const filteredReqs = requirements.filter(r => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.requirementId?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        (r.normalizedDescription || r.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const frCount = requirements.filter(r => r.type === 'FUNCTIONAL').length;
  const nfrCount = requirements.filter(r => r.type === 'NON_FUNCTIONAL').length;
  const selectedCount = previewCandidates.filter(c => c.selected).length;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Step 3: Requirements Engineering Catalog"
          subtitle="Atomic, categorized, and traceable specifications with provenance and context relevance"
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === 'ALL' ? 'bg-brand-500/10 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({requirements.length})
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
                Constraints ({requirements.filter(r => r.type === 'CONSTRAINT').length})
              </button>

              <label className="flex items-center gap-1.5 text-xs text-slate-400 ml-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-0"
                />
                Show Archived
              </label>
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
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
              Loading project requirements...
            </div>
          ) : filteredReqs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
              <Layers className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Requirements in Catalog</h4>
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
                  onEdit={handleEditClick}
                  onDelete={handleDeleteReq}
                  onArchive={handleArchiveReq}
                  onRevalidate={handleRevalidateReq}
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
              placeholder="e.g. Patient Queue Position Notification"
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
              placeholder="The system shall notify patients of real-time queue position updates via SMS."
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
                placeholder="e.g. Queue Management"
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

      {/* Edit Requirement Modal (Priority 3) */}
      {isEditOpen && editingReq && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Requirement: ${editingReq.requirementId}`}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Title *</label>
              <input
                type="text"
                required
                value={editingReq.title}
                onChange={(e) => setEditingReq({ ...editingReq, title: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Statement (The system shall...) *</label>
              <textarea
                rows={3}
                required
                value={editingReq.normalizedDescription || editingReq.description || ''}
                onChange={(e) => setEditingReq({ ...editingReq, description: e.target.value, normalizedDescription: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Type</label>
                <select
                  value={editingReq.type}
                  onChange={(e) => setEditingReq({ ...editingReq, type: e.target.value })}
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
                  value={editingReq.category}
                  onChange={(e) => setEditingReq({ ...editingReq, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Priority</label>
                <select
                  value={editingReq.priority}
                  onChange={(e) => setEditingReq({ ...editingReq, priority: e.target.value })}
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
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-brand-400"
              >
                Update Requirement
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Batch Extract Input Modal */}
      <Modal isOpen={isExtractOpen} onClose={() => setIsExtractOpen(false)} title="AI Atomic Requirement Extraction">
        <form onSubmit={handleExtractReqs} className="space-y-4">
          <p className="text-xs text-slate-400">
            Paste meeting notes, customer transcripts, or unstructured specification paragraphs. The engine will decompose and present a preview for verification before adding to catalog.
          </p>
          <textarea
            rows={6}
            required
            placeholder="e.g., Doctors should view patient queue and update appointment status. System response time must be under 2 seconds..."
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              {extractLoading ? 'Extracting & Analyzing...' : 'Preview Extracted Requirements'}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Batch Extract Preview Modal (Priority 6) */}
      {isPreviewOpen && (
        <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Extraction Preview & Selection">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-300">
                Extracted <strong>{previewCandidates.length}</strong> atomic specifications. Review, edit, and select requirements to save.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAllCandidates(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-brand-300 text-[11px] font-semibold rounded border border-slate-700"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => selectAllCandidates(false)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold rounded border border-slate-700"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {previewCandidates.map((cand) => (
                <div
                  key={cand.tempId}
                  className={`p-4 rounded-xl border transition-all ${
                    cand.selected ? 'bg-slate-900 border-brand-500/40' : 'bg-slate-950 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleCandidateSelection(cand.tempId)}
                        className="text-brand-400 hover:text-brand-300 focus:outline-none"
                      >
                        {cand.selected ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </button>
                      <input
                        type="text"
                        value={cand.title}
                        onChange={(e) => updateCandidateField(cand.tempId, 'title', e.target.value)}
                        className="bg-transparent font-bold text-xs text-white border-b border-transparent hover:border-slate-700 focus:border-brand-500 focus:outline-none px-1 py-0.5 flex-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {cand.type}
                      </span>
                      {cand.contextRelevance?.status === 'CONTEXT_MISMATCH' ? (
                        <span className="text-[10px] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> Mismatch
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                          Relevant
                        </span>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={cand.description}
                    onChange={(e) => updateCandidateField(cand.tempId, 'description', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-brand-500 focus:outline-none leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedCount} of {previewCandidates.length} requirements selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium hover:bg-slate-700"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={savingBatch || selectedCount === 0}
                  onClick={handleSaveSelectedCandidates}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold rounded-lg shadow-lg shadow-brand-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {savingBatch ? 'Saving Selected...' : `Add Selected Requirements (${selectedCount})`}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
