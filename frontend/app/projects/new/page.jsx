'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import { useAuth } from '../../../context/AuthContext';
import { Sparkles, ArrowRight, FolderPlus, HelpCircle } from 'lucide-react';
import { projectAPI } from '../../../lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    scope: '',
    domain: 'Enterprise Web Application',
    targetUsers: '',
    stakeholders: '',
    objectives: '',
    constraints: '',
    assumptions: '',
    dependencies: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectName.trim()) return;

    try {
      setLoading(true);
      const res = await projectAPI.create({
        ...formData,
        targetUsers: formData.targetUsers.split(',').map(s => s.trim()).filter(Boolean),
        stakeholders: formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean),
        objectives: formData.objectives.split(',').map(s => s.trim()).filter(Boolean),
        constraints: formData.constraints.split(',').map(s => s.trim()).filter(Boolean),
        assumptions: formData.assumptions.split(',').map(s => s.trim()).filter(Boolean),
        dependencies: formData.dependencies.split(',').map(s => s.trim()).filter(Boolean),
      });

      if (res.data?.data?._id) {
        router.push(`/projects/${res.data.data._id}/interview`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
        Verifying authorization...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Create New Project"
          subtitle="Define initial project scope and stakeholder boundaries for AI requirements engineering"
        />

        <main className="flex-1 p-8 max-w-4xl mx-auto w-full overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                Project Specification Foundation
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide foundational context to seed the AI interview and RAG vector knowledge base.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Campus Navigation Platform"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Description</label>
                <textarea
                  rows={3}
                  placeholder="Briefly explain the high-level business goal and user value proposition..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Scope</label>
                <textarea
                  rows={2}
                  placeholder="Specify system boundaries (what is IN scope vs OUT of scope)..."
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Domain / Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Healthcare, Education, FinTech"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Users (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Students, Faculty, Administrators"
                  value={formData.targetUsers}
                  onChange={(e) => setFormData({ ...formData, targetUsers: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stakeholders (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Dean of Students, Campus Security, IT Dept"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Objectives (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Reduce wait times, Automate scheduling"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Design & Tech Constraints</label>
                <input
                  type="text"
                  placeholder="e.g. Must run in modern browsers, GDPR compliant"
                  value={formData.constraints}
                  onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assumptions & Dependencies</label>
                <input
                  type="text"
                  placeholder="e.g. University LDAP active, 99.9% network availability"
                  value={formData.assumptions}
                  onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white font-bold">{loading ? 'Creating Project...' : 'Create & Launch AI Interview'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
