'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Layers,
  ChevronDown,
  Clock,
  Zap,
  Info
} from 'lucide-react';
import { systemAPI } from '../lib/api';

export default function AIStatusIndicator() {
  const [data, setData] = useState({
    ollama: {
      status: 'OFFLINE',
      connected: false,
      configuredModel: '',
      modelRunning: false,
      modelInstalled: false,
      installedModels: [],
      runningModels: [],
      latencyMs: 0,
      lastError: null,
      baseUrl: ''
    },
    embedding: {
      modelName: '',
      status: 'FALLBACK',
      dimensions: 384,
      engine: '',
      realModel: false,
      isRealModel: false,
      lastError: null
    },
    timestamp: null
  });

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const dropdownRef = useRef(null);

  const fetchHealth = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await systemAPI.getAIHealth();
      if (res.data?.success && res.data.data) {
        const payload = res.data.data;
        setData({
          ollama: payload.ollama || payload.ai || {},
          embedding: payload.embedding || {},
          timestamp: res.data.timestamp || new Date().toISOString()
        });
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.warn('[AIStatusIndicator] Health fetch error:', err.message);
      setData((prev) => ({
        ...prev,
        ollama: { ...prev.ollama, status: 'OFFLINE', connected: false, lastError: err.message }
      }));
      setLastRefreshedAt(new Date());
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth(false);
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth(false);
    }, 10000); // 10 seconds auto-refresh
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const ollamaOnline = data.ollama.status === 'ONLINE' || data.ollama.connected;
  const ollamaRunning = data.ollama.modelRunning;
  const configuredModelName = data.ollama.configuredModel || data.ollama.model || 'Unknown';
  
  // Ollama status color: Green (Online + Running), Yellow (Online + Standby), Red (Offline)
  const getOllamaBadge = () => {
    if (!ollamaOnline) {
      return {
        color: 'red',
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        dot: 'bg-rose-500',
        text: 'Ollama: Offline',
        runningText: 'Server Offline',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />
      };
    }
    if (ollamaRunning) {
      return {
        color: 'green',
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        dot: 'bg-emerald-500 animate-pulse',
        text: `Ollama: ${configuredModelName}`,
        runningText: 'Running in Memory',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      };
    }
    return {
      color: 'yellow',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      text: `Ollama: ${configuredModelName}`,
      runningText: data.ollama.modelInstalled ? 'Installed (Standby)' : 'Not Installed',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
    };
  };

  // Embedding status color: Green (Real model loaded), Yellow (Deterministic fallback), Red (Error)
  const isRealEmbedding = Boolean(data.embedding.realModel || data.embedding.isRealModel || data.embedding.status === 'LOADED');
  const embeddingModelName = data.embedding.modelName || 'multilingual-e5-small';
  const embeddingDims = data.embedding.dimensions || 384;

  const getEmbeddingBadge = () => {
    if (isRealEmbedding) {
      return {
        color: 'green',
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        dot: 'bg-emerald-500',
        text: embeddingModelName.split('/').pop(),
        statusText: 'Neural Model Active',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      };
    }
    return {
      color: 'yellow',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      text: 'deterministic',
      statusText: 'Deterministic Fallback Active',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
    };
  };

  const ollamaBadge = getOllamaBadge();
  const embeddingBadge = getEmbeddingBadge();

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Clickable Header Pills */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 border border-slate-200 transition-all text-left group cursor-pointer"
        title="Click to view full real-time AI & Embedding status"
      >
        {/* Ollama Pill */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${ollamaBadge.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${ollamaBadge.dot}`} />
          <span className="font-semibold truncate max-w-[130px]">{ollamaBadge.text}</span>
          {ollamaRunning ? (
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-mono font-medium">running</span>
          ) : ollamaOnline ? (
            <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-mono font-medium">standby</span>
          ) : null}
        </div>

        {/* Embedding Pill */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${embeddingBadge.bg}`}>
          <Cpu className="w-3 h-3 text-purple-600" />
          <span className="font-mono truncate max-w-[120px]">{embeddingBadge.text}</span>
          <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded font-mono">{embeddingDims}d</span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Real-time Diagnostics Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[420px] rounded-xl bg-white border border-slate-200 shadow-dropdown z-50 p-4 animate-in fade-in duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Real-Time AI Diagnostics</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchHealth(true)}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded border border-slate-200 transition cursor-pointer font-medium"
                title="Refresh live status now"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-sky-600' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 mt-3">
            {/* 1. Ollama Status Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-semibold text-slate-900">Ollama LLM Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ollamaBadge.icon}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ollamaOnline
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {ollamaOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Explicit Separated States */}
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Configured Model</span>
                  <span className="font-mono font-bold text-slate-900 truncate block mt-0.5" title={configuredModelName}>
                    {configuredModelName}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Installed</span>
                  <span
                    className={`font-bold block mt-0.5 ${
                      data.ollama.modelInstalled
                        ? 'text-emerald-700'
                        : ollamaOnline
                        ? 'text-rose-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {data.ollama.modelInstalled ? 'Yes' : ollamaOnline ? 'No' : 'Unknown'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium truncate" title="Currently Running in Ollama memory (/api/ps)">
                    Running in Memory
                  </span>
                  <span
                    className={`font-bold block mt-0.5 flex items-center gap-1.5 ${
                      ollamaRunning ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {ollamaRunning ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Yes</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>No</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {data.ollama.baseUrl && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span className="font-mono truncate">{data.ollama.baseUrl}</span>
                  {data.ollama.latencyMs > 0 && (
                    <span className="text-slate-500 font-mono">{data.ollama.latencyMs}ms latency</span>
                  )}
                </div>
              )}

              {data.ollama.runningModels?.length > 0 && (
                <div className="pt-1.5 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 block mb-1">Active Memory Models (/api/ps):</span>
                  <div className="flex flex-wrap gap-1">
                    {data.ollama.runningModels.map((m, i) => (
                      <span key={i} className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!ollamaOnline && data.ollama.lastError && (
                <div className="text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                  {data.ollama.lastError}
                </div>
              )}
            </div>

            {/* 2. Embedding Model Card */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-slate-900">Neural Embedding Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {embeddingBadge.icon}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isRealEmbedding
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isRealEmbedding ? 'LOADED' : 'FALLBACK'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Active Model</span>
                  <span className="font-mono font-medium text-purple-900 truncate block" title={embeddingModelName}>
                    {embeddingModelName}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Vector Dimensions</span>
                  <span className="font-mono font-medium text-slate-900 block">
                    {embeddingDims} Dimensions
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                <span className="truncate">{data.embedding.engine || (isRealEmbedding ? 'Transformers.js / ONNX Runtime (int8)' : 'Deterministic')}</span>
                <span className="text-emerald-700 font-medium">EN, HI, MR, HNG</span>
              </div>
            </div>
          </div>

          {/* Footer Controls & Timestamp */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-0 w-3 h-3"
              />
              <span>Auto-refresh (10s)</span>
            </label>

            {lastRefreshedAt && (
              <div className="flex items-center gap-1 text-slate-500 font-mono">
                <Clock className="w-2.5 h-2.5" />
                <span>{lastRefreshedAt.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
