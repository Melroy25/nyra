import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { Calendar, Heart, Pencil, X, Check, Loader2, Camera, User, Sparkles, MessageCircle, Settings, Shield } from 'lucide-react';
import { apiUpdateProfile } from '../lib/api';

const availableGoals = [
  'Track cycle',
  'Improve nutrition',
  'Understand symptoms',
  'Improve wellness & Sleep',
  'Fertility tracking',
];

// Helper function to compress high-res camera photos before sending to API
const compressImage = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject('Failed to load image');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};

export default function ProfilePage() {
  const router = useRouter();
  const { onboardingData, user, setUser, updateOnboardingData } = useStore();

  const isPartner = user?.role === 'partner';
  const name = user?.name || onboardingData.name || (isPartner ? 'Partner' : 'User');
  const email = user?.email || '';
  const dob = user?.dateOfBirth || (user as any)?.date_of_birth || user?.dob || onboardingData.dob || '';
  const calculatedAge = (() => {
    if (user?.age && user.age > 0) return user.age;
    if (onboardingData?.age && onboardingData.age > 0) return onboardingData.age;
    if (dob) {
      const birth = new Date(dob);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calc = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calc--;
        if (calc > 0) return calc;
      }
    }
    return 0;
  })();
  const age = calculatedAge;
  const avatarUrl = user?.avatarUrl || undefined;
  const cycleLength = user?.cycleLength || (user as any)?.cycle_length || onboardingData.averageCycleLength || 28;
  const periodDuration = user?.periodDuration || (user as any)?.period_duration || onboardingData.periodDuration || 5;
  const goals = user?.goals && user.goals.length > 0 ? user.goals : onboardingData.goals || ['Track cycle'];
  const connectedPartnerName = user?.connectedPartner?.name || 'Partner';

  // Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editAge, setEditAge] = useState<number | ''>(age || '');
  const [editDob, setEditDob] = useState(dob);
  const [editAvatar, setEditAvatar] = useState<string | undefined>(avatarUrl);
  const [editGoals, setEditGoals] = useState<string[]>(goals);
  const [editCycleLength, setEditCycleLength] = useState<number>(cycleLength);
  const [editPeriodDuration, setEditPeriodDuration] = useState<number>(periodDuration);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (name) setEditName(name);
    if (age) setEditAge(age);
    if (dob) setEditDob(dob);
    if (avatarUrl) setEditAvatar(avatarUrl);
    if (cycleLength) setEditCycleLength(cycleLength);
    if (periodDuration) setEditPeriodDuration(periodDuration);
  }, [name, age, dob, avatarUrl, cycleLength, periodDuration]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setEditAvatar(compressed);
    } catch {
      alert('Failed to process image file.');
    }
  };

  const headingCls = 'text-[#18003d] dark:text-[#eee6ff]';
  const labelCls   = 'text-[#3d3050] dark:text-[#c8bedd]';

  const handleGoalToggle = (g: string) => {
    if (editGoals.includes(g)) {
      setEditGoals(editGoals.filter((item) => item !== g));
    } else {
      setEditGoals([...editGoals, g]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);

    try {
      const numAge = typeof editAge === 'number' ? editAge : (age || 0);
      const numCycleLen = Math.max(20, Math.min(45, Number(editCycleLength) || 28));
      const numPeriodDur = Math.max(2, Math.min(10, Number(editPeriodDuration) || 5));

      // Call Supabase API
      const res = await apiUpdateProfile({
        name: editName,
        age: numAge,
        dateOfBirth: editDob,
        goals: editGoals,
        avatarUrl: editAvatar,
        cycleLength: numCycleLen,
        periodDuration: numPeriodDur,
      });

      const updatedUser = {
        ...(user || {}),
        ...(res?.user || {}),
        name: res?.user?.name || editName,
        age: res?.user?.age || numAge,
        dateOfBirth: res?.user?.dateOfBirth || editDob,
        avatarUrl: res?.user?.avatarUrl || editAvatar || undefined,
        goals: res?.user?.goals || editGoals,
        cycleLength: numCycleLen,
        periodDuration: numPeriodDur,
      };
      setUser(updatedUser as any);

      // Sync local Zustand state
      updateOnboardingData({
        name: editName,
        age: numAge,
        dob: editDob,
        goals: editGoals,
        averageCycleLength: numCycleLen,
        periodDuration: numPeriodDur,
      });

      const lastP = user?.lastPeriodDate || (user as any)?.last_period_date || onboardingData.lastPeriodDate;
      if (lastP) {
        useStore.getState().seedCycleLogs(lastP, numPeriodDur, numCycleLen, true);
        useStore.getState().recalculateCycleMetrics();
      }

      setIsEditOpen(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile. Please check your network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">

      {/* ── Profile Header Card ── */}
      <section className="glass-card rounded-2xl p-6 border border-white/50 dark:border-[#3a2d58]/40 shadow-sm flex flex-col sm:flex-row items-center gap-6 animate-entrance">
        <div className="w-20 h-20 rounded-full bg-surface-container-high overflow-hidden border-2 border-primary/20 shadow-md shrink-0 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${name} Avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary/60" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className={`font-serif font-bold text-2xl md:text-3xl ${headingCls}`}>{name}</h1>
            {isPartner && (
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-bold text-[10px] uppercase tracking-wider border border-tertiary/20">
                Partner Account 💜
              </span>
            )}
          </div>
          <p className={`text-xs font-semibold ${labelCls}`}>
            {email ? email : ''} {age ? `• Age ${age}` : ''} {dob ? `• Born ${dob}` : ''}
          </p>
        </div>

        {/* Edit Profile Button */}
        <button
          onClick={() => {
            setEditName(name);
            setEditAge(age);
            setEditDob(dob);
            setEditAvatar(avatarUrl);
            setEditGoals(goals);
            setSaveError('');
            setIsEditOpen(true);
          }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-md hover:bg-primary/90 flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Profile
        </button>
      </section>

      {/* ── Partner Profile View ── */}
      {isPartner ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Partner Connection Status Card */}
          <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className={`font-serif font-bold text-lg ${headingCls} mb-4 flex items-center gap-2`}>
                <Heart className="w-4 h-4 text-tertiary" />
                <span>Partner Connection</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold border-b border-black/8 dark:border-[#3a2d58]/60 pb-2">
                  <span className={labelCls}>Status</span>
                  <span className={`font-bold ${user?.connectedPartnerId || user?.connectedPartner ? 'text-tertiary' : 'text-slate-400'}`}>
                    {user?.connectedPartnerId || user?.connectedPartner ? 'Linked ❤️' : 'Not Linked'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className={labelCls}>Connected Partner</span>
                  <span className={`font-bold ${headingCls}`}>{connectedPartnerName}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/partner')}
              className="w-full mt-6 py-2.5 rounded-2xl border border-tertiary/30 dark:border-tertiary/40 hover:border-tertiary bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/15 text-xs font-bold text-tertiary transition-all"
            >
              Go to Partner Mode Dashboard
            </button>
          </div>

          {/* Quick Shortcuts Card */}
          <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className={`font-serif font-bold text-lg ${headingCls} mb-4 flex items-center gap-2`}>
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Quick Shortcuts</span>
              </h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => router.push('/partner?tab=chat')}
                  className="w-full p-3 rounded-xl bg-white/40 dark:bg-[#1c1230]/60 border border-outline-variant/30 hover:border-primary/40 flex items-center gap-3 transition-all text-xs font-bold text-[#18003d] dark:text-[#eee6ff]"
                >
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span>Open Private Partner Chat</span>
                </button>
                <button
                  onClick={() => router.push('/partner?tab=ai')}
                  className="w-full p-3 rounded-xl bg-white/40 dark:bg-[#1c1230]/60 border border-outline-variant/30 hover:border-tertiary/40 flex items-center gap-3 transition-all text-xs font-bold text-[#18003d] dark:text-[#eee6ff]"
                >
                  <Sparkles className="w-4 h-4 text-tertiary" />
                  <span>Ask Partner AI Support</span>
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full p-3 rounded-xl bg-white/40 dark:bg-[#1c1230]/60 border border-outline-variant/30 hover:border-slate-400 flex items-center gap-3 transition-all text-xs font-bold text-[#18003d] dark:text-[#eee6ff]"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Account &amp; Privacy Settings</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ── Female User Profile View ── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Cycle Configuration Card */}
            <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className={`font-serif font-bold text-lg ${headingCls} mb-2 flex items-center gap-2`}>
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Cycle Configuration</span>
                </h3>
                <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] leading-relaxed">
                  Manage your period duration and cycle length parameters to maintain accurate phase mapping and predictions.
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(true)}
                className="w-full mt-6 py-3 rounded-2xl border border-primary/30 dark:border-primary/40 hover:border-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/15 text-xs font-bold text-primary dark:text-[#d4b8ff] transition-all"
              >
                Update Cycle Parameters
              </button>
            </div>

            {/* Partner Connection Card */}
            <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className={`font-serif font-bold text-lg ${headingCls} mb-4 flex items-center gap-2`}>
                  <Heart className="w-4 h-4 text-tertiary" />
                  <span>Connected Partner</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className={labelCls}>Link Status</span>
                    <span className={`font-bold ${user?.connectedPartnerId || user?.connectedPartner ? 'text-tertiary' : 'text-slate-400'}`}>
                      {user?.connectedPartnerId || user?.connectedPartner ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className={labelCls}>Partner View Permissions</span>
                    <span
                      className="font-bold text-primary dark:text-[#d4b8ff] hover:underline cursor-pointer"
                      onClick={() => router.push('/settings')}
                    >Custom</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/partner')}
                className="w-full mt-6 py-2.5 rounded-2xl border border-tertiary/30 dark:border-tertiary/40 hover:border-tertiary bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/15 text-xs font-bold text-tertiary transition-all"
              >
                View Partner Updates
              </button>
            </div>

          </div>

        </>
      )}

      {/* ── Edit Profile Modal ── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16102a] border border-white/40 dark:border-[#3a2d58] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant/20 dark:border-[#3a2d58] pb-3">
              <h3 className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff]">{isPartner ? 'Edit Profile' : 'Edit Profile & Cycle'}</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  {/* Current avatar preview */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                    {editAvatar ? (
                      <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary/60" />
                    )}
                  </div>
                  {/* Upload button using native label for instant gallery trigger on mobile */}
                  <label className="px-4 py-2.5 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary text-xs font-bold text-primary dark:text-[#d4b8ff] cursor-pointer hover:bg-primary/5 transition-all flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span>Upload from Camera / Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Age & DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-1">Age</label>
                  <input
                    type="number"
                    value={editAge || age || ''}
                    onChange={(e) => setEditAge(parseInt(e.target.value) || '')}
                    placeholder="Enter age"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob || dob || ''}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Cycle Parameters (Cycle Length & Period Duration) - ONLY for female users */}
              {!isPartner && (
                <div className="bg-primary/5 dark:bg-primary/10 p-3.5 rounded-2xl border border-primary/20 space-y-3">
                  <p className="text-xs font-bold text-primary dark:text-[#d4b8ff] uppercase tracking-wider">Cycle Configuration</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#3d3050] dark:text-[#c8bedd] mb-1">Cycle Length (Days)</label>
                      <input
                        type="number"
                        min="20"
                        max="45"
                        value={editCycleLength}
                        onChange={(e) => setEditCycleLength(parseInt(e.target.value) || 28)}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white dark:bg-[#1c1230] text-sm font-bold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#3d3050] dark:text-[#c8bedd] mb-1">Period Duration (Days)</label>
                      <input
                        type="number"
                        min="2"
                        max="10"
                        value={editPeriodDuration}
                        onChange={(e) => setEditPeriodDuration(parseInt(e.target.value) || 5)}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white dark:bg-[#1c1230] text-sm font-bold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {saveError && (
                <p className="text-xs font-bold text-red-500 text-center bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                  {saveError}
                </p>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] text-xs font-bold text-on-surface dark:text-[#c8bedd]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
