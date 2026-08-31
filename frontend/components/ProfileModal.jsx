'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  User,
  Building,
  Mail,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Upload
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setOrganization(user.organization || '');
      setAvatar(user.avatar || '');
      setAvatarPreview(user.avatar || '');
      setError('');
      setSuccess(false);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      await updateProfile({
        name: name.trim(),
        organization: organization.trim(),
        avatar
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Account Profile</h2>
              <p className="text-[11px] text-slate-400">Manage your workspace identity & profile picture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar Section */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="relative group shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user?.name || 'User DP'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xl">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400"
                title="Change Photo"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">Profile Photo</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3 h-3" />
                  Upload Photo
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setAvatar(''); setAvatarPreview(''); }}
                    className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 text-xs font-medium transition"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-[10px] text-slate-500 block">PNG, JPG, WebP up to 2MB</span>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shubham Dalvi"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Organization Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Organization / College</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. watumull / Engineering Dept"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email & Auth Provider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                {user?.authProvider === 'google' ? 'Google Account' : user?.authProvider === 'github' ? 'GitHub Account' : 'Direct Email'}
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center gap-1.5 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
